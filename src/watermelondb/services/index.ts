// User Service
export {
  createUser,
  createExistingUser,
  updateUserById,
  getUserById,
  getAllUsers,
} from './userService';

// Category Service
export {
  createCategory,
  softDeleteCategoryById,
  updateCategoryById,
  getAllCategories,
  getAllCategoriesByUserId,
  getActiveCategoriesByUserId,
  getCategoryById,
  getCategoryByName,
  getExpenseCategoryGroupsByUserId,
  getActiveExpenseSubcategoriesByUserId,
  getActiveIncomeCategoriesByUserId,
  ensureDefaultCategoriesForUser,
} from './categoryService';
export type {CategoryData, ExpenseCategoryGroup} from './categoryService';

// Expense Service
export {
  createExpense,
  updateExpenseById,
  deleteExpenseById,
  getAllExpensesByUserId,
  getAllExpensesByUserIdWithCategory,
  getAllExpensesByDate,
  getAllExpensesByMonth,
  getAllExpensesByCategoryAndMonth,
  getAvailableExpenseYears,
  getExpenseById,
} from './expenseService';
export type {ExpenseData, ExpenseWithCategory} from './expenseService';

// Income Service
export {
  createIncome,
  updateIncomeById,
  deleteIncomeById,
  getAllIncomesByMonth,
  getIncomeById,
  getAvailableIncomeYears,
} from './incomeService';
export type {IncomeData, IncomeWithCategory} from './incomeService';

// Currency Service
export {
  createCurrency,
  updateCurrencyById,
  getCurrencyById,
  getCurrencyByUserId,
  getAllCurrencies,
} from './currencyService';
export type {CurrencyData} from './currencyService';

// Debtor Service
export {
  createDebtor,
  softDeleteDebtorById,
  deleteDebtorById,
  updateDebtorById,
  getAllDebtors,
  getAllDebtorsByUserId,
  getActiveDebtorsByUserId,
  getDebtorByDebtorId,
} from './debtorService';
export type {DebtorData} from './debtorService';

// Debt Service
export {
  createDebt,
  updateDebtById,
  deleteDebtById,
  deleteAllDebtsByDebtorId,
  getAllDebtsByUserId,
  getAllDebtsByUserIdAndDebtorId,
  getDebtById,
} from './debtService';
export type {DebtData} from './debtService';

// Get Service
export {getAllData, debugLogAllData} from './getService';
export type {ExportData} from './getService';

// Delete Service
export {
  deleteAllData,
  deleteAllExpensesByUserId,
  deleteAllCategoriesByUserId,
} from './deleteService';
