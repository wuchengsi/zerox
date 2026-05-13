import {ScrollView, TextInput, TouchableOpacity, View} from 'react-native';
import React, {useCallback, useEffect, useMemo, useState, memo} from 'react';
import PrimaryView from '../atoms/PrimaryView';
import AppHeader from '../atoms/AppHeader';
import CustomInput from '../atoms/CustomInput';
import PrimaryText from '../atoms/PrimaryText';
import ExpenseCategoryAccordion from './ExpenseCategoryAccordion';
import PrimaryButton from '../atoms/PrimaryButton';
import Icon from '../atoms/Icons';
import useThemeColors from '../../hooks/useThemeColors';
import {goBack, navigate, replace} from '../../utils/navigationUtils';
import {useDispatch, useSelector} from 'react-redux';
import {selectCurrencySymbol} from '../../redux/slice/currencyDataSlice';
import {selectUserId} from '../../redux/slice/userIdSlice';
import {fetchCategories, selectExpenseCategoryGroups} from '../../redux/slice/categoryDataSlice';
import {createExpense, updateExpenseById} from '../../watermelondb/services';
import {fetchExpensesByMonth, invalidateExpenseCache} from '../../redux/slice/expenseDataSlice';
import DatePicker from '../atoms/DatePicker';
import {getISODateTime, formatDate} from '../../utils/dateUtils';
import {ensureYearInCache} from '../../utils/availableYearsCache';
import {expenseAmountSchema, expenseSchema} from '../../utils/validationSchema';
import {CategoryData as CategoryDocType} from '../../watermelondb/services';
import {AppDispatch} from '../../redux/store';
import {gs} from '../../styles/globalStyles';
import {useLanguage} from '../../context/LanguageContext';

interface ExpenseEntryProps {
  type: string;
  route?: any;
}

const ExpenseEntry: React.FC<ExpenseEntryProps> = ({type, route}) => {
  const expenseData = route?.params;
  const isAddButton = type === 'Add';
  const [hasInteracted, setHasInteracted] = useState(false);
  const categoryGroups = useSelector(selectExpenseCategoryGroups);
  const categories = useMemo(
    () => categoryGroups.flatMap(group => group.children),
    [categoryGroups],
  );
  const [selectedCategories, setSelectedCategories] = useState<CategoryDocType[]>(
    isAddButton
      ? []
      : categories?.filter((category: CategoryDocType) => category?.id === expenseData?.category?.id) ?? [],
  );

  useEffect(() => {
    if (!isAddButton && selectedCategories.length === 0 && expenseData?.category?.id) {
      const matched = categories.find(
        (category: CategoryDocType) => category.id === expenseData.category.id,
      );
      if (matched) {
        setSelectedCategories([matched]);
      }
    }
  }, [categories, expenseData?.category?.id, isAddButton, selectedCategories.length]);

  const [createdAt, setCreatedAt] = useState(isAddButton ? getISODateTime() : expenseData?.expenseDate ?? getISODateTime());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState(isAddButton ? '' : expenseData?.expenseTitle ?? '');
  const [expenseAmount, setExpenseAmount] = useState(isAddButton ? '' : String(expenseData?.expenseAmount ?? ''));

  const expenseAmountError = hasInteracted
    ? expenseAmountSchema?.safeParse(Number(expenseAmount)).error?.issues || []
    : [];

  const isValid =
    expenseSchema.safeParse(expenseTitle).success &&
    expenseAmountSchema.safeParse(Number(expenseAmount)).success;

  const userId = useSelector(selectUserId);
  const currencySymbol = useSelector(selectCurrencySymbol);
  const dispatch = useDispatch<AppDispatch>();

  const colors = useThemeColors();
  const {t} = useLanguage();

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  const handleAddCategory = useCallback(() => {
    navigate('AddCategoryScreen');
  }, []);

  const handleTextInputFocus = useCallback(() => {
    setHasInteracted(true);
  }, []);

  const handleAddExpense = useCallback(async () => {
    if (!isValid || selectedCategories.length === 0) {
      return;
    }
    const categoryId = selectedCategories[0].id;
    try {
      await createExpense(userId, expenseTitle, Number(expenseAmount), categoryId, createdAt);

      const yearMonth = formatDate(createdAt, 'YYYY-MM');
      const year = Number.parseInt(formatDate(createdAt, 'YYYY'), 10);
      ensureYearInCache(year);
      dispatch(invalidateExpenseCache());
      await dispatch(fetchExpensesByMonth(yearMonth));
      goBack();
    } catch (error) {
      if (__DEV__) {
        console.error('Error creating expense:', error);
      }
    }
  }, [isValid, selectedCategories, userId, expenseTitle, expenseAmount, createdAt, dispatch]);

  const handleUpdateExpense = useCallback(async () => {
    if (!isValid || selectedCategories.length === 0) {
      return;
    }
    const categoryId = selectedCategories[0].id;
    try {
      await updateExpenseById(
        expenseData?.expenseId,
        categoryId,
        expenseTitle,
        Number(expenseAmount),
        createdAt,
      );

      const yearMonth = formatDate(createdAt, 'YYYY-MM');
      const year = Number.parseInt(formatDate(createdAt, 'YYYY'), 10);
      ensureYearInCache(year);
      dispatch(invalidateExpenseCache());
      await dispatch(fetchExpensesByMonth(yearMonth));
      goBack();
    } catch (error) {
      if (__DEV__) {
        console.error('Error updating expense:', error);
      }
    }
  }, [
    isValid,
    selectedCategories,
    expenseData?.expenseId,
    expenseTitle,
    expenseAmount,
    createdAt,
    dispatch,
  ]);

  const toggleCategorySelection = useCallback(
    (category: CategoryDocType) => {
      if (selectedCategories[0]?.id === category.id) {
        setSelectedCategories([]);
      } else {
        setSelectedCategories([category]);
      }
    },
    [selectedCategories],
  );

  return (
    <PrimaryView colors={colors} dismissKeyboardOnTouch>
      <View style={[gs.mb20, gs.mt20]}>
          <AppHeader
            onPress={() => goBack()}
            colors={colors}
            text={isAddButton ? t('新增账单') : t('编辑账单')}
            rightAction={
              isAddButton ? (
                <TouchableOpacity
                  onPress={() => navigate('AiQuickExpenseScreen')}
                  hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                  accessibilityLabel={t('AI 快速记账')}
                  accessibilityRole="button">
                  <Icon name="sparkles" size={20} color={colors.primaryText} />
                </TouchableOpacity>
              ) : null
            }
          />
          {isAddButton ? (
            <View style={[gs.row, gs.gap8, gs.mt15]}>
              <View style={[gs.py8, gs.px14, gs.rounded12, {backgroundColor: colors.primaryText}]}>
                <PrimaryText size={13} weight="semibold" color={colors.buttonText}>
                  {t('支出')}
                </PrimaryText>
              </View>
              <TouchableOpacity
                onPress={() => replace('AddIncomeScreen')}
                activeOpacity={0.7}
                style={[gs.py8, gs.px14, gs.rounded12, {backgroundColor: colors.secondaryAccent}]}>
                <PrimaryText size={13} color={colors.primaryText}>
                  {t('收入')}
                </PrimaryText>
              </TouchableOpacity>
            </View>
          ) : null}
      </View>

      <CustomInput
        colors={colors}
        input={expenseTitle}
        setInput={setExpenseTitle}
        placeholder={t('例如 午饭')}
        label={t('标题')}
        schema={expenseSchema}
      />
      <PrimaryText size={12} color={colors.secondaryText} style={gs.mb5}>{t('金额')}</PrimaryText>
      <View
        style={[
          gs.h48,
          gs.itemsCenter,
          gs.rounded12,
          gs.pl10,
          gs.justifyStart,
          gs.row,
          {
            backgroundColor: colors.secondaryAccent,
            marginBottom: expenseAmountError.length > 0 ? 5 : 15,
          },
        ]}>
        <PrimaryText size={15} variant="number" color={colors.secondaryText}>{currencySymbol}</PrimaryText>
        <TextInput
          style={[gs.px15, gs.h48, gs.wFull, gs.numMedium, gs.noFontPadding, {color: colors.primaryText}]}
          value={expenseAmount}
          onChangeText={setExpenseAmount}
          placeholder={'0'}
          onChange={handleTextInputFocus}
          placeholderTextColor={colors.secondaryText}
          keyboardType="numeric"
        />
      </View>
      {expenseAmountError.length > 0 && (
        <View style={gs.mb10}>
          {expenseAmountError.map((error: {message: string}) => (
            <View key={error.message}>
              <PrimaryText size={12} color={colors.accentRed}>
                {error.message}
              </PrimaryText>
            </View>
          ))}
        </View>
      )}

      <DatePicker
        setShowDatePicker={setShowDatePicker}
        createdAt={createdAt}
        showDatePicker={showDatePicker}
        setCreatedAt={setCreatedAt}
        label={t('日期')}
      />

      <PrimaryText size={12} color={colors.secondaryText} style={gs.mb8}>{t('分类')}</PrimaryText>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ExpenseCategoryAccordion
          groups={categoryGroups}
          colors={colors}
          toggleCategorySelection={toggleCategorySelection}
          selectedCategories={selectedCategories}
        />
        <PrimaryButton
          onPress={handleAddCategory}
          colors={colors}
          buttonTitle={t('新增分类')}
          variant="ghost"
          size="sm"
          fullWidth={false}
        />
      </ScrollView>
      <View style={gs.mt5}>
        <PrimaryButton
          onPress={isAddButton ? handleAddExpense : handleUpdateExpense}
          colors={colors}
          buttonTitle={isAddButton ? t('新增') : t('更新')}
          disabled={!isValid}
        />
      </View>
    </PrimaryView>
  );
};

export default memo(ExpenseEntry);
