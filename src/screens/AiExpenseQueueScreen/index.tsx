import {ActivityIndicator, ScrollView, TouchableOpacity, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import AppHeader from '../../components/atoms/AppHeader';
import Icon from '../../components/atoms/Icons';
import PrimaryText from '../../components/atoms/PrimaryText';
import PrimaryView from '../../components/atoms/PrimaryView';
import useThemeColors from '../../hooks/useThemeColors';
import {
  AiAutoExpenseTask,
  getAiAutoExpenseTasks,
  subscribeAiAutoExpenseTasks,
} from '../../services/aiAutoExpenseTaskService';
import {formatDate} from '../../utils/dateUtils';
import {goBack, navigate} from '../../utils/navigationUtils';
import {gs} from '../../styles/globalStyles';

const getStatusLabel = (task: AiAutoExpenseTask): string => {
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

const getSummary = (input: string): string => {
  const firstLine = input.split(/\r?\n/).map(line => line.trim()).find(Boolean) ?? input.trim();
  return firstLine.length > 42 ? `${firstLine.slice(0, 42)}...` : firstLine;
};

const AiExpenseQueueScreen = () => {
  const colors = useThemeColors();
  const [tasks, setTasks] = useState<AiAutoExpenseTask[]>(getAiAutoExpenseTasks());
  const [processingDotCount, setProcessingDotCount] = useState(1);

  useEffect(() => subscribeAiAutoExpenseTasks(setTasks), []);

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

  const activeCount = tasks.filter(task => task.status === 'queued' || task.status === 'running').length;

  return (
    <PrimaryView colors={colors}>
      <View style={[gs.mb20, gs.mt20]}>
        <AppHeader
          onPress={goBack}
          colors={colors}
          text="AI 处理队列"
          subtitle={activeCount > 0 ? `队列处理中${'.'.repeat(processingDotCount)}` : '当前没有正在处理的队列'}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={gs.pb80}>
        {tasks.length === 0 ? (
          <View style={[gs.center, gs.mt30]}>
            <PrimaryText size={13} color={colors.secondaryText}>
              暂无解析记录
            </PrimaryText>
          </View>
        ) : (
          tasks.map(task => {
            const isRunning = task.status === 'running';
            const isFailed = task.status === 'failed';
            return (
              <TouchableOpacity
                key={task.taskId}
                onPress={() => navigate('AiExpenseQueueDetailScreen', {taskId: task.taskId})}
                activeOpacity={0.75}
                style={[
                  gs.rounded12,
                  gs.p14,
                  gs.mb10,
                  isRunning && gs.border1,
                  {backgroundColor: colors.containerColor, borderColor: isRunning ? colors.accentGreen : 'transparent'},
                ]}
                accessibilityRole="button">
                <View style={gs.rowBetweenCenter}>
                  <View style={gs.flex1}>
                    <View style={[gs.row, gs.itemsCenter, gs.mb5]}>
                      {isRunning ? <ActivityIndicator size="small" color={colors.accentGreen} /> : null}
                      <PrimaryText
                        size={12}
                        weight="semibold"
                        color={isFailed ? colors.accentRed : colors.primaryText}
                        style={isRunning ? gs.ml8 : undefined}>
                        {isRunning ? `处理中${'.'.repeat(processingDotCount)}` : getStatusLabel(task)}
                      </PrimaryText>
                    </View>
                    <PrimaryText size={13} numberOfLines={2}>
                      {getSummary(task.input)}
                    </PrimaryText>
                    <PrimaryText size={11} color={colors.secondaryText} style={gs.mt5}>
                      {formatDate(task.createdAt, 'YYYY年M月D日 HH:mm')}
                    </PrimaryText>
                    {task.errorMessage ? (
                      <PrimaryText size={11} color={isFailed ? colors.accentRed : colors.secondaryText} style={gs.mt5} numberOfLines={2}>
                        {task.errorMessage}
                      </PrimaryText>
                    ) : null}
                  </View>
                  <Icon name="chevron-right" size={20} color={colors.secondaryText} />
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </PrimaryView>
  );
};

export default AiExpenseQueueScreen;
