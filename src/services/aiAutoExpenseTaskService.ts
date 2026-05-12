import StorageService from '../utils/asyncStorageService';

export type AiAutoExpenseTaskStatus =
  | 'queued'
  | 'running'
  | 'created'
  | 'partial_failed'
  | 'failed';

export interface AiAutoExpenseTask {
  version: 1;
  taskId: string;
  status: AiAutoExpenseTaskStatus;
  input: string;
  promptText: string;
  referenceDateTime?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
  errorMessage?: string;
  skippedCount?: number;
  createdCount?: number;
  expenseIds?: string[];
  resultItems?: AiAutoExpenseTaskResultItem[];
}

export interface AiAutoExpenseTaskResultItem {
  localId: string;
  title: string;
  amount: number | null;
  categoryName: string;
  categoryId: string | null;
  date: string;
  status: 'created' | 'skipped';
  expenseId?: string;
  issues: string[];
}

export interface AiLastAutoCreateBatch {
  version: 1;
  batchId: string;
  taskId: string;
  input: string;
  createdAt: string;
  expenseIds: string[];
  createdCount: number;
}

const AI_AUTO_EXPENSE_TASKS_KEY = 'ai.autoExpenseTasks';
const AI_AUTO_EXPENSE_INPUT_KEY = 'ai.autoExpenseInput';
const AI_LAST_AUTO_CREATE_BATCH_KEY = 'ai.lastAutoCreateBatch';
const LEGACY_AI_AUTO_EXPENSE_TASK_KEY = 'ai.autoExpenseTask';
const MAX_FINISHED_TASKS = 5;

const createId = (prefix: string): string => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const now = (): string => new Date().toISOString();

const taskListeners = new Set<(tasks: AiAutoExpenseTask[]) => void>();
const inputListeners = new Set<(input: string) => void>();
const batchListeners = new Set<(batch: AiLastAutoCreateBatch | null) => void>();

const parseJson = <T>(raw: string | null): T | null => {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const sortTasks = (tasks: AiAutoExpenseTask[]): AiAutoExpenseTask[] =>
  [...tasks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

const pruneTasks = (tasks: AiAutoExpenseTask[]): AiAutoExpenseTask[] => {
  const active = sortTasks(tasks.filter(task => task.status === 'queued' || task.status === 'running'));
  const finished = sortTasks(tasks.filter(task => task.status !== 'queued' && task.status !== 'running')).slice(0, MAX_FINISHED_TASKS);
  return [...active, ...finished];
};

const emitTasks = () => {
  const tasks = getAiAutoExpenseTasks();
  taskListeners.forEach(listener => listener(tasks));
};

const emitInput = () => {
  const input = getAiAutoExpenseInput();
  inputListeners.forEach(listener => listener(input));
};

const emitBatch = () => {
  const batch = getAiLastAutoCreateBatch();
  batchListeners.forEach(listener => listener(batch));
};

const readStoredTasks = (): AiAutoExpenseTask[] | null => {
  const stored = parseJson<AiAutoExpenseTask[]>(StorageService.getItemSync(AI_AUTO_EXPENSE_TASKS_KEY));
  if (stored) {
    return stored;
  }

  const legacy = parseJson<any>(StorageService.getItemSync(LEGACY_AI_AUTO_EXPENSE_TASK_KEY));
  if (!legacy?.input) {
    return null;
  }

  const status: AiAutoExpenseTaskStatus =
    legacy.status === 'created' || legacy.status === 'partial_failed' || legacy.status === 'failed'
      ? legacy.status
      : 'queued';
  return [
    {
      version: 1,
      taskId: legacy.taskId ?? createId('ai-task'),
      status,
      input: legacy.input,
      promptText: '',
      referenceDateTime: legacy.referenceDateTime ?? legacy.createdAt ?? now(),
      createdAt: legacy.createdAt ?? now(),
      updatedAt: legacy.updatedAt ?? now(),
      startedAt: legacy.startedAt,
      finishedAt: legacy.finishedAt,
      errorMessage: legacy.errorMessage,
      skippedCount: legacy.skippedCount,
      createdCount: legacy.createdCount,
    },
  ];
};

export const getAiAutoExpenseTasks = (): AiAutoExpenseTask[] => sortTasks(readStoredTasks() ?? []);

export const getAiAutoExpenseTaskById = (taskId: string): AiAutoExpenseTask | null =>
  getAiAutoExpenseTasks().find(task => task.taskId === taskId) ?? null;

export const saveAiAutoExpenseTasks = (tasks: AiAutoExpenseTask[]): void => {
  StorageService.setItemSync(AI_AUTO_EXPENSE_TASKS_KEY, JSON.stringify(pruneTasks(tasks)));
  StorageService.removeItemSync(LEGACY_AI_AUTO_EXPENSE_TASK_KEY);
  emitTasks();
};

export const createQueuedAiAutoExpenseTask = (
  input: string,
  promptText: string,
  referenceDateTime?: string,
): AiAutoExpenseTask => {
  const timestamp = now();
  const task: AiAutoExpenseTask = {
    version: 1,
    taskId: createId('ai-task'),
    status: 'queued',
    input: input.trim(),
    promptText,
    referenceDateTime: referenceDateTime ?? timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  saveAiAutoExpenseTasks([task, ...getAiAutoExpenseTasks()]);
  return task;
};

export const updateAiAutoExpenseTask = (taskId: string, patch: Partial<AiAutoExpenseTask>): AiAutoExpenseTask | null => {
  let updatedTask: AiAutoExpenseTask | null = null;
  const tasks = getAiAutoExpenseTasks().map(task => {
    if (task.taskId !== taskId) {
      return task;
    }

    updatedTask = {
      ...task,
      ...patch,
      taskId: task.taskId,
      version: 1,
      updatedAt: now(),
    };
    return updatedTask;
  });
  saveAiAutoExpenseTasks(tasks);
  return updatedTask;
};

export const getNextAiAutoExpenseTask = (): AiAutoExpenseTask | null => {
  const runnable = getAiAutoExpenseTasks()
    .filter(task => task.status === 'queued' || task.status === 'running')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return runnable[0] ?? null;
};

export const requeueInterruptedAiAutoExpenseTasks = (): AiAutoExpenseTask[] => {
  const tasks = getAiAutoExpenseTasks();
  const timestamp = now();
  let changed = false;
  const nextTasks = tasks.map(task => {
    if (task.status !== 'running') {
      return task;
    }

    changed = true;
    return {
      ...task,
      status: 'queued' as AiAutoExpenseTaskStatus,
      updatedAt: timestamp,
      errorMessage: '上次处理中断，已重新排队',
    };
  });

  if (changed) {
    saveAiAutoExpenseTasks(nextTasks);
  }

  return getAiAutoExpenseTasks();
};

export const getAiAutoExpenseInput = (): string =>
  StorageService.getItemSync(AI_AUTO_EXPENSE_INPUT_KEY) ?? '';

export const saveAiAutoExpenseInput = (input: string): void => {
  StorageService.setItemSync(AI_AUTO_EXPENSE_INPUT_KEY, input);
  emitInput();
};

export const clearAiAutoExpenseInput = (): void => {
  StorageService.removeItemSync(AI_AUTO_EXPENSE_INPUT_KEY);
  emitInput();
};

export const getAiLastAutoCreateBatch = (): AiLastAutoCreateBatch | null =>
  parseJson<AiLastAutoCreateBatch>(StorageService.getItemSync(AI_LAST_AUTO_CREATE_BATCH_KEY));

export const saveAiLastAutoCreateBatch = ({
  taskId,
  input,
  expenseIds,
}: {
  taskId: string;
  input: string;
  expenseIds: string[];
}): AiLastAutoCreateBatch => {
  const batch: AiLastAutoCreateBatch = {
    version: 1,
    batchId: createId('ai-batch'),
    taskId,
    input,
    createdAt: now(),
    expenseIds,
    createdCount: expenseIds.length,
  };
  StorageService.setItemSync(AI_LAST_AUTO_CREATE_BATCH_KEY, JSON.stringify(batch));
  emitBatch();
  return batch;
};

export const clearAiLastAutoCreateBatch = (): void => {
  StorageService.removeItemSync(AI_LAST_AUTO_CREATE_BATCH_KEY);
  emitBatch();
};

export const subscribeAiAutoExpenseTasks = (listener: (tasks: AiAutoExpenseTask[]) => void): (() => void) => {
  taskListeners.add(listener);
  return () => {
    taskListeners.delete(listener);
  };
};

export const subscribeAiAutoExpenseInput = (listener: (input: string) => void): (() => void) => {
  inputListeners.add(listener);
  return () => {
    inputListeners.delete(listener);
  };
};

export const subscribeAiLastAutoCreateBatch = (listener: (batch: AiLastAutoCreateBatch | null) => void): (() => void) => {
  batchListeners.add(listener);
  return () => {
    batchListeners.delete(listener);
  };
};
