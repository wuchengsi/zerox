import type {CategoryData} from '../watermelondb/services';
import {createExpense} from '../watermelondb/services';
import {ensureYearInCache} from '../utils/availableYearsCache';
import {formatDate, getISODateTime} from '../utils/dateUtils';
import {getAiSettings, getMissingAiSettingsFields} from './aiSettingsService';
import {buildAiExpensePrompt, parseNaturalLanguageExpenses, splitAiExpenseItems} from './aiExpenseParser';
import {
  AiAutoExpenseTask,
  getNextAiAutoExpenseTask,
  saveAiLastAutoCreateBatch,
  updateAiAutoExpenseTask,
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

const runSingleTask = async ({
  task,
  userId,
  categories,
}: {
  task: AiAutoExpenseTask;
  userId: string;
  categories: CategoryData[];
}): Promise<AiAutoExpenseRunResult | null> => {
  const currentDateTime = getISODateTime();
  const promptText = task.promptText || buildPromptForTask(task.input, categories, currentDateTime);
  updateAiAutoExpenseTask(task.taskId, {
    status: 'running',
    startedAt: task.startedAt ?? currentDateTime,
    promptText,
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
      currentDateTime,
    });
    const {validItems, invalidItems} = splitAiExpenseItems(parsed.items);
    const expenseIds: string[] = [];
    let skippedCount = invalidItems.length;

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

        const year = Number.parseInt(formatDate(item.date, 'YYYY'), 10);
        if (!Number.isNaN(year)) {
          ensureYearInCache(year);
        }
      } catch {
        skippedCount += 1;
      }
    }

    if (expenseIds.length > 0) {
      saveAiLastAutoCreateBatch({
        taskId: task.taskId,
        input: task.input,
        expenseIds,
      });
    }

    updateAiAutoExpenseTask(task.taskId, {
      status: skippedCount > 0 ? 'partial_failed' : 'created',
      finishedAt: getISODateTime(),
      createdCount: expenseIds.length,
      skippedCount,
      expenseIds,
      errorMessage: skippedCount > 0 ? `已添加 ${expenseIds.length} 条，跳过 ${skippedCount} 条` : undefined,
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

  isProcessingQueue = true;
  try {
    let nextTask = getNextAiAutoExpenseTask();
    while (nextTask) {
      await runSingleTask({task: nextTask, userId, categories});
      const finishedTask = nextTask;
      await onTaskFinished?.(finishedTask);
      nextTask = getNextAiAutoExpenseTask();
    }
  } finally {
    isProcessingQueue = false;
  }
};
