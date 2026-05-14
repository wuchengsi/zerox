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
  updateAiAutoExpenseTask,
} from '../../services/aiAutoExpenseTaskService';
import {processAiAutoExpenseQueue} from '../../services/aiAutoExpenseRunner';
import {formatDate, getISODateTime, getMonthNames, getMonthNumber} from '../../utils/dateUtils';
import {goBack, navigate} from '../../utils/navigationUtils';
import {gs} from '../../styles/globalStyles';
import {simplifyExpenseCategoryDisplayName} from '../../constants/defaultCategories';
import {useLanguage} from '../../context/LanguageContext';

type AiExpenseQueueDetailRouteProp = RouteProp<
  {
    AiExpenseQueueDetailScreen: {
      taskId: string;
    };
  },
  'AiExpenseQueueDetailScreen'
>;

const translateAiDetailMessage = (message: string, t: (key: string) => string): string => {
  if (!message) {
    return message;
  }

  if (message.startsWith('LLM 服务返回错误：')) {
    return `LLM service returned error: ${message.replace('LLM 服务返回错误：', '')}`;
  }

  if (message.startsWith('已使用默认分类“') && message.endsWith('”，请确认')) {
    const categoryName = message.replace('已使用默认分类“', '').replace('”，请确认', '');
    return `Used default category "${categoryName}". Please confirm`;
  }

  const messageMap: Record<string, string> = {
    '上次处理中断，已重新排队': t('上次处理中断，已重新排队'),
    未能创建账单: t('未能创建账单'),
    创建账单失败: t('创建账单失败'),
    '解析失败，请重试': t('解析失败请重试'),
    缺少标题: t('缺少标题'),
    缺少金额: t('缺少金额'),
    '金额必须大于 0': t('金额必须大于 0'),
    没有可用分类: t('没有可用分类'),
    '日期无效，已使用当前时间': t('日期无效，已使用当前时间'),
    'LLM 返回格式错误，请重试或调整输入': t('LLM 返回格式错误，请重试或调整输入'),
    'LLM 服务返回格式错误': t('LLM 服务返回格式错误'),
    'LLM 返回空结果': t('LLM 返回空结果'),
    '请求失败，请检查网络或接口地址': t('请求失败请检查网络或接口地址'),
    '解析结果格式错误，请重试或调整输入': t('解析结果格式错误，请重试或调整输入'),
    '没有识别到账单，请补充金额或内容': t('没有识别到账单请补充金额或内容'),
  };

  return messageMap[message] ?? message;
};

const getStatusText = (task: AiAutoExpenseTask, t: (key: string) => string, language: string): string => {
  switch (task.status) {
    case 'queued':
      return t('等待中');
    case 'running':
      return t('处理中');
    case 'created':
      return `${t('已添加')} ${task.createdCount ?? 0} ${t('条账单')}`;
    case 'partial_failed':
      return `${t('已添加')} ${task.createdCount ?? 0} ${t('条账单')}${language === 'en' ? ', ' : '，'}${t('已跳过')} ${task.skippedCount ?? 0} ${t('条账单')}`;
    case 'failed':
      return t('失败');
    default:
      return '';
  }
};

const isRetryableTask = (task: AiAutoExpenseTask): boolean =>
  task.status === 'failed' || task.status === 'partial_failed';

const shouldMarkFailureViewed = (task: AiAutoExpenseTask): boolean =>
  isRetryableTask(task) && !task.failureViewedAt;

const AiExpenseQueueDetailScreen = () => {
  const colors = useThemeColors();
  const {showAlert, showDialog} = useDialog();
  const {language, t} = useLanguage();
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

  useEffect(() => {
    if (!task || !shouldMarkFailureViewed(task)) {
      return;
    }

    updateAiAutoExpenseTask(task.taskId, {failureViewedAt: new Date().toISOString()});
  }, [task]);

  const currentYearMonth = useMemo(
    () => `${selectedYear}-${getMonthNumber(getMonthNames()[selectedMonthIndex])}`,
    [selectedMonthIndex, selectedYear],
  );
  const detailDateFormat = language === 'en' ? 'MMM D, YYYY HH:mm' : 'YYYY年M月D日 HH:mm';
  const labelSeparator = language === 'en' ? ': ' : '：';

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
        message: `${t('请先在设置中填写：')}${missingFields.join('、')}`,
        okLabel: t('知道了'),
      });
      navigate('AiSettingsScreen');
      return;
    }

    const trimmedInput = retryInput.trim();
    if (!trimmedInput) {
      await showAlert({
        type: 'warning',
        message: t('请输入要重新解析的消费记录'),
        okLabel: t('知道了'),
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
      message: t('已加入处理队列'),
      okLabel: t('知道了'),
    });
    goBack();
  };

  const handleCopyInput = async (value: string) => {
    const confirmed = await showDialog({
      type: 'warning',
      message: t('复制原始输入？'),
      okLabel: t('复制'),
      cancelLabel: t('取消'),
    });

    if (confirmed === false) {
      return;
    }

    Clipboard.setString(value);
    if (Platform.OS === 'android') {
      ToastAndroid.show(t('已复制'), ToastAndroid.SHORT);
      return;
    }

    await showAlert({
      type: 'success',
      message: t('已复制'),
      okLabel: t('知道了'),
    });
  };

  if (!task) {
    return (
      <PrimaryView colors={colors}>
        <View style={[gs.mb20, gs.mt20]}>
          <AppHeader onPress={goBack} colors={colors} text={t('解析详情')} />
        </View>
        <View style={[gs.center, gs.mt30]}>
          <PrimaryText size={13} color={colors.secondaryText}>
            {t('记录不存在')}
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
        <AppHeader onPress={goBack} colors={colors} text={t('解析详情')} subtitle={getStatusText(task, t, language)} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={gs.pb80}>
        <View style={[gs.rounded12, gs.p14, gs.mb10, {backgroundColor: colors.containerColor}]}>
          <PrimaryText size={13} weight="semibold" style={gs.mb8}>
            {t('结果')}
          </PrimaryText>
          <PrimaryText size={12} color={colors.secondaryText} style={gs.mb5}>
            {t('状态')}{labelSeparator}{getStatusText(task, t, language)}
          </PrimaryText>
          <PrimaryText size={12} color={colors.secondaryText} style={gs.mb5}>
            {t('时间')}{labelSeparator}{formatDate(task.createdAt, detailDateFormat)}
          </PrimaryText>
          {task.referenceDateTime ? (
            <PrimaryText size={12} color={colors.secondaryText} style={gs.mb5}>
              {t('日期基准')}{labelSeparator}{formatDate(task.referenceDateTime, detailDateFormat)}
            </PrimaryText>
          ) : null}
          {task.errorMessage ? (
            <PrimaryText
              size={12}
              color={canRetry ? colors.accentRed : colors.secondaryText}
              style={{lineHeight: 18}}>
              {translateAiDetailMessage(task.errorMessage, t)}
            </PrimaryText>
          ) : null}
        </View>

        {hasResultItems ? (
          <View style={[gs.rounded12, gs.p14, gs.mb10, {backgroundColor: colors.containerColor}]}>
            <PrimaryText size={13} weight="semibold" style={gs.mb8}>
              {t('解析明细')}
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
                      {item.title || t('未识别标题')}
                    </PrimaryText>
                    <PrimaryText size={12} color={isCreated ? colors.accentGreen : colors.accentRed}>
                      {isCreated ? t('已添加') : t('已跳过')}
                    </PrimaryText>
                  </View>
                  <PrimaryText size={11} color={colors.secondaryText} style={gs.mt4}>
                    {t('类型')}{labelSeparator}{item.type === 'income' ? t('收入') : t('支出')} · {t('金额')}{labelSeparator}{item.amount ?? t('未识别')} · {t('分类')}{labelSeparator}{simplifyExpenseCategoryDisplayName(item.categoryName) || t('未识别')}
                  </PrimaryText>
                  {!isCreated && item.issues.length > 0 ? (
                    <PrimaryText size={11} color={colors.accentRed} style={[gs.mt4, {lineHeight: 16}]}>
                      {t('原因')}{labelSeparator}{item.issues.map(issue => translateAiDetailMessage(issue, t)).join(language === 'en' ? ', ' : '、')}
                    </PrimaryText>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

        <View style={[gs.rowBetweenCenter, gs.mb5]}>
          <PrimaryText size={12} color={colors.secondaryText}>
            {t('原始输入')}
          </PrimaryText>
          <TouchableOpacity
            onPress={() => handleCopyInput(canRetry ? retryInput : task.input)}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            accessibilityRole="button"
            accessibilityLabel={t('复制原始输入？')}>
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
            <PrimaryButton onPress={handleRetry} colors={colors} buttonTitle={t('重新解析')} icon="refresh-cw" />
          </View>
        ) : null}
      </ScrollView>
    </PrimaryView>
  );
};

export default AiExpenseQueueDetailScreen;
