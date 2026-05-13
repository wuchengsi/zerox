import {Q} from '@nozbe/watermelondb';
import {nanoid} from 'nanoid';
import {database} from '../database';
import Category from '../models/Category';
import {sanitizeString, DEFAULTS} from '../../backend/sanitize';
import {
  getDefaultExpenseCategories,
  getDefaultIncomeCategories,
} from '../../constants/defaultCategories';
import type {CategoryKind} from '../../constants/defaultCategories';
import {getCurrentLanguage} from '../../i18n';

// Type for category data - all properties initialized for Hidden Class optimization
export interface CategoryData {
  id: string;
  name: string;
  categoryStatus: boolean;
  userId: string;
  icon: string;
  color: string;
  parentId: string;
  kind: CategoryKind;
  parent?: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
}

export interface ExpenseCategoryGroup extends CategoryData {
  children: CategoryData[];
}

const normalizeKind = (kind?: string | null): CategoryKind =>
  kind === 'income' ? 'income' : 'expense';

const toCategoryData = (
  c: Category,
  parent?: Category | null,
): CategoryData => ({
  id: c.id,
  name: c.name,
  categoryStatus: c.categoryStatus,
  userId: c.userId,
  icon: sanitizeString(c.icon, DEFAULTS.icon),
  color: sanitizeString(c.color, DEFAULTS.color),
  parentId: c.parentId ?? '',
  kind: normalizeKind(c.kind),
  parent: parent
    ? {
        id: parent.id,
        name: parent.name,
        icon: sanitizeString(parent.icon, DEFAULTS.icon),
        color: sanitizeString(parent.color, DEFAULTS.color),
      }
    : undefined,
});

/**
 * Creates a new category
 */
export const createCategory = async (
  name: string,
  userId: string,
  icon: string | null,
  color: string | null,
  kind: CategoryKind = 'expense',
  parentId: string | null = null,
): Promise<string> => {
  const id = nanoid(24);
  let resolvedColor = color;
  if (parentId) {
    const parent = await database.get<Category>('categories').find(parentId);
    resolvedColor = parent.color;
  }
  await database.write(async () => {
    await database.get<Category>('categories').create(cat => {
      cat._raw.id = id;
      cat.name = name;
      cat.categoryStatus = true;
      cat.userId = userId;
      // Always assign string values for consistent Hidden Class shape
      cat.icon = sanitizeString(icon, DEFAULTS.icon);
      cat.color = sanitizeString(resolvedColor, DEFAULTS.color);
      cat.kind = kind;
      cat.parentId = parentId ?? undefined;
    });
  });
  return id;
};

/**
 * Soft deletes a category by ID (sets categoryStatus to false)
 */
export const softDeleteCategoryById = async (
  categoryId: string,
): Promise<void> => {
  await database.write(async () => {
    const category = await database.get<Category>('categories').find(categoryId);
    const children = !category.parentId
      ? await database
          .get<Category>('categories')
          .query(Q.where('parent_id', categoryId))
          .fetch()
      : [];

    await database.batch(
      category.prepareUpdate(cat => {
        cat.categoryStatus = false;
      }),
      ...children.map(child =>
        child.prepareUpdate(cat => {
          cat.categoryStatus = false;
        }),
      ),
    );
  });
};

/**
 * Updates a category by ID
 */
export const updateCategoryById = async (
  categoryId: string,
  newName?: string,
  newIcon?: string,
  newColor?: string,
  newKind?: CategoryKind,
  newParentId?: string | null,
): Promise<void> => {
  await database.write(async () => {
    const category = await database.get<Category>('categories').find(categoryId);
    const resolvedParentId = newParentId !== undefined ? newParentId : category.parentId ?? null;
    const parentColor = resolvedParentId
      ? (await database.get<Category>('categories').find(resolvedParentId)).color
      : null;
    await category.update(cat => {
      if (newName !== undefined) {
        cat.name = newName;
      }
      if (newIcon !== undefined) {
        cat.icon = newIcon;
      }
      if (parentColor) {
        cat.color = parentColor;
      } else if (newColor !== undefined) {
        cat.color = newColor;
      }
      if (newKind !== undefined) {
        cat.kind = newKind;
      }
      if (newParentId !== undefined) {
        cat.parentId = newParentId ?? undefined;
      }
    });

    if (!resolvedParentId && newColor !== undefined) {
      const children = await database
        .get<Category>('categories')
        .query(Q.where('parent_id', categoryId))
        .fetch();
      await database.batch(
        ...children.map(child =>
          child.prepareUpdate(c => {
            c.color = newColor;
          }),
        ),
      );
    }
  });
};

/**
 * Gets all categories
 */
export const getAllCategories = async (): Promise<CategoryData[]> => {
  const categories = await database.get<Category>('categories').query().fetch();
  return categories.map(c => toCategoryData(c));
};

/**
 * Gets all categories by user ID
 */
export const getAllCategoriesByUserId = async (
  userId: string,
): Promise<CategoryData[]> => {
  const categories = await database
    .get<Category>('categories')
    .query(Q.where('user_id', userId))
    .fetch();
  const parentMap = new Map(categories.map(c => [c.id, c]));
  return categories.map(c => toCategoryData(c, c.parentId ? parentMap.get(c.parentId) : null));
};

/**
 * Gets active categories by user ID
 */
export const getActiveCategoriesByUserId = async (
  userId: string,
): Promise<CategoryData[]> => {
  const categories = await database
    .get<Category>('categories')
    .query(Q.where('user_id', userId), Q.where('category_status', true))
    .fetch();
  const parentMap = new Map(categories.map(c => [c.id, c]));
  return categories.map(c => toCategoryData(c, c.parentId ? parentMap.get(c.parentId) : null));
};

/**
 * Gets a category by ID
 */
export const getCategoryById = async (
  categoryId: string,
): Promise<CategoryData | null> => {
  try {
    const category = await database
      .get<Category>('categories')
      .find(categoryId);
    return toCategoryData(category);
  } catch {
    return null;
  }
};

export const getCategoryByName = async (
  userId: string,
  name: string,
  kind: CategoryKind = 'expense',
  parentId?: string | null,
): Promise<CategoryData | null> => {
  const categories = await database
    .get<Category>('categories')
    .query(Q.where('user_id', userId), Q.where('name', name))
    .fetch();
  const category = categories.find(item => {
    if (normalizeKind(item.kind) !== kind) {
      return false;
    }
    if (parentId === undefined) {
      return true;
    }
    return (item.parentId ?? '') === (parentId ?? '');
  });

  return category ? toCategoryData(category) : null;
};

export const getExpenseCategoryGroupsByUserId = async (
  userId: string,
): Promise<ExpenseCategoryGroup[]> => {
  const categories = await database
    .get<Category>('categories')
    .query(
      Q.where('user_id', userId),
      Q.where('kind', 'expense'),
      Q.where('category_status', true),
    )
    .fetch();

  const parents = categories.filter(c => !c.parentId);
  const children = categories.filter(c => !!c.parentId);

  return parents.map(parent => ({
    ...toCategoryData(parent),
    children: children
      .filter(child => child.parentId === parent.id)
      .map(child => toCategoryData(child, parent)),
  }));
};

export const getActiveExpenseSubcategoriesByUserId = async (
  userId: string,
): Promise<CategoryData[]> => {
  const categories = await database
    .get<Category>('categories')
    .query(
      Q.where('user_id', userId),
      Q.where('kind', 'expense'),
      Q.where('category_status', true),
    )
    .fetch();

  const parentMap = new Map(categories.map(c => [c.id, c]));
  return categories
    .filter(c => !!c.parentId)
    .map(c => toCategoryData(c, parentMap.get(c.parentId ?? '') ?? null));
};

export const getActiveIncomeCategoriesByUserId = async (
  userId: string,
): Promise<CategoryData[]> => {
  const categories = await database
    .get<Category>('categories')
    .query(
      Q.where('user_id', userId),
      Q.where('kind', 'income'),
      Q.where('category_status', true),
    )
    .fetch();

  return categories.map(c => toCategoryData(c));
};

export const ensureDefaultCategoriesForUser = async (
  userId: string,
): Promise<void> => {
  const existing = await database
    .get<Category>('categories')
    .query(Q.where('user_id', userId))
    .fetch();
  const categoryCollection = database.get<Category>('categories');
  const byKey = new Map(
    existing.map(c => [
      `${normalizeKind(c.kind)}:${c.parentId ?? ''}:${c.name}`,
      {id: c.id, color: c.color},
    ]),
  );
  const preparedCategories: Category[] = [];
  const language = getCurrentLanguage();
  const defaultExpenseCategories = getDefaultExpenseCategories(language);
  const defaultIncomeCategories = getDefaultIncomeCategories(language);

  const prepareCategory = (
    name: string,
    icon: string | null,
    color: string | null,
    kind: CategoryKind,
    parentId: string | null,
  ) => {
    const id = nanoid(24);
    const prepared = categoryCollection.prepareCreate(cat => {
      cat._raw.id = id;
      cat.name = name;
      cat.categoryStatus = true;
      cat.userId = userId;
      cat.icon = sanitizeString(icon, DEFAULTS.icon);
      cat.color = sanitizeString(color, DEFAULTS.color);
      cat.kind = kind;
      cat.parentId = parentId ?? undefined;
    });
    preparedCategories.push(prepared);
    return {id, color: sanitizeString(color, DEFAULTS.color)};
  };

  for (const group of defaultExpenseCategories) {
    let parent = byKey.get(`expense::${group.name}`);
    if (!parent) {
      parent = prepareCategory(group.name, group.icon, group.color, 'expense', null);
      byKey.set(`expense::${group.name}`, parent);
    }

    for (const child of group.children) {
      const key = `expense:${parent.id}:${child.name}`;
      if (!byKey.has(key)) {
        const childCategory = prepareCategory(child.name, child.icon, parent.color, 'expense', parent.id);
        byKey.set(key, childCategory);
      }
    }
  }

  for (const category of defaultIncomeCategories) {
    const key = `income::${category.name}`;
    if (!byKey.has(key)) {
      const incomeCategory = prepareCategory(category.name, category.icon, category.color, 'income', null);
      byKey.set(key, incomeCategory);
    }
  }

  if (preparedCategories.length > 0) {
    await database.write(async () => {
      await database.batch(...preparedCategories);
    });
  }
};
