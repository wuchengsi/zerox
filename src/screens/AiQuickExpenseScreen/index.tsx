import {ActivityIndicator, ScrollView, TextInput, TouchableOpacity, View} from 'react-native';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import AppHeader from '../../components/atoms/AppHeader';
import CategoryContainer from '../../components/molecules/CategoryContainer';
import DatePicker from '../../components/atoms/DatePicker';
import Icon from '../../components/atoms/Icons';
import PrimaryButton from '../../components/atoms/PrimaryButton';
import PrimaryText from '../../components/atoms/PrimaryText';
import PrimaryView from '../../components/atoms/PrimaryView';
import useThemeColors from '../../hooks/useThemeColors';
import {useDialog} from '../../context/DialogContext';
import {fetchCategories, selectActiveCategories} from '../../redux/slice/categoryDataSlice';
import {selectCurrencySymbol} from '../../redux/slice/currencyDataSlice';
import {fetchExpensesByMonth, invalidateExpenseCache} from '../../redux/slice/expenseDataSlice';
import {selectMonthIndex, selectYear} from '../../redux/slice/monthSelectionSlice';
import {selectUserId} from '../../redux/slice/userIdSlice';
import {AppDispatch} from '../../redux/store';
import {
  AiExpenseCandidate,
  AiExpenseIssue,
  parseNaturalLanguageExpenses,
} from '../../services/aiExpenseParser';
import {getAiSettings, getMissingAiSettingsFields} from '../../services/aiSettingsService';
import {createExpense, CategoryData} from '../../watermelondb/services';
import {ensureYearInCache} from '../../utils/availableYearsCache';
import {formatDate, getISODateTime, getMonthNames, getMonthNumber} from '../../utils/dateUtils';
import {goBack, navigate} from '../../utils/navigationUtils';
import {gs} from '../../styles/globalStyles';

interface EditableAiExpense {
  localId: string;
  title: string;
  amountText: string;
  description: string;
  date: string;
  categoryId: string | null;
  categoryHint: string;
  warnings: AiExpenseIssue[];
  showDatePicker: boolean;
}

interface ValidatedAiExpense extends EditableAiExpense {
  amount: number | null;
  issues: AiExpenseIssue[];
}

const MONTHS = getMonthNames();

const toEditableItem = (candidate: AiExpenseCandidate): EditableAiExpense => ({
  localId: candidate.localId,
  title: candidate.title,
  amountText: candidate.amount === null ? '' : String(candidate.amount),
  description: candidate.description,
  date: candidate.date,
  categoryId: candidate.categoryId,
  categoryHint: candidate.categoryHint,
  warnings: candidate.issues.filter(issue => issue.code === 'category_fallback' || issue.code === 'invalid_date'),
  showDatePicker: false,
});

const getBlockingIssues = (item: ValidatedAiExpense): AiExpenseIssue[] =>
  item.issues.filter(issue => issue.code !== 'category_fallback' && issue.code !== 'invalid_date');

const AiQuickExpenseScreen = () => {
  const colors = useThemeColors();
  const {showAlert} = useDialog();
  const dispatch = useDispatch<AppDispatch>();
  const userId = useSelector(selectUserId);
  const currencySymbol = useSelector(selectCurrencySymbol);
  const categories = useSelector(selectActiveCategories);
  const selectedYear = useSelector(selectYear);
  const selectedMonthIndex = useSelector(selectMonthIndex);
  const [input, setInput] = useState('');
  const [items, setItems] = useState<EditableAiExpense[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  useEffect(() => {
    const missingFields = getMissingAiSettingsFields(getAiSettings());
    if (missingFields.length === 0) {
      return;
    }

    void showAlert({
      type: 'warning',
      message: `请先在设置中填写：${missingFields.join('、')}`,
      okLabel: '去设置',
    }).then(() => {
      navigate('AiSettingsScreen');
    });
  }, [showAlert]);

  const currentYearMonth = useMemo(
    () => `${selectedYear}-${getMonthNumber(MONTHS[selectedMonthIndex])}`,
    [selectedMonthIndex, selectedYear],
  );

  const getCategoryById = useCallback(
    (categoryId: string | null): CategoryData | null =>
      categories.find(category => category.id === categoryId) ?? null,
    [categories],
  );

  const validateItem = useCallback(
    (item: EditableAiExpense): ValidatedAiExpense => {
      const issues: AiExpenseIssue[] = [];
      const amountText = item.amountText.trim();
      const amount = amountText ? Number(amountText) : null;

      if (!item.title.trim()) {
        issues.push({code: 'missing_title', message: '缺少标题'});
      }

      if (amount === null) {
        issues.push({code: 'missing_amount', message: '缺少金额'});
      } else if (!Number.isFinite(amount) || amount <= 0) {
        issues.push({code: 'invalid_amount', message: '金额必须大于 0'});
      }

      if (!getCategoryById(item.categoryId)) {
        issues.push({code: 'missing_category', message: '请选择分类'});
      }

      return {
        ...item,
        title: item.title.trim(),
        description: item.description.trim(),
        amount,
        issues: [...issues, ...item.warnings],
      };
    },
    [getCategoryById],
  );

  const validatedItems = useMemo(() => items.map(validateItem), [items, validateItem]);
  const validItems = useMemo(
    () => validatedItems.filter(item => getBlockingIssues(item).length === 0),
    [validatedItems],
  );

  const updateItem = useCallback((localId: string, patch: Partial<EditableAiExpense>) => {
    setItems(prev =>
      prev.map(item =>
        item.localId === localId
          ? {
              ...item,
              ...patch,
              warnings: patch.categoryId !== undefined ? [] : item.warnings,
            }
          : item,
      ),
    );
  }, []);

  const removeItem = useCallback((localId: string) => {
    setItems(prev => prev.filter(item => item.localId !== localId));
  }, []);

  const handleOpenSettings = useCallback(() => {
    navigate('AiSettingsScreen');
  }, []);

  const handleParse = useCallback(async () => {
    const settings = getAiSettings();
    const missingFields = getMissingAiSettingsFields(settings);
    if (missingFields.length > 0) {
      await showAlert({
        type: 'warning',
        message: `请先在设置中填写：${missingFields.join('、')}`,
        okLabel: '知道了',
      });
      handleOpenSettings();
      return;
    }

    if (!input.trim()) {
      await showAlert({
        type: 'warning',
        message: '请输入要解析的消费记录',
        okLabel: '知道了',
      });
      return;
    }

    setIsParsing(true);
    try {
      const result = await parseNaturalLanguageExpenses({
        input,
        settings,
        categories,
        currentDateTime: getISODateTime(),
      });
      setItems(result.items.map(toEditableItem));
    } catch (error) {
      await showAlert({
        type: 'error',
        message: error instanceof Error ? error.message : '解析失败，请重试',
        okLabel: '知道了',
      });
    } finally {
      setIsParsing(false);
    }
  }, [categories, handleOpenSettings, input, showAlert]);

  const handleCreate = useCallback(async () => {
    if (validItems.length === 0) {
      await showAlert({
        type: 'warning',
        message: '没有可创建的账单，请先补全金额、标题和分类',
        okLabel: '知道了',
      });
      return;
    }

    setIsCreating(true);
    let successCount = 0;
    let skippedCount = validatedItems.length - validItems.length;
    const createdIds = new Set<string>();

    for (const item of validItems) {
      try {
        await createExpense(
          userId,
          item.title,
          item.amount ?? 0,
          item.description,
          item.categoryId ?? '',
          item.date,
        );
        const year = Number.parseInt(formatDate(item.date, 'YYYY'), 10);
        if (!Number.isNaN(year)) {
          ensureYearInCache(year);
        }
        successCount += 1;
        createdIds.add(item.localId);
      } catch {
        skippedCount += 1;
      }
    }

    dispatch(invalidateExpenseCache());
    await dispatch(fetchExpensesByMonth(currentYearMonth));
    setItems(prev => prev.filter(item => !createdIds.has(item.localId)));
    setIsCreating(false);

    await showAlert({
      type: skippedCount > 0 ? 'warning' : 'success',
      message: `已创建 ${successCount} 条，跳过 ${skippedCount} 条`,
      okLabel: '知道了',
    });

    if (successCount > 0 && skippedCount === 0) {
      setInput('');
    }
  }, [currentYearMonth, dispatch, showAlert, userId, validItems, validatedItems.length]);

  const renderIssueList = (issues: AiExpenseIssue[]) => {
    if (issues.length === 0) {
      return null;
    }

    return (
      <View style={gs.mt8}>
        {issues.map(issue => (
          <PrimaryText
            key={`${issue.code}-${issue.message}`}
            size={11}
            color={issue.code === 'category_fallback' || issue.code === 'invalid_date' ? colors.accentOrange : colors.accentRed}
            style={gs.mb3}>
            {issue.message}
          </PrimaryText>
        ))}
      </View>
    );
  };

  return (
    <PrimaryView colors={colors} dismissKeyboardOnTouch>
      <View style={[gs.mb20, gs.mt20]}>
        <AppHeader
          onPress={goBack}
          colors={colors}
          text="AI 快速记账"
          subtitle="一句话或多行文本，解析后再确认创建"
          rightAction={
            <TouchableOpacity
              onPress={handleOpenSettings}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
              accessibilityRole="button"
              accessibilityLabel="AI 设置">
              <Icon name="settings-2" size={20} color={colors.primaryText} />
            </TouchableOpacity>
          }
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={gs.pb80}>
        <PrimaryText size={12} color={colors.secondaryText} style={gs.mb5}>
          消费内容
        </PrimaryText>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={'例如：\n昨天：\n午饭 28\n瑞幸 16\n地铁 4'}
          placeholderTextColor={colors.secondaryText}
          multiline
          textAlignVertical="top"
          style={[
            gs.rounded12,
            gs.px14,
            gs.py12,
            gs.fontMedium,
            {
              minHeight: 150,
              color: colors.primaryText,
              backgroundColor: colors.secondaryAccent,
            },
          ]}
        />

        <View style={gs.mt15}>
          <PrimaryButton
            onPress={handleParse}
            colors={colors}
            buttonTitle="解析"
            icon="sparkles"
            loading={isParsing}
            disabled={isParsing}
          />
        </View>

        {isParsing ? (
          <View style={[gs.center, gs.mt30]}>
            <ActivityIndicator size="small" color={colors.accentGreen} />
            <PrimaryText size={12} color={colors.secondaryText} style={gs.mt8}>
              正在解析...
            </PrimaryText>
          </View>
        ) : null}

        {validatedItems.length > 0 ? (
          <View style={gs.mt20}>
            <View style={[gs.rowBetweenCenter, gs.mb10]}>
              <PrimaryText size={14} weight="semibold">
                待确认账单
              </PrimaryText>
              <PrimaryText size={12} color={colors.secondaryText}>
                可创建 {validItems.length} / {validatedItems.length}
              </PrimaryText>
            </View>

            {validatedItems.map((item, index) => {
              const selectedCategory = getCategoryById(item.categoryId);

              return (
                <View
                  key={item.localId}
                  style={[gs.rounded12, gs.p14, gs.mb10, {backgroundColor: colors.containerColor}]}>
                  <View style={[gs.rowBetweenCenter, gs.mb10]}>
                    <PrimaryText size={13} weight="semibold">
                      第 {index + 1} 条
                    </PrimaryText>
                    <TouchableOpacity onPress={() => removeItem(item.localId)} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                      <Icon name="trash-2" size={18} color={colors.accentOrange} />
                    </TouchableOpacity>
                  </View>

                  <PrimaryText size={11} color={colors.secondaryText} style={gs.mb5}>
                    标题
                  </PrimaryText>
                  <TextInput
                    value={item.title}
                    onChangeText={value => updateItem(item.localId, {title: value})}
                    placeholder="消费标题"
                    placeholderTextColor={colors.secondaryText}
                    style={[gs.h45, gs.rounded10, gs.px12, gs.fontMedium, {color: colors.primaryText, backgroundColor: colors.secondaryAccent}]}
                  />

                  <View style={[gs.row, gs.gap8, gs.mt10]}>
                    <View style={gs.flex1}>
                      <PrimaryText size={11} color={colors.secondaryText} style={gs.mb5}>
                        金额
                      </PrimaryText>
                      <View style={[gs.h45, gs.rounded10, gs.rowCenter, gs.px12, {backgroundColor: colors.secondaryAccent}]}>
                        <PrimaryText size={13} color={colors.secondaryText} variant="number">
                          {currencySymbol}
                        </PrimaryText>
                        <TextInput
                          value={item.amountText}
                          onChangeText={value => updateItem(item.localId, {amountText: value})}
                          placeholder="0"
                          placeholderTextColor={colors.secondaryText}
                          keyboardType="numeric"
                          style={[gs.flex1, gs.ml8, gs.fontMedium, {color: colors.primaryText}]}
                        />
                      </View>
                    </View>
                  </View>

                  <View style={gs.mt10}>
                    <DatePicker
                      createdAt={item.date}
                      showDatePicker={item.showDatePicker}
                      setShowDatePicker={value => updateItem(item.localId, {showDatePicker: value})}
                      setCreatedAt={value => updateItem(item.localId, {date: value})}
                      label="日期"
                    />
                  </View>

                  <PrimaryText size={11} color={colors.secondaryText} style={gs.mb8}>
                    分类
                  </PrimaryText>
                  <CategoryContainer
                    categories={categories}
                    colors={colors}
                    selectedCategories={selectedCategory ? [selectedCategory] : []}
                    toggleCategorySelection={category => updateItem(item.localId, {categoryId: category.id ?? null})}
                  />

                  <PrimaryText size={11} color={colors.secondaryText} style={[gs.mt8, gs.mb5]}>
                    备注
                  </PrimaryText>
                  <TextInput
                    value={item.description}
                    onChangeText={value => updateItem(item.localId, {description: value})}
                    placeholder="备注，可留空"
                    placeholderTextColor={colors.secondaryText}
                    style={[gs.h45, gs.rounded10, gs.px12, gs.fontMedium, {color: colors.primaryText, backgroundColor: colors.secondaryAccent}]}
                  />

                  {renderIssueList(item.issues)}
                </View>
              );
            })}

            <PrimaryButton
              onPress={handleCreate}
              colors={colors}
              buttonTitle="确认创建"
              loading={isCreating}
              disabled={isCreating || validItems.length === 0}
            />
          </View>
        ) : null}
      </ScrollView>
    </PrimaryView>
  );
};

export default AiQuickExpenseScreen;
