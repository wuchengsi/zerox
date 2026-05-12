import {Q} from '@nozbe/watermelondb';
import {database} from '../database';
import Income from '../models/Income';
import Category from '../models/Category';

export interface IncomeData {
  id: string;
  title: string;
  amount: number;
  categoryId: string;
  userId: string;
  date: string;
}

export interface IncomeWithCategory extends IncomeData {
  category?: {
    id: string;
    name: string;
    icon?: string;
    color: string;
  };
}

const mapIncome = (
  income: Income,
  categoryMap?: Map<string, {id: string; name: string; icon?: string; color: string}>,
): IncomeWithCategory => ({
  id: income.id,
  title: income.title,
  amount: income.amount,
  categoryId: income.categoryId,
  userId: income.userId,
  date: income.date,
  category: categoryMap?.get(income.categoryId),
});

export const createIncome = async (
  userId: string,
  title: string,
  amount: number,
  categoryId: string,
  date: string,
): Promise<string> => {
  let incomeId = '';
  await database.write(async () => {
    const income = await database.get<Income>('incomes').create(i => {
      i.title = title;
      i.amount = amount;
      i.categoryId = categoryId;
      i.userId = userId;
      i.date = date;
    });
    incomeId = income.id;
  });
  return incomeId;
};

export const updateIncomeById = async (
  incomeId: string,
  categoryId?: string,
  newTitle?: string,
  newAmount?: number,
  newDate?: string,
): Promise<void> => {
  await database.write(async () => {
    const income = await database.get<Income>('incomes').find(incomeId);
    await income.update(i => {
      if (newTitle !== undefined) {
        i.title = newTitle;
      }
      if (newAmount !== undefined) {
        i.amount = newAmount;
      }
      if (newDate !== undefined) {
        i.date = newDate;
      }
      if (categoryId !== undefined) {
        i.categoryId = categoryId;
      }
    });
  });
};

export const deleteIncomeById = async (incomeId: string): Promise<void> => {
  await database.write(async () => {
    const income = await database.get<Income>('incomes').find(incomeId);
    await income.destroyPermanently();
  });
};

export const getAllIncomesByMonth = async (
  userId: string,
  yearMonth: string,
): Promise<IncomeWithCategory[]> => {
  const incomes = await database
    .get<Income>('incomes')
    .query(
      Q.where('user_id', userId),
      Q.where('date', Q.like(`${Q.sanitizeLikeString(yearMonth)}%`)),
    )
    .fetch();

  const categories = await database
    .get<Category>('categories')
    .query(Q.where('user_id', userId), Q.where('kind', 'income'))
    .fetch();
  const categoryMap = new Map(
    categories.map(category => [
      category.id,
      {
        id: category.id,
        name: category.name,
        icon: category.icon ?? '',
        color: category.color ?? '#808080',
      },
    ]),
  );

  return incomes.map(income => mapIncome(income, categoryMap));
};

export const getIncomeById = async (
  incomeId: string,
): Promise<IncomeData | null> => {
  try {
    const income = await database.get<Income>('incomes').find(incomeId);
    return mapIncome(income);
  } catch {
    return null;
  }
};
