import {Q} from '@nozbe/watermelondb';
import {nanoid} from 'nanoid';
import {database} from '../database';
import Category from '../models/Category';
import {sanitizeString, DEFAULTS} from '../../backend/sanitize';
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
} from '../../constants/defaultCategories';
import type {CategoryKind} from '../../constants/defaultCategories';

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
  await database.write(async () => {
    await database.get<Category>('categories').create(cat => {
      cat._raw.id = id;
      cat.name = name;
      cat.categoryStatus = true;
      cat.userId = userId;
      // Always assign string values for consistent Hidden Class shape
      cat.icon = sanitizeString(icon, DEFAULTS.icon);
      cat.color = sanitizeString(color, DEFAULTS.color);
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
    await category.update(cat => {
      cat.categoryStatus = false;
    });
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
    await category.update(cat => {
      if (newName !== undefined) {
        cat.name = newName;
      }
      if (newIcon !== undefined) {
        cat.icon = newIcon;
      }
      if (newColor !== undefined) {
        cat.color = newColor;
      }
      if (newKind !== undefined) {
        cat.kind = newKind;
      }
      if (newParentId !== undefined) {
        cat.parentId = newParentId ?? undefined;
      }
    });
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
  const byKey = new Map(
    existing.map(c => [`${normalizeKind(c.kind)}:${c.parentId ?? ''}:${c.name}`, c]),
  );

  for (const group of DEFAULT_EXPENSE_CATEGORIES) {
    let parent = byKey.get(`expense::${group.name}`);
    if (!parent) {
      const parentId = await createCategory(group.name, userId, group.icon, group.color, 'expense', null);
      parent = await database.get<Category>('categories').find(parentId);
      byKey.set(`expense::${group.name}`, parent);
    }

    for (const child of group.children) {
      const key = `expense:${parent.id}:${child.name}`;
      if (!byKey.has(key)) {
        const childId = await createCategory(child.name, userId, child.icon, group.color, 'expense', parent.id);
        const created = await database.get<Category>('categories').find(childId);
        byKey.set(key, created);
      }
    }
  }

  for (const category of DEFAULT_INCOME_CATEGORIES) {
    const key = `income::${category.name}`;
    if (!byKey.has(key)) {
      const id = await createCategory(category.name, userId, category.icon, category.color, 'income', null);
      const created = await database.get<Category>('categories').find(id);
      byKey.set(key, created);
    }
  }
};
