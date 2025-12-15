import googleTrends from 'google-trends-api';
import { format, startOfWeek, parseISO, getWeek, getYear } from 'date-fns';
import fs from 'fs/promises';
import path from 'path';
import { KEYWORDS, type DataPoint } from '../src/lib/data';

interface TrendData {
  time: string;
  value: number;
}

const trendOptions = {
  geo: 'CN',
  resolution: 'COUNTRY',
  category: 0,
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchYearlyData(keywords: string[], year: number): Promise<TrendData[]> {
  try {
    const result = await googleTrends.interestOverTime({
      ...trendOptions,
      keyword: keywords,
      startTime: new Date(`${year}-01-01`),
      endTime: new Date(`${year}-12-31`),
    });
    
    const data = JSON.parse(result);
    return data.default.timelineData.map((item: any) => ({
      time: format(new Date(item.time * 1000), 'yyyy-MM-dd'),
      value: item.value.reduce((a: number, b: number) => a + b, 0) / item.value.length,
    }));
  } catch (error) {
    if (error instanceof SyntaxError) {
      // Silently ignore parsing errors, as they are expected during rate limits.
      // A message is logged in the main function.
      return [];
    }
    console.error(`An unexpected error occurred while fetching data for ${year} and keywords [${keywords.join(', ')}]:`, error);
    return [];
  }
}

async function fetchAllData() {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 5;
  const years = Array.from({ length: currentYear - startYear + 1 }, (_, i) => startYear + i);

  const allData: { [category: string]: TrendData[] } = {
    jobSearch: [],
    unemployment: [],
    recruitment: [],
    exams: [],
  };

  for (const year of years) {
    for (const category in KEYWORDS) {
      const keywords = KEYWORDS[category as keyof typeof KEYWORDS];
      console.log(`Fetching ${category} data for ${year}...`);
      const yearlyData = await fetchYearlyData(keywords, year);
      
      if (yearlyData.length === 0) {
        console.warn(`  > Received no data for ${category} in ${year}. Likely a rate limit issue. Skipping.`);
      }

      allData[category].push(...yearlyData);
      await sleep(5000); // Wait 5 seconds to avoid rate limiting
    }
  }

  return allData;
}

function processData(allData: { [category: string]: TrendData[] }): DataPoint[] {
  console.log("Aggregating daily data into weekly data...");
  const weeklyData: { [week: string]: { [category: string]: number[] } } = {};

  for (const category in allData) {
    for (const day of allData[category]) {
      const date = parseISO(day.time);
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = { jobSearch: [], unemployment: [], recruitment: [], exams: [] };
      }
      weeklyData[weekKey][category].push(day.value);
    }
  }

  const sortedWeeks = Object.keys(weeklyData).sort();

  let finalData: DataPoint[] = sortedWeeks.map(weekKey => {
    const week = weeklyData[weekKey];
    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    const jobSearch = avg(week.jobSearch);
    const unemployment = avg(week.unemployment);
    const recruitment = avg(week.recruitment);
    const exams = avg(week.exams);

    // Composite Formula: 35% Job + 25% Unemp + 20% Recruit + 20% Exams
    const compositeIndex = (
      (jobSearch * 0.35) + 
      (unemployment * 0.25) + 
      (recruitment * 0.20) + 
      (exams * 0.20)
    );

    return {
      date: weekKey,
      jobSearch: parseFloat(jobSearch.toFixed(1)),
      unemployment: parseFloat(unemployment.toFixed(1)),
      recruitment: parseFloat(recruitment.toFixed(1)),
      exams: parseFloat(exams.toFixed(1)),
      compositeIndex: parseFloat(compositeIndex.toFixed(1))
    };
  });

  console.log("Filtering out incomplete last week...");
  if (finalData.length > 0) {
      const today = new Date();
      const lastDataDate = parseISO(finalData[finalData.length - 1].date);
      if (getWeek(today, { weekStartsOn: 1 }) === getWeek(lastDataDate, { weekStartsOn: 1 }) && getYear(today) === getYear(lastDataDate)) {
        if (today.getDay() !== 0) { // 0 is Sunday
          finalData.pop();
        }
      }
  }

  if (finalData.length === 0) {
    console.warn("No data points after processing. Returning empty array.");
    return [];
  }
  
  console.log("Normalizing composite index to 0-100 range...");
  const indices = finalData.map(d => d.compositeIndex);
  const minIndex = Math.min(...indices);
  const maxIndex = Math.max(...indices);

  if (maxIndex === minIndex) {
    return finalData.map(d => ({ ...d, compositeIndex: 50 }));
  }

  return finalData.map(d => ({
    ...d,
    compositeIndex: Math.round(((d.compositeIndex - minIndex) / (maxIndex - minIndex)) * 100)
  }));
}

async function main() {
  console.log("Starting Google Trends data fetching process...");
  const rawData = await fetchAllData();
  const processedData = processData(rawData);
  
  const outputPath = path.join(process.cwd(), 'src', 'lib', 'trends-data.json');
  console.log(`Writing ${processedData.length} data points to ${outputPath}...`);
  
  await fs.writeFile(outputPath, JSON.stringify(processedData, null, 2));
  
  console.log("✅ Data fetching complete!");
}

main().catch(err => {
  console.error("An error occurred during the data fetching process:", err);
  process.exit(1);
});
