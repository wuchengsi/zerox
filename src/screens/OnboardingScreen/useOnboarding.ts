import {useDispatch, useSelector} from 'react-redux';
import useThemeColors from '../../hooks/useThemeColors';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {fetchUserData, selectUserId} from '../../redux/slice/userIdSlice';
import {navigate} from '../../utils/navigationUtils';
import {
  createCategory,
  ensureDefaultCategoriesForUser,
  getCategoryByName,
} from '../../watermelondb/services';
import {AppDispatch} from '../../redux/store';
import {getDefaultExpenseCategories} from '../../constants/defaultCategories';
import {useLanguage} from '../../context/LanguageContext';

interface CategorySelection {
  name: string;
  icon?: string;
  color?: string;
  parentName?: string;
  parentIcon?: string;
  parentColor?: string;
}

const useOnboarding = () => {
  const colors = useThemeColors();
  const {language, setLanguage, t} = useLanguage();
  const [selectedCategories, setSelectedCategories] = useState<Array<CategorySelection>>([]);
  const defaultExpenseCategories = useMemo(() => getDefaultExpenseCategories(language), [language]);

  const selectedCategoryNames = useMemo(
    () => new Set(selectedCategories.map(c => `${c.parentName ?? ''}·${c.name}`)),
    [selectedCategories],
  );

  const userId = useSelector(selectUserId);

  const dispatch = useDispatch<AppDispatch>();
  const handleSkip = useCallback(async () => {
    await ensureDefaultCategoriesForUser(userId);
    navigate('ChooseCurrencyScreen');
  }, [userId]);

  useEffect(() => {
    dispatch(fetchUserData());
  }, [dispatch]);

  const handleSubmit = useCallback(async () => {
    if (selectedCategories.length === 0) {
      await ensureDefaultCategoriesForUser(userId);
      navigate('ChooseCurrencyScreen');
      return;
    }

    for (const category of selectedCategories) {
      const parentName = category.parentName ?? category.name;
      let parent = await getCategoryByName(userId, parentName, 'expense', null);
      if (!parent) {
        const parentConfig = defaultExpenseCategories.find(item => item.name === parentName);
        const parentId = await createCategory(
          parentName,
          userId,
          category.parentIcon ?? parentConfig?.icon ?? 'shapes',
          category.parentColor ?? parentConfig?.color ?? category.color ?? '#808080',
          'expense',
          null,
        );
        parent = await getCategoryByName(userId, parentName, 'expense', null);
        if (!parent) {
          parent = {
            id: parentId,
            name: parentName,
            categoryStatus: true,
            userId,
            icon: category.parentIcon ?? 'shapes',
            color: category.parentColor ?? '#808080',
            parentId: '',
            kind: 'expense',
          };
        }
      }

      await createCategory(category.name, userId, category.icon ?? null, category.color ?? null, 'expense', parent.id);
    }
    navigate('ChooseCurrencyScreen');
  }, [defaultExpenseCategories, selectedCategories, userId]);

  const toggleCategorySelection = useCallback(
    (category: CategorySelection) => {
      const key = `${category.parentName ?? ''}·${category.name}`;
      if (selectedCategoryNames.has(key)) {
        setSelectedCategories(prev =>
          prev.filter(item => `${item.parentName ?? ''}·${item.name}` !== key),
        );
      } else {
        setSelectedCategories(prev => [...prev, category]);
      }
    },
    [selectedCategoryNames],
  );

  const isCategorySelected = useCallback(
    (categoryName: string, parentName?: string): boolean => {
      return selectedCategoryNames.has(`${parentName ?? ''}·${categoryName}`);
    },
    [selectedCategoryNames],
  );

  return {
    colors,
    language,
    setLanguage,
    t,
    defaultExpenseCategories,
    selectedCategories,
    setSelectedCategories,
    userId,
    handleSkip,
    handleSubmit,
    toggleCategorySelection,
    isCategorySelected,
  };
};

export default useOnboarding;
