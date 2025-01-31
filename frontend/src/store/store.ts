import { configureStore } from '@reduxjs/toolkit';
import queryHistoryReducer from './queryHistorySlice';

export const store = configureStore({
  reducer: {
    queryHistory: queryHistoryReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
