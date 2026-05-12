import type {CategoryData} from '../watermelondb/services';
import {createExpense} from '../watermelondb/services';
import {ensureYearInCache} from '../utils/availableYearsCache';
import {formatDate, getISODateTime} from '../utils/dateUtils';
import {getAiSettings, getMissingAiSettingsFields} from './aiSettingsService';
import type {AiExpenseCandidate} from './aiExpenseParser';
import {
  buildAiExpensePrompt,
  parseNaturalLanguageExpenses,
  splitAiExpenseItems,
} from './aiExpenseParser';
import {
  getAiAutoExpenseTaskById,
  getNextAiAutoExpenseTask,
  saveAiLastAutoCreateBatch,
  updateAiAutoExpenseTask,
} from './aiAutoExpenseTaskService';
import type {
  AiAutoExpenseTask,
  AiAutoExpenseTaskResultItem,
  AiAutoExpenseTaskStatus,
} from './aiAutoExpenseTaskService';

interface ProcessAiAutoExpenseQueueParams {
  userId: string;
  categories: CategoryData[];
  onTaskFinished?: (task: AiAutoExpenseTask) => Promise<void> | void;
}

export interface AiAutoExpenseRunResult {
  createdCount: number;
  skippedCount: number;
  expenseIds: string[];
}

let isProcessingQueue = false;

export const isAiAutoExpenseQueueProcessing = (): boolean => isProcessingQueue;

const buildPromptForTask = (input: string, categories: CategoryData[], currentDateTime: string): string =>
  buildAiExpensePrompt(
    input,
    categories.filter(category => category.categoryStatus).map(category => category.name),
    currentDateTime,
  );

const getTaskReferenceDateTime = (task: AiAutoExpenseTask, fallbackDateTime: string): string => {
  if (task.referenceDateTime) {
    return task.referenceDateTime;
  }

  const createdAtDateTime = formatDate(task.createdAt, 'YYYY-MM-DDTHH:mm:ss');
  return createdAtDateTime === 'Invalid Date' ? fallbackDateTime : createdAtDateTime;
};

const getItemIssues = (item: AiExpenseCandidate): string[] =>
  item.issues.length > 0 ? item.issues.map(issue => issue.message) : [];

const toSkippedResultItem = (item: AiExpenseCandidate, issues: string[] = getItemIssues(item)): AiAutoExpenseTaskResultItem => ({
  localId: item.localId,
  title: item.title,
  amount: item.amount,
  categoryName: item.categoryName || item.categoryHint,
  categoryId: item.categoryId,
  date: item.date,
  status: 'skipped',
  issues: issues.length > 0 ? issues : ['未能创建账单'],
});

const runSingleTask = async ({
  task,
  userId,
  categories,
}: {
  task: AiAutoExpenseTask;
  userId: string;
  categories: CategoryData[];
}): Promise<AiAutoExpenseRunResult | null> => {
  const executionDateTime = getISODateTime();
  const referenceDateTime = getTaskReferenceDateTime(task, executionDateTime);
  const promptText = task.promptText || buildPromptForTask(task.input, categories, referenceDateTime);
  updateAiAutoExpenseTask(task.taskId, {
    status: 'running',
    startedAt: task.startedAt ?? executionDateTime,
    promptText,
    referenceDateTime,
    errorMessage: undefined,
  });

  try {
    const settings = getAiSettings();
    const missingFields = getMissingAiSettingsFields(settings);
    if (missingFields.length > 0) {
      throw new Error(`请先在设置中填写：${missingFields.join('、')}`);
    }

    const parsed = await parseNaturalLanguageExpenses({
      input: task.input,
      settings,
      categories,
      currentDateTime: referenceDateTime,
    });
    const {validItems, invalidItems} = splitAiExpenseItems(parsed.items);
    const expenseIds: string[] = [];
    let skippedCount = invalidItems.length;
    const resultItems: AiAutoExpenseTaskResultItem[] = invalidItems.map(item => toSkippedResultItem(item));

    for (const item of validItems) {
      try {
        const expenseId = await createExpense(
          userId,
          item.title,
          item.amount ?? 0,
          item.description,
          item.categoryId ?? '',
          item.date,
        );
        expenseIds.push(expenseId);
        resultItems.push({
          localId: item.localId,
          title: item.title,
          amount: item.amount,
          categoryName: item.categoryName || item.categoryHint,
          categoryId: item.categoryId,
          date: item.date,
          status: 'created',
          expenseId,
          issues: getItemIssues(item),
        });

        const year = Number.parseInt(formatDate(item.date, 'YYYY'), 10);
        if (!Number.isNaN(year)) {
          ensureYearInCache(year);
        }
      } catch {
        skippedCount += 1;
        resultItems.push(toSkippedResultItem(item, ['创建账单失败']));
      }
    }

    if (expenseIds.length > 0) {
      saveAiLastAutoCreateBatch({
        taskId: task.taskId,
        input: task.input,
        expenseIds,
      });
    }

    const status: AiAutoExpenseTaskStatus = expenseIds.length === 0 && skippedCount > 0
      ? 'failed'
      : skippedCount > 0
      ? 'partial_failed'
      : 'created';
    const errorMessage = skippedCount > 0
      ? expenseIds.length === 0
        ? `未添加账单，${skippedCount} 条需要修正`
        : `已添加 ${expenseIds.length} 条，跳过 ${skippedCount} 条`
      : undefined;

    updateAiAutoExpenseTask(task.taskId, {
      status,
      finishedAt: getISODateTime(),
      createdCount: expenseIds.length,
      skippedCount,
      expenseIds,
      resultItems,
      errorMessage,
    });

    return {
      createdCount: expenseIds.length,
      skippedCount,
      expenseIds,
    };
  } catch (error) {
    updateAiAutoExpenseTask(task.taskId, {
      status: 'failed',
      finishedAt: getISODateTime(),
      errorMessage: error instanceof Error ? error.message : '解析失败，请重试',
    });
    return null;
  }
};

export const processAiAutoExpenseQueue = async ({
  userId,
  categories,
  onTaskFinished,
}: ProcessAiAutoExpenseQueueParams): Promise<void> => {
  if (isProcessingQueue) {
    return;
  }

  if (!userId.trim()) {
    return;
  }

  if (!categories.some(category => category.categoryStatus)) {
    return;
  }

  isProcessingQueue = true;
  try {
    let nextTask = getNextAiAutoExpenseTask();
    while (nextTask) {
      await runSingleTask({task: nextTask, userId, categories});
      const finishedTask = getAiAutoExpenseTaskById(nextTask.taskId) ?? nextTask;
      await onTaskFinished?.(finishedTask);
      nextTask = getNextAiAutoExpenseTask();
    }
  } finally {
    isProcessingQueue = false;
  }
};
