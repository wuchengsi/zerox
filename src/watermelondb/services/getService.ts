import {database} from '../database';
import User from '../models/User';
import Category from '../models/Category';
import Expense from '../models/Expense';
import Income from '../models/Income';
import Currency from '../models/Currency';
import Debtor from '../models/Debtor';
import Debt from '../models/Debt';
import {sanitizeString, DEFAULTS} from '../../backend/sanitize';
import type {ExportData} from '../../backend/export/format';

export type {ExportData} from '../../backend/export/format';

/**
 * Gets all data from the database in a format suitable for export/import.
 * Sanitizes all values before returning.
 */
export const getAllData = async (): Promise<ExportData | null> => {
  try {
    const [users, categories, expenses, incomes, currencies, debtors, debts] =
      await Promise.all([
        database.get<User>('users').query().fetch(),
        database.get<Category>('categories').query().fetch(),
        database.get<Expense>('expenses').query().fetch(),
        database.get<Income>('incomes').query().fetch(),
        database.get<Currency>('currencies').query().fetch(),
        database.get<Debtor>('debtors').query().fetch(),
        database.get<Debt>('debts').query().fetch(),
      ]);

    const categoryMap = new Map<string, string>();
    const parentMap = new Map<string, string>();
    categories.forEach(c => {
      categoryMap.set(c.id, c.name);
      if (c.parentId) {
        const parent = categories.find(parentCategory => parentCategory.id === c.parentId);
        if (parent) {
          parentMap.set(c.id, parent.name);
        }
      }
    });

    const debtorMap = new Map<string, string>();
    debtors.forEach(d => {
      debtorMap.set(d.id, d.title);
    });

    return {
      users: users.map(u => ({
        username: u.username,
        email: u.email,
      })),
      categories: categories.map(c => ({
        name: c.name,
        icon: sanitizeString(c.icon, DEFAULTS.icon),
        color: sanitizeString(c.color, DEFAULTS.color),
        kind: c.kind === 'income' ? 'income' : 'expense',
        parentName: c.parentId ? categoryMap.get(c.parentId) : undefined,
      })),
      expenses: expenses.map(e => ({
        title: e.title,
        amount: e.amount,
        category: {
          name: categoryMap.get(e.categoryId) ?? '未知分类',
          parentName: parentMap.get(e.categoryId),
        },
        date: e.date,
      })),
      incomes: incomes.map(i => ({
        title: i.title,
        amount: i.amount,
        category: {name: categoryMap.get(i.categoryId) ?? '收入'},
        date: i.date,
      })),
      currencies: currencies.map(c => ({
        code: c.code,
        symbol: c.symbol,
        name: c.name,
      })),
      debtors: debtors.map(d => ({
        title: d.title,
        icon: sanitizeString(d.icon, DEFAULTS.icon),
        type: d.type ?? DEFAULTS.type,
        color: sanitizeString(d.color, DEFAULTS.color),
      })),
      debts: debts.map(d => ({
        amount: d.amount,
        description: d.description,
        debtor: {title: debtorMap.get(d.debtorId) ?? '未知对象'},
        date: d.date,
        type: d.type,
      })),
    };
  } catch (error) {
    if (__DEV__) {
      console.error('Error getting all data:', error);
    }
    return null;
  }
};

/**
 * Debug function to log all data from the database
 * Only runs in development mode
 */
export const debugLogAllData = async (): Promise<void> => {
  if (!__DEV__) {
    return;
  }

  console.log('========== DEBUG: Database Contents ==========');

  try {
    const data = await getAllData();

    if (!data) {
      console.log('No data found');
      return;
    }

    console.log('\n--- USERS ---');
    console.log(`Count: ${data.users.length}`);
    data.users.forEach((user, index) => {
      console.log(`User ${index + 1}:`, JSON.stringify(user, null, 2));
    });

    console.log('\n--- CATEGORIES ---');
    console.log(`Count: ${data.categories.length}`);
    data.categories.forEach((category, index) => {
      console.log(`Category ${index + 1}:`, JSON.stringify(category, null, 2));
    });

    console.log('\n--- EXPENSES ---');
    console.log(`Count: ${data.expenses.length}`);
    data.expenses.forEach((expense, index) => {
      console.log(`Expense ${index + 1}:`, JSON.stringify(expense, null, 2));
    });

    console.log('\n--- INCOMES ---');
    console.log(`Count: ${data.incomes.length}`);
    data.incomes.forEach((income, index) => {
      console.log(`Income ${index + 1}:`, JSON.stringify(income, null, 2));
    });

    console.log('\n--- CURRENCIES ---');
    console.log(`Count: ${data.currencies.length}`);
    data.currencies.forEach((currency, index) => {
      console.log(`Currency ${index + 1}:`, JSON.stringify(currency, null, 2));
    });

    console.log('\n--- DEBTORS ---');
    console.log(`Count: ${data.debtors.length}`);
    data.debtors.forEach((debtor, index) => {
      console.log(`Debtor ${index + 1}:`, JSON.stringify(debtor, null, 2));
    });

    console.log('\n--- DEBTS ---');
    console.log(`Count: ${data.debts.length}`);
    data.debts.forEach((debt, index) => {
      console.log(`Debt ${index + 1}:`, JSON.stringify(debt, null, 2));
    });

    console.log('\n--- SUMMARY ---');
    console.log({
      users: data.users.length,
      categories: data.categories.length,
      expenses: data.expenses.length,
      incomes: data.incomes.length,
      currencies: data.currencies.length,
      debtors: data.debtors.length,
      debts: data.debts.length,
    });

    console.log('========== END DEBUG ==========');
  } catch (error) {
    console.error('Error in debugLogAllData:', error);
  }
};
