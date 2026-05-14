import {RefreshControl, View} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';
import React, {useCallback, useEffect, useMemo, useRef, useState, memo} from 'react';
import Animated, {SharedValue, useAnimatedStyle, interpolate} from 'react-native-reanimated';
import useThemeColors, {Colors} from '../../hooks/useThemeColors';
import Icon from '../atoms/Icons';
import {formatDate, formatCalendar} from '../../utils/dateUtils';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import {navigate} from '../../utils/navigationUtils';
import {
  createExpense,
  createIncome,
  deleteExpenseById,
  deleteIncomeById,
  ExpenseData as ExpenseDocType,
  IncomeData as IncomeDocType,
} from '../../watermelondb/services';
import {useDispatch} from 'react-redux';
import {expenseRemoved, fetchExpenses, fetchExpensesByMonth, invalidateExpenseCache} from '../../redux/slice/expenseDataSlice';
import {fetchIncomesByMonth, incomeRemoved, invalidateIncomeCache} from '../../redux/slice/incomeDataSlice';
import PrimaryText from '../atoms/PrimaryText';
import {everydayExpenseRemoved, fetchEverydayExpenses} from '../../redux/slice/everydayExpenseDataSlice';
import {formatCurrency} from '../../utils/numberUtils';
import {FlashList} from '@shopify/flash-list';
import {AppDispatch} from '../../redux/store';
import {gs} from '../../styles/globalStyles';
import {useLanguage} from '../../context/LanguageContext';
import {getExpenseCategoryDisplayName} from '../../constants/defaultCategories';

interface CategoryInfo {
  id?: string;
  name?: string;
  icon?: string;
  color?: string;
  parentId?: string;
  parentName?: string;
  parentIcon?: string;
  parentColor?: string;
}

type TransactionType = 'expense' | 'income';

interface Expense extends ExpenseDocType {
  category?: CategoryInfo;
  transactionType?: TransactionType;
}

interface Income extends IncomeDocType {
  category?: CategoryInfo;
  transactionType?: TransactionType;
}

type Transaction = Expense | Income;

interface TransactionListProps {
  currencySymbol: string;
  allExpenses: Array<Transaction>;
  targetDate?: string;
  targetMonth?: string;
  edgeToEdge?: boolean;
  ListHeaderComponent?: React.ReactElement;
  ListEmptyComponent?: React.ReactElement;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentContainerStyle?: {paddingBottom?: number};
  onTransactionChanged?: () => void | Promise<void>;
}

interface ExpenseRowProps {
  expense: Transaction;
  colors: Colors;
  currencySymbol: string;
  onEdit: (expense: Transaction) => void;
  onDelete: (expense: Transaction) => void;
  openSwipeableRef: React.RefObject<{close: () => void} | null>;
  edgeToEdge: boolean;
}

type TransactionListItem =
  | {itemType: 'header'; id: string; label: string}
  | {itemType: 'transaction'; id: string; transaction: Transaction}
  | {itemType: 'pendingDelete'; id: string; transaction: Transaction};

const ACTION_WIDTH = 50;
const EDGE_INSET = 16;

const SwipeAction = ({
  progress,
  iconName,
  iconColor,
  backgroundColor,
  side,
  onPress,
  edgeToEdge = false,
}: {
  progress: SharedValue<number>;
  iconName: string;
  iconColor: string;
  backgroundColor: string;
  side: 'left' | 'right';
  onPress: () => void;
  edgeToEdge?: boolean;
}) => {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.6, 1], [0, 0.8, 1]),
    transform: [{scale: interpolate(progress.value, [0, 1], [0.6, 1])}],
  }));

  const extraPadding = edgeToEdge ? EDGE_INSET : 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        gs.center,
        {
          flex: 1,
          width: ACTION_WIDTH + extraPadding,
          paddingLeft: side === 'left' ? extraPadding : 0,
          paddingRight: side === 'right' ? extraPadding : 0,
        },
      ]}>
      <Animated.View style={[gs.size40, gs.roundedFull, gs.center, animatedStyle, {backgroundColor}]}>
        <Icon name={iconName} size={18} color={iconColor} />
      </Animated.View>
    </TouchableOpacity>
  );
};

const ExpenseRow: React.FC<ExpenseRowProps> = React.memo(
  ({expense, colors, currencySymbol, onEdit, onDelete, openSwipeableRef, edgeToEdge}) => {
    const swipeableRef = useRef<any>(null);
    const isIncome = expense.transactionType === 'income';

    const handleSwipeWillOpen = useCallback(() => {
      if (openSwipeableRef.current && openSwipeableRef.current !== swipeableRef.current) {
        openSwipeableRef.current.close();
      }
      openSwipeableRef.current = swipeableRef.current;
    }, [openSwipeableRef]);

    return (
      <View style={gs.mb5}>
        <ReanimatedSwipeable
          ref={swipeableRef}
          renderLeftActions={(progress, _translation, swipeableMethods) => (
            <SwipeAction
              progress={progress}
              iconName="pencil"
              iconColor={colors.accentGreen}
              backgroundColor={colors.lightAccent}
              side="left"
              edgeToEdge={edgeToEdge}
              onPress={() => {
                onEdit(expense);
                swipeableMethods.close();
              }}
            />
          )}
          renderRightActions={(progress, _translation, swipeableMethods) => (
            <SwipeAction
              progress={progress}
              iconName="trash-2"
              iconColor={colors.accentOrange}
              backgroundColor={colors.lightAccent}
              side="right"
              edgeToEdge={edgeToEdge}
              onPress={() => {
                onDelete(expense);
                swipeableMethods.close();
              }}
            />
          )}
          onSwipeableWillOpen={handleSwipeWillOpen}
          friction={2}
          overshootLeft={false}
          overshootRight={false}
          overshootFriction={8}>
          <View
            style={[
              gs.rounded12,
              gs.rowBetweenCenter,
              gs.px14,
              gs.py10,
              edgeToEdge && gs.mx16,
              {backgroundColor: colors.containerColor},
            ]}>
            <View style={[gs.rowCenter, gs.flex1]}>
              <View style={[gs.size36, gs.center, gs.rounded10, gs.mr10, {backgroundColor: colors.iconContainer}]}>
                <Icon
                  name={expense.category?.icon || 'circle-dot'}
                  size={18}
                  color={isIncome ? colors.accentGreen : expense.category?.color || colors.buttonText}
                />
              </View>
              <View style={[gs.flex1, gs.gap2]}>
                <PrimaryText weight="medium" numberOfLines={1}>{expense.title}</PrimaryText>
                <PrimaryText size={11} color={colors.secondaryText} numberOfLines={1}>
                  {expense.category?.parentName
                    ? getExpenseCategoryDisplayName(expense.category.parentName, expense.category.name)
                    : expense.category?.name}
                  {' · '}
                  {formatDate(expense.date, 'Do MMM')}
                </PrimaryText>
              </View>
            </View>
            <View style={gs.ml10}>
              <PrimaryText
                size={14}
                weight="semibold"
                variant="number"
                color={isIncome ? colors.accentGreen : colors.primaryText}>
                {isIncome ? '+' : ''}
                {currencySymbol}
                {Number.isInteger(expense.amount)
                  ? formatCurrency(expense.amount)
                  : formatCurrency(Number(expense.amount.toFixed(2)))}
              </PrimaryText>
            </View>
          </View>
        </ReanimatedSwipeable>
      </View>
    );
  },
);

const InlineUndo: React.FC<{
  colors: Colors;
  onUndo: () => void;
  edgeToEdge: boolean;
  deletedLabel: string;
  undoLabel: string;
}> = memo(({colors, onUndo, edgeToEdge, deletedLabel, undoLabel}) => (
  <View style={gs.mb5}>
    <View
      style={[
        gs.rounded12,
        gs.rowBetweenCenter,
        gs.px14,
        gs.py12,
        edgeToEdge && gs.mx16,
        {backgroundColor: colors.secondaryAccent},
      ]}>
      <PrimaryText size={13} color={colors.secondaryText}>
        {deletedLabel}
      </PrimaryText>
      <TouchableOpacity
        onPress={onUndo}
        activeOpacity={0.7}
        style={[gs.py8, gs.px14, gs.rounded10, {backgroundColor: colors.accentGreen}]}>
        <PrimaryText size={12} weight="semibold" color={colors.buttonText}>
          {undoLabel}
        </PrimaryText>
      </TouchableOpacity>
    </View>
  </View>
));

const TransactionList: React.FC<TransactionListProps> = ({
  currencySymbol,
  allExpenses,
  targetDate,
  targetMonth,
  edgeToEdge = false,
  ListHeaderComponent,
  ListEmptyComponent,
  refreshing,
  onRefresh,
  contentContainerStyle,
  onTransactionChanged,
}) => {
  const colors = useThemeColors();
  const {t} = useLanguage();
  const dispatch = useDispatch<AppDispatch>();
  const openSwipeableRef = useRef<{close: () => void} | null>(null);
  const deletionTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [pendingDeletes, setPendingDeletes] = useState<Map<string, Transaction>>(() => new Map());
  const [restoredTransactions, setRestoredTransactions] = useState<Map<string, Transaction>>(() => new Map());
  const listScopeKey = targetMonth ?? targetDate ?? 'all-transactions';

  useEffect(
    () => () => {
      deletionTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      deletionTimeoutsRef.current.clear();
    },
    [],
  );

  const listData: TransactionListItem[] = useMemo(() => {
    const groupedExpenses = new Map<string, Array<Transaction>>();
    const pendingKeys = new Set(pendingDeletes.keys());
    const visibleKeys = new Set<string>();

    allExpenses?.forEach(expense => {
      const deleteKey = `${expense.transactionType ?? 'expense'}-${String(expense.id)}`;
      if (pendingKeys.has(deleteKey)) {
        return;
      }
      visibleKeys.add(deleteKey);
      const date = formatDate(expense.date, 'YYYY-MM-DD');
      const currentGroup = groupedExpenses.get(date) ?? [];
      currentGroup.push(expense);
      groupedExpenses.set(date, currentGroup);
    });

    restoredTransactions.forEach((transaction, restoreKey) => {
      if (visibleKeys.has(restoreKey) || pendingKeys.has(restoreKey)) {
        return;
      }
      const date = formatDate(transaction.date, 'YYYY-MM-DD');
      const currentGroup = groupedExpenses.get(date) ?? [];
      currentGroup.push(transaction);
      groupedExpenses.set(date, currentGroup);
    });

    pendingDeletes.forEach(transaction => {
      const date = formatDate(transaction.date, 'YYYY-MM-DD');
      const currentGroup = groupedExpenses.get(date) ?? [];
      currentGroup.push(transaction);
      groupedExpenses.set(date, currentGroup);
    });

    const sortedDates = Array.from(groupedExpenses.keys()).sort((a, b) => {
      return new Date(b).getTime() - new Date(a).getTime();
    });

    return sortedDates.flatMap(date => {
      const transactions = (groupedExpenses.get(date) ?? []).sort((a, b) =>
        b.date.localeCompare(a.date),
      );
      return [
        {itemType: 'header' as const, id: `header-${date}`, label: formatCalendar(date)},
        ...transactions.map(transaction => {
          const id = `${transaction.transactionType ?? 'expense'}-${String(transaction.id)}`;
          return {
            itemType: pendingDeletes.has(id) ? 'pendingDelete' as const : 'transaction' as const,
            id,
            transaction,
          };
        }),
      ];
    });
  }, [allExpenses, pendingDeletes, restoredTransactions]);

  const handleEdit = useCallback((expense: Transaction) => {
    if (expense.transactionType === 'income') {
      navigate('UpdateIncomeScreen', {
        incomeId: String(expense.id),
        incomeTitle: expense.title,
        category: expense.category,
        incomeDate: expense.date,
        incomeAmount: expense.amount,
      });
      return;
    }

    navigate('UpdateTransactionScreen', {
      expenseId: String(expense.id),
      expenseTitle: expense.title,
      category: expense.category,
      expenseDate: expense.date,
      expenseAmount: expense.amount,
    });
  }, []);

  const refreshTransactionSources = useCallback(async () => {
    await onTransactionChanged?.();
  }, [onTransactionChanged]);

  const refreshDefaultSources = useCallback(
    async (transaction: Transaction) => {
      if (transaction.transactionType === 'income') {
        dispatch(invalidateIncomeCache());
        if (targetMonth) {
          await dispatch(fetchIncomesByMonth(targetMonth));
        }
        return;
      }

      dispatch(invalidateExpenseCache());
      if (targetMonth) {
        await dispatch(fetchExpensesByMonth(targetMonth));
      } else {
        await dispatch(fetchExpenses());
      }
      if (targetDate) {
        await dispatch(fetchEverydayExpenses(targetDate));
      }
    },
    [dispatch, targetDate, targetMonth],
  );

  const refreshAfterChange = useCallback(
    async (transaction: Transaction) => {
      await refreshDefaultSources(transaction);
      await refreshTransactionSources();
    },
    [refreshDefaultSources, refreshTransactionSources],
  );

  const removePendingDelete = useCallback((deleteKey: string) => {
    setPendingDeletes(prev => {
      if (!prev.has(deleteKey)) {
        return prev;
      }
      const next = new Map(prev);
      next.delete(deleteKey);
      return next;
    });
  }, []);

  const handleDelete = useCallback(
    async (expense: Transaction) => {
      const expenseId = String(expense.id);
      const deleteKey = `${expense.transactionType ?? 'expense'}-${expenseId}`;
      setPendingDeletes(prev => new Map(prev).set(deleteKey, expense));

      const existingTimeout = deletionTimeoutsRef.current.get(deleteKey);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      try {
        if (expense.transactionType === 'income') {
          await deleteIncomeById(expenseId);
          dispatch(incomeRemoved(expenseId));
        } else {
          await deleteExpenseById(expenseId);
          dispatch(expenseRemoved(expenseId));
          dispatch(everydayExpenseRemoved(expenseId));
        }
        await refreshAfterChange(expense);
      } catch (error) {
        removePendingDelete(deleteKey);
        if (__DEV__) {
          console.error('Error deleting transaction:', error);
        }
        return;
      }

      const timeout = setTimeout(async () => {
        deletionTimeoutsRef.current.delete(deleteKey);
        removePendingDelete(deleteKey);
      }, 3000);

      deletionTimeoutsRef.current.set(deleteKey, timeout);
    },
    [dispatch, refreshAfterChange, removePendingDelete],
  );

  const handleUndo = useCallback(
    async (deleteKey: string) => {
      const timeout = deletionTimeoutsRef.current.get(deleteKey);
      if (timeout) {
        clearTimeout(timeout);
        deletionTimeoutsRef.current.delete(deleteKey);
      }
      const transaction = pendingDeletes.get(deleteKey);
      if (!transaction) {
        removePendingDelete(deleteKey);
        return;
      }

      let restoredKey = '';
      try {
        let restoredId = '';
        if (transaction.transactionType === 'income') {
          restoredId = await createIncome(
            transaction.userId,
            transaction.title,
            transaction.amount,
            transaction.categoryId,
            transaction.date,
          );
        } else {
          restoredId = await createExpense(
            transaction.userId,
            transaction.title,
            transaction.amount,
            transaction.categoryId,
            transaction.date,
          );
        }
        restoredKey = `${transaction.transactionType ?? 'expense'}-${restoredId}`;
        setRestoredTransactions(prev => {
          const next = new Map(prev);
          next.set(restoredKey, {...transaction, id: restoredId});
          return next;
        });
        removePendingDelete(deleteKey);
        await refreshAfterChange(transaction);
      } catch (error) {
        if (__DEV__) {
          console.error('Error restoring transaction:', error);
        }
      } finally {
        if (!restoredKey) {
          return;
        }
        setRestoredTransactions(prev => {
          if (!prev.has(restoredKey)) {
            return prev;
          }
          const next = new Map(prev);
          next.delete(restoredKey);
          return next;
        });
      }
    },
    [pendingDeletes, refreshAfterChange, removePendingDelete],
  );

  const renderItem = useCallback(
    ({item}: {item: TransactionListItem}) => {
      if (item.itemType === 'header') {
        return (
          <PrimaryText size={12} weight="semibold" color={colors.secondaryText} style={[gs.mb8, gs.mt15, edgeToEdge && gs.px16]}>
            {item.label}
          </PrimaryText>
        );
      }

      if (item.itemType === 'pendingDelete') {
        return (
          <InlineUndo
            colors={colors}
            onUndo={() => handleUndo(item.id)}
            edgeToEdge={edgeToEdge}
            deletedLabel={t('记录已删除')}
            undoLabel={t('撤销')}
          />
        );
      }

      return (
        <ExpenseRow
          expense={item.transaction}
          colors={colors}
          currencySymbol={currencySymbol}
          onEdit={handleEdit}
          onDelete={handleDelete}
          openSwipeableRef={openSwipeableRef}
          edgeToEdge={edgeToEdge}
        />
      );
    },
    [colors, currencySymbol, edgeToEdge, handleDelete, handleEdit, handleUndo, t],
  );

  const refreshControl = useMemo(
    () =>
      onRefresh ? (
        <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} />
      ) : undefined,
    [refreshing, onRefresh],
  );

  const listExtraData = useMemo(
    () => ({pendingDeletes, restoredTransactions}),
    [pendingDeletes, restoredTransactions],
  );

  return (
    <FlashList
      key={listScopeKey}
      data={listData}
      renderItem={renderItem}
      keyExtractor={item => item.id}
      extraData={listExtraData}
      getItemType={item => item.itemType}
      maintainVisibleContentPosition={{disabled: true}}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={contentContainerStyle}
    />
  );
};

export default memo(TransactionList);
