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

  interface TimelineDataPoint {
    time: string;
    formattedTime: string;
    formattedAxisTime: string;
    value: number[];
    hasData: boolean;
    formattedValue: string[];
  }

  interface InterestOverTimeResponse {
    default: {
      timelineData: TimelineDataPoint[];
    };
  }

  function interestOverTime(options: InterestOverTimeOptions): Promise<string>;

  const googleTrends: {
    interestOverTime: typeof interestOverTime;
    [key: string]: any;
  };

  export default googleTrends;
}
