import {useCallback, useEffect, useMemo, useState} from 'react';
import useThemeColors from '../../hooks/useThemeColors';
import {useDispatch, useSelector} from 'react-redux';
import {
  fetchExpensesByMonth,
  invalidateExpenseCache,
  selectExpenseData,
} from '../../redux/slice/expenseDataSlice';
import {
  fetchIncomesByMonth,
  invalidateIncomeCache,
  selectIncomeData,
} from '../../redux/slice/incomeDataSlice';
import {selectMonthIndex, selectYear, setMonthSelection} from '../../redux/slice/monthSelectionSlice';
import {selectUserName} from '../../redux/slice/userNameSlice';
import {fetchUserData, selectUserId} from '../../redux/slice/userIdSlice';
import {fetchCurrency, selectCurrencySymbol} from '../../redux/slice/currencyDataSlice';
import {fetchCategories} from '../../redux/slice/categoryDataSlice';
import {getCurrentYear, getMonthNumber, getMonthNames, sortByDateDesc} from '../../utils/dateUtils';
import {ExpenseWithCategory as Expense, IncomeWithCategory} from '../../watermelondb/services';
import {AppDispatch} from '../../redux/store';
import {getCachedYears, loadAvailableYears} from '../../utils/availableYearsCache';
import {useFocusEffect} from '@react-navigation/native';

const CURRENT_YEAR = getCurrentYear();
const CURRENT_MONTH_INDEX = new Date().getMonth();

const useHome = () => {
  const colors = useThemeColors();
  const [refreshing, setRefreshing] = useState(false);
  const [availableYears, setAvailableYears] = useState<number[]>([CURRENT_YEAR]);

  const dispatch = useDispatch<AppDispatch>();

  const selectedMonthIndex = useSelector(selectMonthIndex);
  const selectedYear = useSelector(selectYear);
  const months = getMonthNames();

  const allTransactions = useSelector(selectExpenseData) ?? [];
  const allIncomes = useSelector(selectIncomeData) ?? [];
  const sortedTransactions = useMemo(
    () => sortByDateDesc([...(allTransactions as Expense[]), ...(allIncomes as IncomeWithCategory[])]),
    [allTransactions, allIncomes],
  );

  const userName = useSelector(selectUserName);
  const userId = useSelector(selectUserId);
  const currencySymbol = useSelector(selectCurrencySymbol);

  const selectedMonthName = months[selectedMonthIndex];
  const yearMonth = `${selectedYear}-${getMonthNumber(selectedMonthName)}`;

  useEffect(() => {
    dispatch(fetchUserData());
  }, [dispatch]);

  useEffect(() => {
    if (userId) {
      dispatch(fetchCurrency());
      dispatch(fetchCategories());
      const cachedYears = getCachedYears(userId);
      if (cachedYears.length > 0) {
        setAvailableYears(cachedYears);
      }
      loadAvailableYears(userId).then(years => {
        if (years.length > 0) {
          setAvailableYears(years);
        }
      });
    }
  }, [dispatch, userId]);

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        dispatch(fetchExpensesByMonth(yearMonth));
        dispatch(fetchIncomesByMonth(yearMonth));
      }
    }, [dispatch, userId, yearMonth]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
  }, []);

  useEffect(() => {
    if (!refreshing) return;

    dispatch(invalidateExpenseCache());
    dispatch(invalidateIncomeCache());
    Promise.all([
      dispatch(fetchExpensesByMonth(yearMonth)),
      dispatch(fetchIncomesByMonth(yearMonth)),
    ]).finally(() => {
      setRefreshing(false);
    });
  }, [dispatch, refreshing, yearMonth]);

  const {totalSpent, transactionCount, avgPerDay} = useMemo(() => {
    const total = (allTransactions ?? []).reduce((sum: number, t: Expense) => sum + t.amount, 0);
    const count = (allTransactions ?? []).length;
    const daysInMonth = new Date(selectedYear, selectedMonthIndex + 1, 0).getDate();
    const isCurrentMonth = selectedYear === CURRENT_YEAR && selectedMonthIndex === CURRENT_MONTH_INDEX;
    const daysElapsed = isCurrentMonth ? new Date().getDate() : daysInMonth;
    const avg = daysElapsed > 0 ? total / daysElapsed : 0;

    return {totalSpent: total, transactionCount: count, avgPerDay: avg};
  }, [allTransactions, selectedYear, selectedMonthIndex]);

  const handleMonthYearSelect = useCallback(
    (monthIndex: number, year: number) => {
      dispatch(setMonthSelection({monthIndex, year}));
    },
    [dispatch],
  );

  return {
    colors,
    refreshing,
    allTransactions,
    userName,
    userId,
    currencySymbol,
    onRefresh,
    sortedTransactions,
    selectedYear,
    selectedMonthIndex,
    selectedMonthName,
    yearMonth,
    availableYears,
    totalSpent,
    transactionCount,
    avgPerDay,
    handleMonthYearSelect,
  };
};

export default useHome;
