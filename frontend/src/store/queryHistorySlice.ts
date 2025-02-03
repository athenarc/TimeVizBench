import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {  QueryDto } from '../interfaces/query';


interface QueryHistoryState {
  queries: {
    query: QueryDto;
    timestamp: number;
    instanceId: string;
    results?: any;
    performance?: {
      total: number;
      rendering: number;
      query: number;
      networking: number;
      ioCount: number;
    };
  }[];
}

const initialState: QueryHistoryState = {
  queries: [],
};

export const queryHistorySlice = createSlice({
  name: 'queryHistory',
  initialState,
  reducers: {
    addQuery: (state, action: PayloadAction<{ query: QueryDto; instanceId: string; results?: any; performance: any }>) => {
      state.queries.push({
        ...action.payload,
        query: action.payload.query,
        timestamp: Date.now(),
      });
    },
    clearHistory: (state) => {
      state.queries = [];
    },
  },
});

export const { addQuery, clearHistory } = queryHistorySlice.actions;
export default queryHistorySlice.reducer;
