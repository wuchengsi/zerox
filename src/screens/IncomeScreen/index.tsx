import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {TouchableOpacity, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import {SheetManager} from 'react-native-actions-sheet';
import HeaderContainer from '../../components/molecules/HeaderContainer';
import Icon from '../../components/atoms/Icons';
import PrimaryText from '../../components/atoms/PrimaryText';
import PrimaryView from '../../components/atoms/PrimaryView';
import TransactionList from '../../components/molecules/TransactionList';
import DebtsScreen from '../DebtsScreen';
import useThemeColors from '../../hooks/useThemeColors';
import {fetchCategories} from '../../redux/slice/categoryDataSlice';
import {selectCurrencySymbol} from '../../redux/slice/currencyDataSlice';
import {fetchIncomesByMonth, selectIncomeData} from '../../redux/slice/incomeDataSlice';
import {selectMonthIndex, selectYear, setMonthSelection} from '../../redux/slice/monthSelectionSlice';
import {selectUserId} from '../../redux/slice/userIdSlice';
import {AppDispatch} from '../../redux/store';
import {ensureDefaultCategoriesForUser} from '../../watermelondb/services';
import type {IncomeWithCategory} from '../../watermelondb/services';
import {getCurrentYear, getMonthIndex, getMonthNames, getMonthNumber} from '../../utils/dateUtils';
import {formatCurrency} from '../../utils/numberUtils';
import {navigate} from '../../utils/navigationUtils';
import {loadAvailableYears} from '../../utils/availableYearsCache';
import {gs, hitSlop} from '../../styles/globalStyles';
import {useLanguage} from '../../context/LanguageContext';

const CURRENT_YEAR = getCurrentYear();

const IncomeScreen = () => {
  const colors = useThemeColors();
  const {t} = useLanguage();
  const dispatch = useDispatch<AppDispatch>();
  const [tab, setTab] = useState<'income' | 'debt'>('income');
  const [availableYears, setAvailableYears] = useState<number[]>([CURRENT_YEAR]);
  const userId = useSelector(selectUserId);
  const currencySymbol = useSelector(selectCurrencySymbol);
  const selectedMonthIndex = useSelector(selectMonthIndex);
  const selectedYear = useSelector(selectYear);
  const months = getMonthNames();
  const selectedMonth = months[selectedMonthIndex];
  const incomes = useSelector(selectIncomeData) as IncomeWithCategory[];
  const yearMonth = `${selectedYear}-${getMonthNumber(selectedMonth)}`;

  useEffect(() => {
    if (userId) {
      ensureDefaultCategoriesForUser(userId).then(() => {
        dispatch(fetchCategories());
      });
      loadAvailableYears(userId).then(years => {
        if (years.length > 0) {
          setAvailableYears(years);
        }
      });
    }
  }, [dispatch, userId]);

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchIncomesByMonth(yearMonth));
    }, [dispatch, yearMonth]),
  );

  const openMonthPicker = useCallback(() => {
    const monthIndex = getMonthIndex(selectedMonth);
    void SheetManager.show('month-year-picker-sheet', {
      payload: {
        selectedMonth: monthIndex,
        selectedYear,
        availableYears,
        onSelect: (monthIdx: number, year: number) => {
          dispatch(setMonthSelection({monthIndex: monthIdx, year}));
        },
      },
    });
  }, [availableYears, dispatch, selectedMonth, selectedYear]);

  const totalIncome = useMemo(
    () => incomes.reduce((sum, income) => sum + income.amount, 0),
    [incomes],
  );
  const categoryTotals = useMemo(() => {
    const map = new Map<string, {name: string; amount: number; color: string; icon?: string}>();
    for (const income of incomes) {
      const name = income.category?.name ?? t('收入');
      const current = map.get(name) ?? {
        name,
        amount: 0,
        color: income.category?.color ?? colors.accentGreen,
        icon: income.category?.icon,
      };
      current.amount += income.amount;
      map.set(name, current);
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [colors.accentGreen, incomes, t]);

  const segment = useCallback(
    (value: 'income' | 'debt', label: string) => {
      const active = tab === value;
      return (
        <TouchableOpacity
          onPress={() => setTab(value)}
          activeOpacity={0.7}
          style={[
            gs.py8,
            gs.px14,
            gs.rounded12,
            {backgroundColor: active ? colors.primaryText : colors.secondaryAccent},
          ]}>
          <PrimaryText
            size={13}
            weight={active ? 'semibold' : 'regular'}
            color={active ? colors.buttonText : colors.primaryText}>
            {label}
          </PrimaryText>
        </TouchableOpacity>
      );
    },
    [colors, tab],
  );

  const listHeader = useMemo(
    () => (
      <View style={gs.px16}>
        <TouchableOpacity
          onPress={openMonthPicker}
          activeOpacity={0.7}
          style={[gs.px14, gs.py12, gs.rounded12, gs.mb20, {backgroundColor: colors.accentGreen}]}>
          <View style={gs.rowBetweenCenter}>
            <View style={[gs.rowCenter, gs.gap6]}>
              <PrimaryText size={14} weight="semibold" color={colors.buttonText}>
                {selectedMonth} {selectedYear}
              </PrimaryText>
              <Icon name="chevron-down" size={14} color={colors.buttonText} />
            </View>
            <PrimaryText size={20} weight="bold" variant="number" color={colors.buttonText}>
              {currencySymbol}{formatCurrency(totalIncome)}
            </PrimaryText>
          </View>
          <PrimaryText size={11} color={colors.buttonText} variant="number" style={[gs.mt4, {opacity: 0.7}]}>
            {incomes.length} {t('条收入')}
          </PrimaryText>
        </TouchableOpacity>

        {categoryTotals.length > 0 ? (
          <View style={[gs.rounded12, gs.px14, gs.py12, gs.mb10, {backgroundColor: colors.containerColor}]}>
            <PrimaryText size={13} weight="semibold" style={gs.mb8}>{t('分类统计')}</PrimaryText>
            {categoryTotals.map(item => (
              <View key={item.name} style={[gs.rowBetweenCenter, gs.py5]}>
                <View style={gs.rowCenter}>
                  <Icon name={item.icon || 'wallet'} size={16} color={item.color} />
                  <PrimaryText size={13} style={gs.ml8}>{item.name}</PrimaryText>
                </View>
                <PrimaryText size={13} weight="semibold" variant="number">
                  {currencySymbol}{formatCurrency(item.amount)}
                </PrimaryText>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    ),
    [
      categoryTotals,
      colors.accentGreen,
      colors.buttonText,
      colors.containerColor,
      currencySymbol,
      incomes.length,
      openMonthPicker,
      selectedMonth,
      selectedYear,
      t,
      totalIncome,
    ],
  );

  const listEmpty = useMemo(
    () => (
      <View style={[gs.center, gs.mt30p]}>
        <View style={[gs.size50, gs.roundedFull, gs.center, {backgroundColor: colors.secondaryAccent}]}>
          <Icon name="wallet" size={22} color={colors.secondaryText} />
        </View>
        <PrimaryText size={13} color={colors.secondaryText} style={gs.mt10}>
          {t('还没有收入记录')}
        </PrimaryText>
      </View>
    ),
    [colors.secondaryAccent, colors.secondaryText, t],
  );

  return (
    <PrimaryView colors={colors} useSidePadding={false} useBottomPadding={false}>
      <View style={[gs.px16, gs.mb15]}>
        <HeaderContainer headerText={t('收入')} />
        <View style={[gs.row, gs.gap8, gs.mt20]}>
          {segment('income', t('收入'))}
          {segment('debt', t('债务'))}
        </View>
      </View>

      {tab === 'debt' ? (
        <DebtsScreen embedded />
      ) : (
        <>
          <TransactionList
            allExpenses={incomes}
            currencySymbol={currencySymbol}
            targetMonth={yearMonth}
            edgeToEdge
            ListHeaderComponent={listHeader}
            ListEmptyComponent={listEmpty}
            contentContainerStyle={{paddingBottom: 80}}
          />
          <View style={[gs.absolute, gs.bottom15, gs.right15, gs.zIndex1]}>
            <TouchableOpacity
              style={[gs.size50, gs.rounded8, gs.center, {backgroundColor: colors.secondaryBackground}]}
              onPress={() => navigate('AddIncomeScreen')}
              hitSlop={hitSlop}
              accessibilityLabel={t('新增收入')}
              accessibilityRole="button">
              <Icon name="plus-circle" size={30} color={colors.primaryText} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </PrimaryView>
  );
};

export default IncomeScreen;
