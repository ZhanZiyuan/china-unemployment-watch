import googleTrends from 'google-trends-api';
import {
  format,
  parseISO,
  startOfWeek,
  addMonths,
  differenceInMonths
} from 'date-fns';
import fs from 'fs/promises';
import path from 'path';
import { KEYWORDS, type DataPoint } from '../src/lib/data';

/* =========================
   Types
========================= */

interface DailyPoint {
  date: string;
  value: number;
}

/* =========================
   Utils
========================= */

const sleep = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

const jitterSleep = async (base = 4000) => {
  await sleep(base + Math.random() * 6000);
};

const median = (arr: number[]) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const zScore = (arr: number[]) => {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const std = Math.sqrt(
    arr.reduce((s, x) => s + (x - mean) ** 2, 0) / arr.length
  );
  return arr.map(v => (std === 0 ? 0 : (v - mean) / std));
};

const quantileNormalize = (arr: number[]) => {
  const sorted = [...arr].sort((a, b) => a - b);
  const q5 = sorted[Math.floor(sorted.length * 0.05)];
  const q95 = sorted[Math.floor(sorted.length * 0.95)];
  return arr.map(v =>
    Math.max(0, Math.min(100, ((v - q5) / (q95 - q5)) * 100))
  );
};

/* =========================
   Fetch Logic
========================= */

async function fetchKeywordWindow(
  keyword: string,
  start: Date,
  end: Date
): Promise<DailyPoint[]> {
  try {
    const res = await googleTrends.interestOverTime({
      keyword,
      geo: 'CN',
      startTime: start,
      endTime: end
    });

    const json = JSON.parse(res);
    return json.default.timelineData.map((d: any) => ({
      date: format(new Date(d.time * 1000), 'yyyy-MM-dd'),
      value: d.value[0]
    }));
  } catch {
    return [];
  }
}

async function fetchAllData() {
  const start = new Date('2021-01-01');
  const end = new Date();
  const windowMonths = 18;
  const stepMonths = 12;

  const all: Record<string, Record<string, number[]>> = {};

  for (const category in KEYWORDS) {
    all[category] = {};
    for (const keyword of KEYWORDS[category as keyof typeof KEYWORDS]) {
      let cursor = start;

      while (differenceInMonths(end, cursor) >= windowMonths) {
        const winEnd = addMonths(cursor, windowMonths);
        const data = await fetchKeywordWindow(keyword, cursor, winEnd);

        for (const d of data) {
          if (!all[category][d.date]) {
            all[category][d.date] = [];
          }
          all[category][d.date].push(d.value);
        }

        await jitterSleep();
        cursor = addMonths(cursor, stepMonths);
      }
    }
  }

  return all;
}

/* =========================
   Processing
========================= */

function processData(raw: Record<string, Record<string, number[]>>): DataPoint[] {
  const weekly: Record<string, Record<string, number[]>> = {};

  for (const category in raw) {
    for (const date in raw[category]) {
      const week = format(
        startOfWeek(parseISO(date), { weekStartsOn: 1 }),
        'yyyy-MM-dd'
      );

      weekly[week] ??= {
        jobSearch: [],
        unemployment: [],
        recruitment: [],
        exams: []
      };

      weekly[week][category].push(median(raw[category][date]));
    }
  }

  const weeks = Object.keys(weekly).sort();
  const rows = weeks.map(w => {
    const r = weekly[w];
    return {
      date: w,
      jobSearch: median(r.jobSearch),
      unemployment: median(r.unemployment),
      recruitment: median(r.recruitment),
      exams: median(r.exams)
    };
  });

  const zJob = zScore(rows.map(r => r.jobSearch));
  const zUn = zScore(rows.map(r => r.unemployment));
  const zRec = zScore(rows.map(r => r.recruitment));
  const zExam = zScore(rows.map(r => r.exams));

  const composite = rows.map((_, i) =>
    zJob[i] * 0.35 +
    zUn[i] * 0.25 +
    zRec[i] * 0.20 +
    zExam[i] * 0.20
  );

  const normalized = quantileNormalize(composite);

  return rows.map((r, i) => ({
    ...r,
    compositeIndex: Math.round(normalized[i])
  }));
}

/* =========================
   Main
========================= */

async function main() {
  console.log('🚀 Fetching Google Trends...');
  const raw = await fetchAllData();
  const processed = processData(raw);

  const out = path.join(process.cwd(), 'src/lib/trends-data.json');
  await fs.writeFile(out, JSON.stringify(processed, null, 2));
  console.log(`✅ Wrote ${processed.length} rows`);
}

main();
