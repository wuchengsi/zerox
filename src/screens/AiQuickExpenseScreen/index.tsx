import {ActivityIndicator, ScrollView, TextInput, TouchableOpacity, View} from 'react-native';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import AppHeader from '../../components/atoms/AppHeader';
import Icon from '../../components/atoms/Icons';
import PrimaryButton from '../../components/atoms/PrimaryButton';
import PrimaryText from '../../components/atoms/PrimaryText';
import PrimaryView from '../../components/atoms/PrimaryView';
import useThemeColors from '../../hooks/useThemeColors';
import {useDialog} from '../../context/DialogContext';
import {fetchCategories, selectActiveCategories} from '../../redux/slice/categoryDataSlice';
import {fetchExpensesByMonth, invalidateExpenseCache} from '../../redux/slice/expenseDataSlice';
import {selectMonthIndex, selectYear} from '../../redux/slice/monthSelectionSlice';
import {selectUserId} from '../../redux/slice/userIdSlice';
import {AppDispatch} from '../../redux/store';
import {buildAiExpensePrompt} from '../../services/aiExpenseParser';
import {getAiSettings, getMissingAiSettingsFields} from '../../services/aiSettingsService';
import {
  AiAutoExpenseTask,
  clearAiAutoExpenseInput,
  createQueuedAiAutoExpenseTask,
  getAiAutoExpenseInput,
  getAiAutoExpenseTasks,
  saveAiAutoExpenseInput,
  subscribeAiAutoExpenseInput,
  subscribeAiAutoExpenseTasks,
} from '../../services/aiAutoExpenseTaskService';
import {processAiAutoExpenseQueue} from '../../services/aiAutoExpenseRunner';
import {getISODateTime, getMonthNames, getMonthNumber} from '../../utils/dateUtils';
import {goBack, navigate} from '../../utils/navigationUtils';
import {gs} from '../../styles/globalStyles';

const MONTHS = getMonthNames();

const AiQuickExpenseScreen = () => {
  const colors = useThemeColors();
  const {showAlert} = useDialog();
  const dispatch = useDispatch<AppDispatch>();
  const userId = useSelector(selectUserId);
  const categories = useSelector(selectActiveCategories);
  const selectedYear = useSelector(selectYear);
  const selectedMonthIndex = useSelector(selectMonthIndex);
  const [input, setInput] = useState(getAiAutoExpenseInput());
  const [tasks, setTasks] = useState<AiAutoExpenseTask[]>(getAiAutoExpenseTasks());
  const [processingDotCount, setProcessingDotCount] = useState(1);

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  useEffect(() => subscribeAiAutoExpenseTasks(setTasks), []);
  useEffect(() => subscribeAiAutoExpenseInput(setInput), []);

  useEffect(() => {
    if (!tasks.some(task => task.status === 'running')) {
      setProcessingDotCount(1);
      return undefined;
    }

    const timer = setInterval(() => {
      setProcessingDotCount(prev => (prev >= 3 ? 1 : prev + 1));
    }, 500);

    return () => clearInterval(timer);
  }, [tasks]);

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

  const activeCount = tasks.filter(task => task.status === 'queued' || task.status === 'running').length;
  const failedCount = tasks.filter(task => task.status === 'failed').length;
  const runningCount = tasks.filter(task => task.status === 'running').length;
  const queueSubtitle =
    runningCount > 0
      ? `正在后台处理${'.'.repeat(processingDotCount)} 等待 ${Math.max(activeCount - runningCount, 0)} 条`
      : activeCount > 0
      ? `等待处理 ${activeCount} 条`
      : '当前没有正在处理的队列';

  const refreshCurrentMonth = useCallback(async () => {
    dispatch(invalidateExpenseCache());
    await dispatch(fetchExpensesByMonth(currentYearMonth));
  }, [currentYearMonth, dispatch]);

  const handleOpenSettings = useCallback(() => {
    navigate('AiSettingsScreen');
  }, []);

  const handleOpenQueue = useCallback(() => {
    navigate('AiExpenseQueueScreen');
  }, []);

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
    saveAiAutoExpenseInput(value);
  }, []);

  const handleAutoCreate = useCallback(async () => {
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

    const trimmedInput = input.trim();
    if (!trimmedInput) {
      await showAlert({
        type: 'warning',
        message: '请输入要自动记账的消费记录',
        okLabel: '知道了',
      });
      return;
    }

    const loadedCategories = categories.length > 0
      ? categories
      : (await dispatch(fetchCategories()).unwrap()).filter(
          category => category.categoryStatus && category.kind === 'expense' && !!category.parentId,
        );
    const referenceDateTime = getISODateTime();
    const promptText = buildAiExpensePrompt(
      trimmedInput,
      loadedCategories
        .filter(category => category.categoryStatus)
        .map(category => category.parent?.name ? `${category.parent.name}·${category.name}` : category.name),
      referenceDateTime,
    );
    createQueuedAiAutoExpenseTask(trimmedInput, promptText, referenceDateTime);
    clearAiAutoExpenseInput();
    void processAiAutoExpenseQueue({
      userId,
      categories: loadedCategories,
      onTaskFinished: refreshCurrentMonth,
    });
  }, [categories, dispatch, handleOpenSettings, input, refreshCurrentMonth, showAlert, userId]);

  return (
    <PrimaryView colors={colors} dismissKeyboardOnTouch>
      <View style={[gs.mb20, gs.mt20]}>
        <AppHeader
          onPress={goBack}
          colors={colors}
          text="AI 快速记账"
          subtitle="提交后进入后台队列，解析成功自动入账"
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={gs.pb80}>
        <PrimaryText size={12} color={colors.secondaryText} style={gs.mb5}>
          消费内容
        </PrimaryText>
        <TextInput
          value={input}
          onChangeText={handleInputChange}
          placeholder={'例如：\n昨天：\n午饭 28\n瑞幸 16\n地铁 4'}
          placeholderTextColor={colors.secondaryText}
          multiline
          scrollEnabled
          textAlignVertical="top"
          style={[
            gs.rounded12,
            gs.px14,
            gs.py12,
            gs.fontMedium,
            {
              height: 170,
              maxHeight: 170,
              color: colors.primaryText,
              backgroundColor: colors.secondaryAccent,
            },
          ]}
        />

        <View style={gs.mt15}>
          <PrimaryButton
            onPress={handleAutoCreate}
            colors={colors}
            buttonTitle="自动记账"
            icon="sparkles"
          />
        </View>

        <TouchableOpacity
          onPress={handleOpenQueue}
          activeOpacity={0.75}
          style={[gs.rounded12, gs.p14, gs.mt20, {backgroundColor: colors.containerColor}]}
          accessibilityRole="button">
          <View style={gs.rowBetweenCenter}>
            <View style={gs.flex1}>
              <View style={[gs.row, gs.itemsCenter, gs.mb5]}>
                {runningCount > 0 ? <ActivityIndicator size="small" color={colors.accentGreen} /> : null}
                <PrimaryText size={13} weight="semibold" style={runningCount > 0 ? gs.ml8 : undefined}>
                  AI 处理队列
                </PrimaryText>
              </View>
              <PrimaryText size={12} color={colors.secondaryText}>
                {queueSubtitle}
              </PrimaryText>
              {failedCount > 0 ? (
                <PrimaryText size={12} color={colors.accentRed} style={gs.mt5}>
                  有 {failedCount} 条解析失败
                </PrimaryText>
              ) : null}
            </View>
            <Icon name="chevron-right" size={20} color={colors.secondaryText} />
          </View>
        </TouchableOpacity>

        <View style={[gs.rounded12, gs.p14, gs.mt15, {backgroundColor: colors.containerColor}]}>
          <PrimaryText size={13} weight="semibold" style={gs.mb8}>
            说明
          </PrimaryText>
          <PrimaryText size={12} color={colors.secondaryText} style={{lineHeight: 18}}>
            提交后可继续录入下一条。队列会在后台顺序处理；失败记录可在队列详情中编辑后重新解析。
          </PrimaryText>
        </View>
      </ScrollView>
    </PrimaryView>
  );
};

export default AiQuickExpenseScreen;
