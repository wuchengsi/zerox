import {RouteProp, useRoute} from '@react-navigation/native';
import {Clipboard, Platform, ScrollView, TextInput, ToastAndroid, TouchableOpacity, View} from 'react-native';
import React, {useEffect, useMemo, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import AppHeader from '../../components/atoms/AppHeader';
import Icon from '../../components/atoms/Icons';
import PrimaryButton from '../../components/atoms/PrimaryButton';
import PrimaryText from '../../components/atoms/PrimaryText';
import PrimaryView from '../../components/atoms/PrimaryView';
import useThemeColors from '../../hooks/useThemeColors';
import {useDialog} from '../../context/DialogContext';
import {fetchCategories, selectCategoryData} from '../../redux/slice/categoryDataSlice';
import {fetchExpensesByMonth, invalidateExpenseCache} from '../../redux/slice/expenseDataSlice';
import {fetchIncomesByMonth, invalidateIncomeCache} from '../../redux/slice/incomeDataSlice';
import {selectMonthIndex, selectYear} from '../../redux/slice/monthSelectionSlice';
import {selectUserId} from '../../redux/slice/userIdSlice';
import {AppDispatch} from '../../redux/store';
import {buildAiExpensePrompt} from '../../services/aiExpenseParser';
import {getAiSettings, getMissingAiSettingsFields} from '../../services/aiSettingsService';
import {
  AiAutoExpenseTask,
  createQueuedAiAutoExpenseTask,
  getAiAutoExpenseTaskById,
  subscribeAiAutoExpenseTasks,
} from '../../services/aiAutoExpenseTaskService';
import {processAiAutoExpenseQueue} from '../../services/aiAutoExpenseRunner';
import {formatDate, getISODateTime, getMonthNames, getMonthNumber} from '../../utils/dateUtils';
import {goBack, navigate} from '../../utils/navigationUtils';
import {gs} from '../../styles/globalStyles';

type AiExpenseQueueDetailRouteProp = RouteProp<
  {
    AiExpenseQueueDetailScreen: {
      taskId: string;
    };
  },
  'AiExpenseQueueDetailScreen'
>;

const MONTHS = getMonthNames();

const getStatusText = (task: AiAutoExpenseTask): string => {
  switch (task.status) {
    case 'queued':
      return '等待中';
    case 'running':
      return '处理中';
    case 'created':
      return `已添加 ${task.createdCount ?? 0} 条`;
    case 'partial_failed':
      return `已添加 ${task.createdCount ?? 0} 条，跳过 ${task.skippedCount ?? 0} 条`;
    case 'failed':
      return '失败';
    default:
      return '';
  }
};

const isRetryableTask = (task: AiAutoExpenseTask): boolean =>
  task.status === 'failed' || task.status === 'partial_failed';

const AiExpenseQueueDetailScreen = () => {
  const colors = useThemeColors();
  const {showAlert, showDialog} = useDialog();
  const dispatch = useDispatch<AppDispatch>();
  const route = useRoute<AiExpenseQueueDetailRouteProp>();
  const userId = useSelector(selectUserId);
  const categories = useSelector(selectCategoryData);
  const selectedYear = useSelector(selectYear);
  const selectedMonthIndex = useSelector(selectMonthIndex);
  const [task, setTask] = useState<AiAutoExpenseTask | null>(() => getAiAutoExpenseTaskById(route.params.taskId));
  const [retryInput, setRetryInput] = useState(task?.input ?? '');

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  useEffect(
    () =>
      subscribeAiAutoExpenseTasks(() => {
        const nextTask = getAiAutoExpenseTaskById(route.params.taskId);
        setTask(nextTask);
        if (nextTask && !isRetryableTask(nextTask)) {
          setRetryInput(nextTask.input);
        }
      }),
    [route.params.taskId],
  );

  const currentYearMonth = useMemo(
    () => `${selectedYear}-${getMonthNumber(MONTHS[selectedMonthIndex])}`,
    [selectedMonthIndex, selectedYear],
  );

  const refreshCurrentMonth = async () => {
    dispatch(invalidateExpenseCache());
    dispatch(invalidateIncomeCache());
    await Promise.all([
      dispatch(fetchExpensesByMonth(currentYearMonth)),
      dispatch(fetchIncomesByMonth(currentYearMonth)),
    ]);
  };

  const handleRetry = async () => {
    const settings = getAiSettings();
    const missingFields = getMissingAiSettingsFields(settings);
    if (missingFields.length > 0) {
      await showAlert({
        type: 'warning',
        message: `请先在设置中填写：${missingFields.join('、')}`,
        okLabel: '知道了',
      });
      navigate('AiSettingsScreen');
      return;
    }

    const trimmedInput = retryInput.trim();
    if (!trimmedInput) {
      await showAlert({
        type: 'warning',
        message: '请输入要重新解析的消费记录',
        okLabel: '知道了',
      });
      return;
    }

    const loadedCategories = categories.length > 0
      ? categories
      : await dispatch(fetchCategories()).unwrap();
    const referenceDateTime = getISODateTime();
    const promptText = buildAiExpensePrompt(
      trimmedInput,
      {
        expenseCategoryNames: loadedCategories
          .filter(category => category.categoryStatus && category.kind === 'expense' && !!category.parentId)
          .map(category => category.parent?.name ? `${category.parent.name}·${category.name}` : category.name),
        incomeCategoryNames: loadedCategories
          .filter(category => category.categoryStatus && category.kind === 'income' && !category.parentId)
          .map(category => category.name),
      },
      referenceDateTime,
    );
    createQueuedAiAutoExpenseTask(trimmedInput, promptText, referenceDateTime);
    void processAiAutoExpenseQueue({
      userId,
      categories: loadedCategories,
      onTaskFinished: refreshCurrentMonth,
    });
    await showAlert({
      type: 'success',
      message: '已加入处理队列',
      okLabel: '知道了',
    });
    goBack();
  };

  const handleCopyInput = async (value: string) => {
    const confirmed = await showDialog({
      type: 'warning',
      message: '复制原始输入？',
      okLabel: '复制',
      cancelLabel: '取消',
    });

    if (confirmed === false) {
      return;
    }

    Clipboard.setString(value);
    if (Platform.OS === 'android') {
      ToastAndroid.show('已复制', ToastAndroid.SHORT);
      return;
    }

    await showAlert({
      type: 'success',
      message: '已复制',
      okLabel: '知道了',
    });
  };

  if (!task) {
    return (
      <PrimaryView colors={colors}>
        <View style={[gs.mb20, gs.mt20]}>
          <AppHeader onPress={goBack} colors={colors} text="解析详情" />
        </View>
        <View style={[gs.center, gs.mt30]}>
          <PrimaryText size={13} color={colors.secondaryText}>
            记录不存在
          </PrimaryText>
        </View>
      </PrimaryView>
    );
  }

  const canRetry = isRetryableTask(task);
  const hasResultItems = (task.resultItems?.length ?? 0) > 0;

  return (
    <PrimaryView colors={colors} dismissKeyboardOnTouch>
      <View style={[gs.mb20, gs.mt20]}>
        <AppHeader onPress={goBack} colors={colors} text="解析详情" subtitle={getStatusText(task)} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={gs.pb80}>
        <View style={[gs.rounded12, gs.p14, gs.mb10, {backgroundColor: colors.containerColor}]}>
          <PrimaryText size={13} weight="semibold" style={gs.mb8}>
            结果
          </PrimaryText>
          <PrimaryText size={12} color={colors.secondaryText} style={gs.mb5}>
            状态：{getStatusText(task)}
          </PrimaryText>
          <PrimaryText size={12} color={colors.secondaryText} style={gs.mb5}>
            时间：{formatDate(task.createdAt, 'YYYY年M月D日 HH:mm')}
          </PrimaryText>
          {task.referenceDateTime ? (
            <PrimaryText size={12} color={colors.secondaryText} style={gs.mb5}>
              日期基准：{formatDate(task.referenceDateTime, 'YYYY年M月D日 HH:mm')}
            </PrimaryText>
          ) : null}
          {task.errorMessage ? (
            <PrimaryText
              size={12}
              color={canRetry ? colors.accentRed : colors.secondaryText}
              style={{lineHeight: 18}}>
              {task.errorMessage}
            </PrimaryText>
          ) : null}
        </View>

        {hasResultItems ? (
          <View style={[gs.rounded12, gs.p14, gs.mb10, {backgroundColor: colors.containerColor}]}>
            <PrimaryText size={13} weight="semibold" style={gs.mb8}>
              解析明细
            </PrimaryText>
            {task.resultItems?.map(item => {
              const isCreated = item.status === 'created';
              return (
                <View
                  key={item.localId}
                  style={[
                    gs.py8,
                    gs.borderBottom1,
                    {borderBottomColor: colors.secondaryAccent},
                  ]}>
                  <View style={gs.rowBetweenCenter}>
                    <PrimaryText size={12} weight="semibold" style={gs.flex1} numberOfLines={1}>
                      {item.title || '未识别标题'}
                    </PrimaryText>
                    <PrimaryText size={12} color={isCreated ? colors.accentGreen : colors.accentRed}>
                      {isCreated ? '已添加' : '已跳过'}
                    </PrimaryText>
                  </View>
                  <PrimaryText size={11} color={colors.secondaryText} style={gs.mt4}>
                    类型：{item.type === 'income' ? '收入' : '支出'} · 金额：{item.amount ?? '未识别'} · 分类：{item.categoryName || '未识别'}
                  </PrimaryText>
                  {!isCreated && item.issues.length > 0 ? (
                    <PrimaryText size={11} color={colors.accentRed} style={[gs.mt4, {lineHeight: 16}]}>
                      原因：{item.issues.join('、')}
                    </PrimaryText>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

        <View style={[gs.rowBetweenCenter, gs.mb5]}>
          <PrimaryText size={12} color={colors.secondaryText}>
            原始输入
          </PrimaryText>
          <TouchableOpacity
            onPress={() => handleCopyInput(canRetry ? retryInput : task.input)}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            accessibilityRole="button"
            accessibilityLabel="复制原始输入">
            <Icon name="copy" size={16} color={colors.secondaryText} />
          </TouchableOpacity>
        </View>
        {canRetry ? (
          <TextInput
            value={retryInput}
            onChangeText={setRetryInput}
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
                height: 150,
                color: colors.primaryText,
                backgroundColor: colors.secondaryAccent,
              },
            ]}
          />
        ) : (
          <TouchableOpacity
            onPress={() => handleCopyInput(task.input)}
            activeOpacity={0.75}
            style={[gs.rounded12, gs.px14, gs.py12, {minHeight: 150, backgroundColor: colors.secondaryAccent}]}
            accessibilityRole="button">
            <PrimaryText size={13} style={{lineHeight: 20}}>
              {task.input}
            </PrimaryText>
          </TouchableOpacity>
        )}

        {canRetry ? (
          <View style={gs.mt15}>
            <PrimaryButton onPress={handleRetry} colors={colors} buttonTitle="重新解析" icon="refresh-cw" />
          </View>
        ) : null}
      </ScrollView>
    </PrimaryView>
  );
};

export default AiExpenseQueueDetailScreen;
