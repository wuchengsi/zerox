import StorageService from './asyncStorageService';
import {getCurrentYear} from './dateUtils';
import {getAvailableExpenseYears, getAvailableIncomeYears} from '../watermelondb/services';

const CACHE_KEY = 'available-expense-years';
const CACHE_KEY_PREFIX = 'available-transaction-years';

const getCacheKey = (userId?: string): string =>
  userId ? `${CACHE_KEY_PREFIX}:${userId}` : CACHE_KEY;

const uniqueSortedYears = (years: number[]): number[] =>
  Array.from(new Set(years.filter(year => Number.isFinite(year)))).sort((a, b) => a - b);

export const getCachedYears = (userId?: string): number[] => {
  const raw = StorageService.getItemSync(getCacheKey(userId)) ?? StorageService.getItemSync(CACHE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return [];
};

const setCachedYears = (years: number[], userId?: string): void => {
  StorageService.setItemSync(getCacheKey(userId), JSON.stringify(uniqueSortedYears(years)));
};

export const loadAvailableYears = async (userId: string): Promise<number[]> => {
  const [expenseYears, incomeYears] = await Promise.all([
    getAvailableExpenseYears(userId),
    getAvailableIncomeYears(userId),
  ]);
  const years = uniqueSortedYears([...expenseYears, ...incomeYears, getCurrentYear()]);
  setCachedYears(years, userId);
  return years;
};

export const ensureYearInCache = (year: number, userId?: string): number[] => {
  const cached = getCachedYears(userId);
  if (!cached.includes(year)) {
    const updated = [...cached, year].sort((a, b) => a - b);
    setCachedYears(updated, userId);
    return updated;
  }
  return cached;
};

export const refreshYearsCache = async (userId: string): Promise<number[]> => {
  const [expenseYears, incomeYears] = await Promise.all([
    getAvailableExpenseYears(userId),
    getAvailableIncomeYears(userId),
  ]);
  const years = uniqueSortedYears([...expenseYears, ...incomeYears, getCurrentYear()]);
  setCachedYears(years, userId);
  return years;
};
