import {createAsyncThunk, createEntityAdapter, createSlice} from '@reduxjs/toolkit';
import {RootState} from '../rootReducer';
import {IncomeWithCategory, getAllIncomesByMonth} from '../../watermelondb/services';
import {selectUserId} from './userIdSlice';

const incomesAdapter = createEntityAdapter<IncomeWithCategory>();

const initialState = incomesAdapter.getInitialState({
  isLoading: false,
  error: null as string | null,
  cachedYearMonth: null as string | null,
});

export const fetchIncomesByMonth = createAsyncThunk(
  'income/fetchByMonth',
  async (yearMonth: string, {getState, rejectWithValue}) => {
    const state = getState() as RootState;
    if (state.income.cachedYearMonth === yearMonth) {
      return null;
    }
    try {
      const userId = selectUserId(state);
      const incomes = await getAllIncomesByMonth(userId, yearMonth);
      return {incomes, yearMonth};
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch incomes');
    }
  },
);

const incomeDataSlice = createSlice({
  name: 'income',
  initialState,
  reducers: {
    incomeAdded: incomesAdapter.addOne,
    incomeUpdated: incomesAdapter.updateOne,
    incomeRemoved: incomesAdapter.removeOne,
    invalidateIncomeCache: state => {
      state.cachedYearMonth = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchIncomesByMonth.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchIncomesByMonth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null;
        if (action.payload !== null) {
          state.cachedYearMonth = action.payload.yearMonth;
          incomesAdapter.setAll(state, action.payload.incomes);
        }
      })
      .addCase(fetchIncomesByMonth.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

const incomeSelectors = incomesAdapter.getSelectors<RootState>(state => state.income);

export const selectIncomeData = incomeSelectors.selectAll;
export const selectIncomeDataById = incomeSelectors.selectById;
export const selectIncomeLoading = (state: RootState) => state.income.isLoading;
export const selectIncomeError = (state: RootState) => state.income.error;

export const {incomeAdded, incomeUpdated, incomeRemoved, invalidateIncomeCache} = incomeDataSlice.actions;

export default incomeDataSlice.reducer;
