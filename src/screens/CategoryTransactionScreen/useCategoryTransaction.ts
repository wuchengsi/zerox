import useThemeColors from '../../hooks/useThemeColors';
import {useSelector} from 'react-redux';
import {selectCurrencySymbol} from '../../redux/slice/currencyDataSlice';
import {RouteProp, useFocusEffect} from '@react-navigation/native';
import {ExpenseWithCategory as Expense, getAllExpensesByCategoryAndMonth} from '../../watermelondb/services';
import {useCallback, useMemo, useRef, useState} from 'react';
import {selectUserId} from '../../redux/slice/userIdSlice';

export type CategoryTransactionRouteProp = RouteProp<
  {
    CategoryTransactionScreen: {
      categoryId: string;
      categoryName: string;
      categoryColor: string;
      categoryIcon?: string;
      categoryLevel?: 'parent' | 'child';
      yearMonth: string;
      monthLabel: string;
    };
  },
  'CategoryTransactionScreen'
>;

const useCategoryTransaction = (route: CategoryTransactionRouteProp) => {
  const colors = useThemeColors();
  const currencySymbol = useSelector(selectCurrencySymbol);
  const userId = useSelector(selectUserId);
  const requestIdRef = useRef(0);

  const {
    categoryId = '',
    categoryName = '',
    categoryColor = '#808080',
    categoryIcon,
    categoryLevel = 'parent',
    yearMonth = '',
    monthLabel = '',
  } = route.params ?? {};

  const queryKey = `${userId}:${categoryId}:${yearMonth}`;
  const [categoryState, setCategoryState] = useState<{key: string; transactions: Expense[]}>({
    key: queryKey,
    transactions: [],
  });
  const transactions = categoryState.key === queryKey ? categoryState.transactions : [];

  const loadCategoryTransactions = useCallback(async () => {
    if (!userId || !categoryId || !yearMonth) {
      setCategoryState({key: queryKey, transactions: []});
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setCategoryState(current => (current.key === queryKey ? current : {key: queryKey, transactions: []}));

    try {
      const nextTransactions = await getAllExpensesByCategoryAndMonth(userId, categoryId, yearMonth);
      if (requestIdRef.current === requestId) {
        setCategoryState({key: queryKey, transactions: nextTransactions});
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Error loading category transactions:', error);
      }
      if (requestIdRef.current === requestId) {
        setCategoryState({key: queryKey, transactions: []});
      }
    }
  }, [categoryId, queryKey, userId, yearMonth]);

  useFocusEffect(
    useCallback(() => {
      void loadCategoryTransactions();
      return () => {
        requestIdRef.current += 1;
      };
    }, [loadCategoryTransactions]),
  );

  const refreshCategoryTransactions = useCallback(async () => {
    await loadCategoryTransactions();
  }, [loadCategoryTransactions]);

  const totalAmount = useMemo(
    () => transactions.reduce((sum: number, t: Expense) => sum + t.amount, 0),
    [transactions],
  );

  return {
    colors,
    currencySymbol,
    transactions,
    totalAmount,
    categoryName,
    categoryColor,
    categoryIcon,
    categoryLevel,
    monthLabel,
    categoryId,
    yearMonth,
    refreshCategoryTransactions,
  };
};

export default useCategoryTransaction;
