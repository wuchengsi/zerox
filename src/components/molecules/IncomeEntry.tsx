import React, {memo, useCallback, useEffect, useState} from 'react';
import {TextInput, TouchableOpacity, View} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import AppHeader from '../atoms/AppHeader';
import CategoryContainer from './CategoryContainer';
import CustomInput from '../atoms/CustomInput';
import DatePicker from '../atoms/DatePicker';
import PrimaryButton from '../atoms/PrimaryButton';
import PrimaryText from '../atoms/PrimaryText';
import PrimaryView from '../atoms/PrimaryView';
import useThemeColors from '../../hooks/useThemeColors';
import {selectCurrencySymbol} from '../../redux/slice/currencyDataSlice';
import {fetchCategories, selectActiveIncomeCategories} from '../../redux/slice/categoryDataSlice';
import {fetchIncomesByMonth, invalidateIncomeCache} from '../../redux/slice/incomeDataSlice';
import {selectUserId} from '../../redux/slice/userIdSlice';
import {AppDispatch} from '../../redux/store';
import {createIncome, updateIncomeById} from '../../watermelondb/services';
import type {CategoryData} from '../../watermelondb/services';
import {formatDate, getISODateTime} from '../../utils/dateUtils';
import {ensureYearInCache} from '../../utils/availableYearsCache';
import {goBack, replace} from '../../utils/navigationUtils';
import {expenseAmountSchema, expenseSchema} from '../../utils/validationSchema';
import {gs} from '../../styles/globalStyles';
import {useLanguage} from '../../context/LanguageContext';

interface IncomeEntryProps {
  type: 'Add' | 'Update';
  route?: any;
}

const IncomeEntry: React.FC<IncomeEntryProps> = ({type, route}) => {
  const colors = useThemeColors();
  const {t} = useLanguage();
  const dispatch = useDispatch<AppDispatch>();
  const userId = useSelector(selectUserId);
  const currencySymbol = useSelector(selectCurrencySymbol);
  const categories = useSelector(selectActiveIncomeCategories);
  const incomeData = route?.params;
  const isAdd = type === 'Add';

  const [title, setTitle] = useState(isAdd ? '' : incomeData?.incomeTitle ?? '');
  const [amount, setAmount] = useState(isAdd ? '' : String(incomeData?.incomeAmount ?? ''));
  const [createdAt, setCreatedAt] = useState(isAdd ? getISODateTime() : incomeData?.incomeDate ?? getISODateTime());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<CategoryData[]>(
    isAdd
      ? []
      : categories.filter(category => category.id === incomeData?.category?.id),
  );

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  useEffect(() => {
    if (!isAdd && selectedCategories.length === 0 && incomeData?.category?.id) {
      const matched = categories.find(category => category.id === incomeData.category.id);
      if (matched) {
        setSelectedCategories([matched]);
      }
    }
  }, [categories, incomeData?.category?.id, isAdd, selectedCategories.length]);

  const amountErrors = hasInteracted ? expenseAmountSchema.safeParse(Number(amount)).error?.issues ?? [] : [];
  const isValid =
    expenseSchema.safeParse(title).success &&
    expenseAmountSchema.safeParse(Number(amount)).success &&
    selectedCategories.length > 0;

  const refreshIncome = useCallback(async () => {
    const yearMonth = formatDate(createdAt, 'YYYY-MM');
    const year = Number.parseInt(formatDate(createdAt, 'YYYY'), 10);
    ensureYearInCache(year);
    dispatch(invalidateIncomeCache());
    await dispatch(fetchIncomesByMonth(yearMonth));
  }, [createdAt, dispatch]);

  const handleSubmit = useCallback(async () => {
    if (!isValid) {
      return;
    }

    const categoryId = selectedCategories[0].id;
    if (isAdd) {
      await createIncome(userId, title, Number(amount), categoryId, createdAt);
    } else {
      await updateIncomeById(incomeData?.incomeId, categoryId, title, Number(amount), createdAt);
    }

    await refreshIncome();
    goBack();
  }, [amount, createdAt, incomeData?.incomeId, isAdd, isValid, refreshIncome, selectedCategories, title, userId]);

  const toggleCategorySelection = useCallback(
    (category: CategoryData) => {
      if (selectedCategories[0]?.id === category.id) {
        setSelectedCategories([]);
      } else {
        setSelectedCategories([category]);
      }
    },
    [selectedCategories],
  );

  return (
    <PrimaryView colors={colors} style={gs.justifyBetween} dismissKeyboardOnTouch>
      <View>
        <View style={[gs.mb20, gs.mt20]}>
          <AppHeader onPress={goBack} colors={colors} text={isAdd ? t('新增收入') : t('编辑收入')} />
          {isAdd ? (
            <View style={[gs.row, gs.gap8, gs.mt15]}>
              <TouchableOpacity
                onPress={() => replace('AddTransactionsScreen')}
                activeOpacity={0.7}
                style={[gs.py8, gs.px14, gs.rounded12, {backgroundColor: colors.secondaryAccent}]}>
                <PrimaryText size={13} color={colors.primaryText}>
                  {t('支出')}
                </PrimaryText>
              </TouchableOpacity>
              <View style={[gs.py8, gs.px14, gs.rounded12, {backgroundColor: colors.primaryText}]}>
                <PrimaryText size={13} weight="semibold" color={colors.buttonText}>
                  {t('收入')}
                </PrimaryText>
              </View>
            </View>
          ) : null}
        </View>

        <CustomInput
          colors={colors}
          input={title}
          setInput={setTitle}
          placeholder={t('例如 工资')}
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
              marginBottom: amountErrors.length > 0 ? 5 : 15,
            },
          ]}>
          <PrimaryText size={15} variant="number" color={colors.secondaryText}>{currencySymbol}</PrimaryText>
          <TextInput
            style={[gs.px15, gs.h48, gs.wFull, gs.numMedium, gs.noFontPadding, {color: colors.primaryText}]}
            value={amount}
            onChangeText={setAmount}
            placeholder="0"
            onChange={() => setHasInteracted(true)}
            placeholderTextColor={colors.secondaryText}
            keyboardType="numeric"
          />
        </View>
        {amountErrors.length > 0 && (
          <View style={gs.mb10}>
            {amountErrors.map(error => (
              <PrimaryText key={error.message} size={12} color={colors.accentRed}>
                {error.message}
              </PrimaryText>
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
        <CategoryContainer
          categories={categories}
          colors={colors}
          toggleCategorySelection={toggleCategorySelection}
          selectedCategories={selectedCategories}
        />
      </View>

      <PrimaryButton
        onPress={handleSubmit}
        colors={colors}
        buttonTitle={isAdd ? t('新增') : t('更新')}
        disabled={!isValid}
      />
    </PrimaryView>
  );
};

export default memo(IncomeEntry);
