import {useDispatch, useSelector} from 'react-redux';
import useThemeColors from '../../hooks/useThemeColors';
import {
  fetchCategories,
  selectActiveIncomeCategories,
  selectExpenseCategoryGroups,
} from '../../redux/slice/categoryDataSlice';
import {useCallback, useEffect, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {navigate} from '../../utils/navigationUtils';
import {softDeleteCategoryById} from '../../watermelondb/services';
import {AppDispatch} from '../../redux/store';

const useCategory = () => {
  const colors = useThemeColors();
  const dispatch = useDispatch<AppDispatch>();
  const expenseGroups = useSelector(selectExpenseCategoryGroups);
  const incomeCategories = useSelector(selectActiveIncomeCategories);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchCategories());
    }, [dispatch]),
  );

  useEffect(() => {
    if (!refreshing) return;

    dispatch(fetchCategories()).finally(() => {
      setRefreshing(false);
    });
  }, [refreshing, dispatch]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
  }, []);

  const handleEdit = useCallback((
    categoryId: string,
    categoryName: string,
    categoryIcon: string,
    categoryColor: string,
    categoryKind: 'expense' | 'income' = 'expense',
    parentId = '',
    parentName = '',
  ) => {
    navigate('UpdateCategoryScreen', {
      categoryId,
      categoryName,
      categoryIcon,
      categoryColor,
      categoryKind,
      parentId,
      parentName,
    });
  }, []);

  const handleDelete = useCallback(async (categoryId: string) => {
    try {
      await softDeleteCategoryById(categoryId);
      dispatch(fetchCategories());
    } catch (error) {
      if (__DEV__) {
        console.error('Error deleting category:', categoryId, error);
      }
    }
  }, [dispatch]);

  return {
    colors,
    refreshing,
    onRefresh,
    expenseGroups,
    incomeCategories,
    handleEdit,
    handleDelete,
  };
};

export default useCategory;
