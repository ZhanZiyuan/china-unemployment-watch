export interface DataPoint {
  date: string;
  jobSearch: number;
  unemployment: number;
  recruitment: number;
  exams: number;
  compositeIndex: number;
}

// Keywords for display, can be used by components
export const KEYWORDS = {
  jobSearch: ['找工作', '求职', '简历模板', '面试技巧'],
  recruitment: ['招聘', '社招', '职位', '招聘信息'],
  exams: ['考研', '国考', '事业编', '教师资格证'],
  unemployment: ['失业', '裸辞', '裁员', '失业金']
};

/**
 * --- MOCK DATA GENERATOR ---
 * Simulates Google Trends behavior with seasonality (Golden March, Exams) and macro trends.
 * NOTE: This is a placeholder for a real API call to Google Trends. The `google-trends-api` 
 * package would be required for live data, but cannot be added due to project constraints.
 */
export const getTrendsData = async (): Promise<DataPoint[]> => {
  const data: DataPoint[] = [];
  const startDate = new Date('2021-01-01');
  const today = new Date();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;

  let currentDate = startDate.getTime();

  while (currentDate <= today.getTime()) {
    const d = new Date(currentDate);
    const dateStr = d.toISOString().split('T')[0];
    const month = d.getMonth(); // 0-11
    
    // Base Baseline (Yearly increasing stress trend)
    const yearOffset = (d.getFullYear() - 2021) * 5; 

    // Seasonality: "Golden Three Silver Four" (March/April hiring peak)
    const springPeak = (month === 2 || month === 3) ? 15 : 0;
    
    // Seasonality: Graduation (June/July)
    const gradPeak = (month === 5 || month === 6) ? 20 : 0;

    // Seasonality: Exams (Nov for Guokao, Dec for Kaoyan)
    const examPeak = (month === 10 || month === 11) ? 35 : 0;

    // Event: 2022 Lockdowns (Rough simulation of high anxiety in mid-2022)
    const lockdownSpike = (d.getFullYear() === 2022 && month > 2 && month < 6) ? 15 : 0;

    // Random noise
    const noise = () => Math.floor(Math.random() * 5);

    // 1. Job Search Volume (Base + Spring + Graduation)
    const rawJobSearch = 35 + yearOffset + springPeak + gradPeak + lockdownSpike + noise();
    
    // 2. Unemployment Terms (Base + Lockdowns + steady climb)
    const rawUnemployment = 20 + (yearOffset * 1.5) + lockdownSpike + noise();

    // 3. Recruitment (Activity model)
    const rawRecruitment = 30 + yearOffset + springPeak + noise();

    // 4. Exams (Huge spikes in Q4)
    const rawExams = 15 + (yearOffset * 2) + examPeak + noise();

    // Normalization (Simplified 0-100 scale logic per week relative to max potential)
    const jobSearch = Math.min(100, Math.max(10, rawJobSearch));
    const unemployment = Math.min(100, Math.max(10, rawUnemployment));
    const recruitment = Math.min(100, Math.max(10, rawRecruitment));
    const exams = Math.min(100, Math.max(10, rawExams));

    // Composite Formula: 35% Job + 25% Unemp + 20% Recruit + 20% Exams
    const compositeIndex = (
      (jobSearch * 0.35) + 
      (unemployment * 0.25) + 
      (recruitment * 0.20) + 
      (exams * 0.20)
    );

    data.push({
      date: dateStr,
      jobSearch,
      unemployment,
      recruitment,
      exams,
      compositeIndex: parseFloat(compositeIndex.toFixed(1))
    });

    currentDate += oneWeek;
  }
  return data;
};
