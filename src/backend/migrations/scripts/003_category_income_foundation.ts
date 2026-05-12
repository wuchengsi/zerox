import {Q} from '@nozbe/watermelondb';
import {database} from '../../../watermelondb/database';
import Category from '../../../watermelondb/models/Category';
import Expense from '../../../watermelondb/models/Expense';
import User from '../../../watermelondb/models/User';
import {ensureDefaultCategoriesForUser} from '../../../watermelondb/services/categoryService';
import {
  DEFAULT_EXPENSE_CATEGORIES,
  LEGACY_CATEGORY_MAP,
} from '../../../constants/defaultCategories';

const findTargetChild = (
  categories: Category[],
  parentName: string,
  childName: string,
): Category | undefined => {
  const parent = categories.find(
    category => category.name === parentName && !category.parentId,
  );
  return categories.find(
    category => category.name === childName && category.parentId === parent?.id,
  );
};

export const migration_003 = {
  version: 3,
  name: 'category_income_foundation',
  up: async (): Promise<void> => {
    const users = await database.get<User>('users').query().fetch();
    const defaultParentNames = new Set(
      DEFAULT_EXPENSE_CATEGORIES.map(category => category.name),
    );

    for (const user of users) {
      const legacyCategories = await database
        .get<Category>('categories')
        .query(Q.where('user_id', user.id))
        .fetch();

      await ensureDefaultCategoriesForUser(user.id);

      const categories = await database
        .get<Category>('categories')
        .query(Q.where('user_id', user.id))
        .fetch();

      const fallback = findTargetChild(categories, '其他', '其他');

      await database.write(async () => {
        for (const category of categories) {
          if (!category.kind) {
            await category.update(record => {
              record.kind = 'expense';
            });
          }
        }

        for (const legacyCategory of legacyCategories) {
          if (legacyCategory.parentId || legacyCategory.kind === 'income') {
            continue;
          }

          const mapped =
            LEGACY_CATEGORY_MAP[legacyCategory.name] ?? LEGACY_CATEGORY_MAP.其他;
          const target =
            findTargetChild(categories, mapped.parent, mapped.child) ?? fallback;

          if (!target || target.id === legacyCategory.id) {
            continue;
          }

          const expenses = await database
            .get<Expense>('expenses')
            .query(Q.where('category_id', legacyCategory.id))
            .fetch();

          for (const expense of expenses) {
            await expense.update(record => {
              record.categoryId = target.id;
            });
          }

          if (!defaultParentNames.has(legacyCategory.name)) {
            await legacyCategory.update(record => {
              record.categoryStatus = false;
            });
          }
        }
      });
    }
  },
};
