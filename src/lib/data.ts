import data from './trends-data.json';

export interface DataPoint {
  date: string;
  jobSearch: number;
  unemployment: number;
  recruitment: number;
  exams: number;
  compositeIndex: number;
}

export const KEYWORDS = {
  jobSearch: ['找工作', '求职', '简历模板', '面试技巧'],
  recruitment: ['招聘', '社招', '职位', '招聘信息'],
  exams: ['考研', '国考', '事业编', '教师资格证'],
  unemployment: ['失业', '裸辞', '裁员', '失业金'],
};

// Main function to get all trends data
export const getTrendsData = (): DataPoint[] => {
  return data;
};
