import type {CategoryData} from '../watermelondb/services';
import {createExpense, createIncome} from '../watermelondb/services';
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
  AiCreatedRecord,
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
  records: AiCreatedRecord[];
}

let isProcessingQueue = false;

export const isAiAutoExpenseQueueProcessing = (): boolean => isProcessingQueue;

const buildPromptForTask = (input: string, categories: CategoryData[], currentDateTime: string): string =>
  buildAiExpensePrompt(
    input,
    {
      expenseCategoryNames: categories
        .filter(category => category.categoryStatus && category.kind === 'expense' && !!category.parentId)
        .map(category => category.parent?.name ? `${category.parent.name}·${category.name}` : category.name),
      incomeCategoryNames: categories
        .filter(category => category.categoryStatus && category.kind === 'income' && !category.parentId)
        .map(category => category.name),
    },
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
  type: item.type,
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
    const records: AiCreatedRecord[] = [];
    let skippedCount = invalidItems.length;
    const resultItems: AiAutoExpenseTaskResultItem[] = invalidItems.map(item => toSkippedResultItem(item));

    for (const item of validItems) {
      try {
        const recordId = item.type === 'income'
          ? await createIncome(userId, item.title, item.amount ?? 0, item.categoryId ?? '', item.date)
          : await createExpense(userId, item.title, item.amount ?? 0, item.categoryId ?? '', item.date);
        const record: AiCreatedRecord = {type: item.type, id: recordId};
        records.push(record);
        if (item.type === 'expense') {
          expenseIds.push(recordId);
        }
        resultItems.push({
          localId: item.localId,
          type: item.type,
          title: item.title,
          amount: item.amount,
          categoryName: item.categoryName || item.categoryHint,
          categoryId: item.categoryId,
          date: item.date,
          status: 'created',
          expenseId: item.type === 'expense' ? recordId : undefined,
          recordId,
          issues: getItemIssues(item),
        });

        const year = Number.parseInt(formatDate(item.date, 'YYYY'), 10);
        if (!Number.isNaN(year)) {
          ensureYearInCache(year, userId);
        }
      } catch {
        skippedCount += 1;
        resultItems.push(toSkippedResultItem(item, ['创建账单失败']));
      }
    }

    if (records.length > 0) {
      saveAiLastAutoCreateBatch({
        taskId: task.taskId,
        input: task.input,
        expenseIds,
        records,
      });
    }

    const status: AiAutoExpenseTaskStatus = records.length === 0 && skippedCount > 0
      ? 'failed'
      : skippedCount > 0
      ? 'partial_failed'
      : 'created';
    const errorMessage = skippedCount > 0
      ? records.length === 0
        ? `未添加账单，${skippedCount} 条需要修正`
        : `已添加 ${records.length} 条，跳过 ${skippedCount} 条`
      : undefined;

    updateAiAutoExpenseTask(task.taskId, {
      status,
      finishedAt: getISODateTime(),
      createdCount: records.length,
      skippedCount,
      expenseIds,
      recordIds: records.map(record => record.id),
      createdRecords: records,
      resultItems,
      errorMessage,
    });

    return {
      createdCount: records.length,
      skippedCount,
      expenseIds,
      records,
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
