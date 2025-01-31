export interface ResponseDto {
  message: string;
  queryResults: QueryResultsDto;
}

export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
}

export interface QueryResultsDto {
  data: Record<string, TimeSeriesPoint[]>;
  timeRange: {
    from: number;
    to: number;
    fromDate: string;
    toDate: string;
    intervalString: string;
  };
  ioCount: number;
  queryTime: number;
  metrics: Record<string, string>;
  litPixels: Record<string, string[][]>
};
