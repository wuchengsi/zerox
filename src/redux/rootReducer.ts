import {combineReducers} from 'redux';
import {createAction} from '@reduxjs/toolkit';
import userOnboardingReducer from './slice/isOnboardedSlice';
import currencyDataReducer from './slice/currencyDataSlice';
import themePreferenceReducer from './slice/themePreferenceSlice';
import userNameReducer from './slice/userNameSlice';
import userEmailReducer from './slice/userEmailSlice';
import userIdReducer from './slice/userIdSlice';
import categoryReducer from './slice/categoryDataSlice';
import expenseReducer from './slice/expenseDataSlice';
import incomeReducer from './slice/incomeDataSlice';
import debtorReducer from './slice/debtorDataSlice';
import debtReducer from './slice/debtDataSlice';
import allDebtReducer from './slice/allDebtDataSlice';
import everydayExpenseReducer from './slice/everydayExpenseDataSlice';
import allDataReducer from './slice/allDataSlice';
import individualDebtorReducer from './slice/IndividualDebtorSlice';
import monthSelectionReducer from './slice/monthSelectionSlice';

export const resetAppState = createAction('app/reset');

const appReducer = combineReducers({
  userOnboarding: userOnboardingReducer,
  currencyData: currencyDataReducer,
  themePreference: themePreferenceReducer,
  userName: userNameReducer,
  userEmail: userEmailReducer,
  userId: userIdReducer,
  category: categoryReducer,
  expense: expenseReducer,
  income: incomeReducer,
  debtor: debtorReducer,
  debt: debtReducer,
  allDebt: allDebtReducer,
  everydayExpense: everydayExpenseReducer,
  allData: allDataReducer,
  individualDebtor: individualDebtorReducer,
  monthSelection: monthSelectionReducer,
});

const rootReducer: typeof appReducer = (state, action) => {
  if (resetAppState.match(action)) {
    return appReducer(
      {
        userOnboarding: {isOnboarded: false},
      } as Parameters<typeof appReducer>[0],
      action,
    );
  }

  return appReducer(state, action);
};

export type RootState = ReturnType<typeof rootReducer>;

export default rootReducer;
