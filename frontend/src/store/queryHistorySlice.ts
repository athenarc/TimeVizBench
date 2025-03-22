import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface QueryPerformance {
  total: number;
  rendering: number;
  query: number;
  networking: number;
  ioCount: number;
}

interface QueryHistoryEntry {
  query: any;
  instanceId: string;
  results: any;
  performance: QueryPerformance;
  operationId?: string;
  timestamp: number;
}

interface QueryHistoryState {
  queries: QueryHistoryEntry[];
}

const initialState: QueryHistoryState = {
  queries: [],
};

export const queryHistorySlice = createSlice({
  name: 'queryHistory',
  initialState,
  reducers: {
    addQuery: (state, action: PayloadAction<Omit<QueryHistoryEntry, 'timestamp'>>) => {
      state.queries.push({
        ...action.payload,
        timestamp: Date.now(),
      });
    },
    // Add a new action to update rendering times
    updateRenderingTimes: (state, action: PayloadAction<{
      operationId: string,
      renderingTimes: Record<string, number>
    }>) => {
      const { operationId, renderingTimes } = action.payload;
      
      state.queries.forEach((query) => {
        if (query.operationId === operationId && renderingTimes[query.instanceId] !== undefined) {
          const renderTime = renderingTimes[query.instanceId];
          query.performance.rendering = renderTime;
          query.performance.total = query.performance.query + query.performance.networking + renderTime;
        }
      });
    },
    // Optional: add action to clear history if needed
    clearHistory: (state) => {
      state.queries = [];
    },
  },
});

export const { addQuery, updateRenderingTimes, clearHistory } = queryHistorySlice.actions;

export default queryHistorySlice.reducer;
