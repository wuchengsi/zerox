import {View} from 'react-native';
import React, {useMemo} from 'react';
import {PieChart} from 'react-native-svg-charts';
import {useRoute} from '@react-navigation/native';
import AppHeader from '../../components/atoms/AppHeader';
import {goBack} from '../../utils/navigationUtils';
import TransactionList from '../../components/molecules/TransactionList';
import useCategoryTransaction, {CategoryTransactionRouteProp} from './useCategoryTransaction';
import PrimaryView from '../../components/atoms/PrimaryView';
import PrimaryText from '../../components/atoms/PrimaryText';
import PieChartLabels from '../../components/atoms/PieChartLabels';
import Icon from '../../components/atoms/Icons';
import {formatCurrency} from '../../utils/numberUtils';
import {gs} from '../../styles/globalStyles';

const CategoryTransactionScreen = () => {
  const route = useRoute<CategoryTransactionRouteProp>();
  const {
    colors,
    currencySymbol,
    transactions,
    totalAmount,
    categoryName,
    categoryColor,
    categoryIcon,
    monthLabel,
    yearMonth,
  } = useCategoryTransaction(route);

  const listHeader = useMemo(
    () => {
      const subcategoryTotals = new Map<string, number>();
      const subcategoryMeta = new Map<string, {color: string; icon?: string; id?: string}>();
      transactions.forEach(transaction => {
        const name = transaction.category?.name ?? '未知分类';
        subcategoryTotals.set(name, (subcategoryTotals.get(name) ?? 0) + transaction.amount);
        if (!subcategoryMeta.has(name)) {
          subcategoryMeta.set(name, {
            id: transaction.category?.id,
            color: transaction.category?.color ?? categoryColor,
            icon: transaction.category?.icon,
          });
        }
      });
      const subcategoryPieData = Array.from(subcategoryTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, amount]) => {
          const meta = subcategoryMeta.get(name);
          return {
            key: name,
            value: amount,
            svg: {fill: meta?.color ?? categoryColor, onPress: () => {}},
            label: `${name}: ${currencySymbol} ${amount}`,
            categoryId: meta?.id,
            categoryIcon: meta?.icon,
          };
        });

      return (
        <View style={[gs.rounded12, gs.py12, gs.px14, gs.mb10, {backgroundColor: colors.secondaryAccent}]}>
          <View style={[gs.rowCenter, gs.gap10]}>
          <View style={[gs.size36, gs.roundedFull, gs.center, {backgroundColor: categoryColor + '20'}]}>
            <Icon name={categoryIcon || 'shapes'} size={18} color={categoryColor} />
          </View>
          <View style={gs.flex1}>
            <PrimaryText size={11} color={colors.secondaryText}>{monthLabel}</PrimaryText>
            <PrimaryText size={15} weight="semibold" variant="number">
              {currencySymbol}{formatCurrency(totalAmount)}
            </PrimaryText>
          </View>
          <View style={[gs.px10, gs.py3, gs.rounded8, {backgroundColor: categoryColor + '20'}]}>
            <PrimaryText size={12} weight="semibold" variant="number" color={categoryColor}>
              {transactions.length} 条
            </PrimaryText>
          </View>
        </View>
          {subcategoryPieData.length > 0 ? (
            <View style={gs.mt10}>
              <PrimaryText size={13} weight="semibold" style={gs.mb8}>
                小类占比
              </PrimaryText>
              <PieChart style={gs.h170} data={subcategoryPieData} />
              <PieChartLabels
                slices={subcategoryPieData}
                colors={colors}
                currencySymbol={currencySymbol}
              />
            </View>
          ) : null}
        </View>
      );
    },
    [colors, currencySymbol, totalAmount, categoryColor, categoryIcon, monthLabel, transactions],
  );

  const listEmpty = useMemo(
    () => (
      <View style={[gs.center, gs.mt30p]}>
        <View style={[gs.size50, gs.roundedFull, gs.center, {backgroundColor: colors.secondaryAccent}]}>
          <Icon name="receipt" size={22} color={colors.secondaryText} />
        </View>
        <PrimaryText size={13} color={colors.secondaryText} style={gs.mt10}>
          {categoryName} 暂无账单
        </PrimaryText>
      </View>
    ),
    [colors, categoryName],
  );

  return (
    <PrimaryView colors={colors}>
      <View style={[gs.mb20, gs.mt20]}>
        <AppHeader onPress={goBack} colors={colors} text={categoryName} />
      </View>
      <TransactionList
        currencySymbol={currencySymbol}
        allExpenses={transactions}
        targetMonth={yearMonth}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
      />
    </PrimaryView>
  );
};

export default CategoryTransactionScreen;
