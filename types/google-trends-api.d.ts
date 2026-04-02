declare module 'google-trends-api' {
  interface InterestOverTimeOptions {
    keyword: string;
    geo?: string;
    startTime?: Date;
    endTime?: Date;
    hl?: string;
    category?: string;
    timeframe?: string;
    property?: string;
  }

  const googleTrends: {
    interestOverTime(options: InterestOverTimeOptions): Promise<string>;
    [key: string]: unknown;
  };

  export default googleTrends;
}
