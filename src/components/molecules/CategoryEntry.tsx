import {TouchableOpacity, View} from 'react-native';
import React, {useCallback, useState, memo} from 'react';
import PrimaryView from '../atoms/PrimaryView';
import AppHeader from '../atoms/AppHeader';
import CustomInput from '../atoms/CustomInput';
import PrimaryText from '../atoms/PrimaryText';
import Icon from '../atoms/Icons';
import PrimaryButton from '../atoms/PrimaryButton';
import useThemeColors from '../../hooks/useThemeColors';
import {goBack} from '../../utils/navigationUtils';
import {useDispatch, useSelector} from 'react-redux';
import {selectUserId} from '../../redux/slice/userIdSlice';
import {createCategory, updateCategoryById} from '../../watermelondb/services';
import {fetchCategories} from '../../redux/slice/categoryDataSlice';
import {categorySchema} from '../../utils/validationSchema';
import {SheetManager} from 'react-native-actions-sheet';
import {AppDispatch} from '../../redux/store';
import {gs} from '../../styles/globalStyles';
import {useLanguage} from '../../context/LanguageContext';

interface CategoryEntryProps {
  type: string;
  route?: any;
}

const CategoryEntry: React.FC<CategoryEntryProps> = ({type, route}) => {
  const colors = useThemeColors();
  const {t} = useLanguage();
  const dispatch = useDispatch<AppDispatch>();
  const categoryData = route?.params;
  const isAddButton = type === 'Add';
  const categoryKind = categoryData?.categoryKind ?? 'expense';
  const parentId = categoryData?.parentId ?? '';
  const parentName = categoryData?.parentName ?? '';
  const isChildCategory = categoryKind === 'expense' && parentId;

  const [categoryName, setCategoryName] = useState(isAddButton ? '' : categoryData?.categoryName ?? '');

  const resolveIconParam = (val?: string): string | null => {
    if (!val || val === 'null' || val === '') { return null; }
    return val;
  };

  const [selectedIcon, setSelectedIcon] = useState<string | null>(
    isAddButton ? null : resolveIconParam(categoryData?.categoryIcon),
  );
  const [selectedColor, setSelectedColor] = useState<string | null>(
    isAddButton ? '#808080' : resolveIconParam(categoryData?.categoryColor),
  );
  const canEditColor = !isChildCategory;

  const userId = useSelector(selectUserId);
  const isValid = categorySchema.safeParse(categoryName).success;

  const handleAddCategory = useCallback(async () => {
    try {
      await createCategory(
        categoryName,
        userId,
        selectedIcon,
        selectedColor,
        categoryKind,
        parentId || null,
      );
      dispatch(fetchCategories());
      goBack();
    } catch (error) {
      if (__DEV__) {
        console.error('Error creating category:', error);
      }
    }
  }, [categoryName, userId, selectedIcon, selectedColor, categoryKind, parentId, dispatch]);

  const handleUpdateCategory = useCallback(async () => {
    try {
      await updateCategoryById(
        categoryData?.categoryId,
        categoryName,
        selectedIcon ?? undefined,
        selectedColor ?? undefined,
        categoryKind,
        parentId || null,
      );
      dispatch(fetchCategories());
      goBack();
    } catch (error) {
      if (__DEV__) {
        console.error('Error updating category:', error);
      }
    }
  }, [categoryData?.categoryId, categoryName, selectedIcon, selectedColor, categoryKind, parentId, dispatch]);

  const handleAddFromDefaultOrAddCategory = useCallback(() => {
    if (isAddButton) {
      handleAddCategory();
    } else {
      handleUpdateCategory();
    }
  }, [isAddButton, handleAddCategory, handleUpdateCategory]);

  const handleOpenIconPicker = useCallback(() => {
    SheetManager.show('icon-picker-sheet', {
      payload: {
        selectedIcon: selectedIcon ?? undefined,
        onSelect: (icon: string) => {
          setSelectedIcon(icon);
          SheetManager.hide('icon-picker-sheet');
        },
      },
    });
  }, [selectedIcon]);

  const handleOpenColorPicker = useCallback(() => {
    SheetManager.show('color-picker-sheet', {
      payload: {
        selectedColor: selectedColor ?? undefined,
        onSelect: (color: string) => {
          setSelectedColor(color);
          SheetManager.hide('color-picker-sheet');
        },
      },
    });
  }, [selectedColor]);

  return (
    <PrimaryView colors={colors} style={gs.justifyBetween} dismissKeyboardOnTouch>
      <View>
        <View style={[gs.mb20, gs.mt20]}>
          <AppHeader
            onPress={goBack}
            colors={colors}
            text={isAddButton ? t('新增分类') : t('编辑分类')}
          />
        </View>

        <View style={[gs.rowCenter, gs.gap8, gs.mb15]}>
          <View style={[gs.px12, gs.py8, gs.rounded12, {backgroundColor: colors.secondaryAccent}]}>
            <PrimaryText size={12} weight="medium">
              {categoryKind === 'income'
                ? t('收入分类')
                : isChildCategory
                  ? `${parentName} ${t('的小类')}`
                  : t('支出大类')}
            </PrimaryText>
          </View>
        </View>

        <CustomInput
          colors={colors}
          input={categoryName}
          setInput={setCategoryName}
          placeholder={categoryKind === 'income' ? t('例如 工资') : isChildCategory ? t('例如 地铁') : t('例如 出行')}
          label={t('分类名称')}
          schema={categorySchema}
        />

        <PrimaryText size={12} color={colors.secondaryText} style={gs.mb8}>{t('外观')}</PrimaryText>
        <View style={[gs.row, gs.gap8, gs.mb15]}>
          <TouchableOpacity
            onPress={handleOpenIconPicker}
            activeOpacity={0.7}
            style={[
              gs.py10,
              gs.px14,
              gs.rounded12,
              gs.rowCenter,
              gs.gap8,
              gs.flex1,
              {backgroundColor: colors.secondaryAccent},
            ]}>
            <View
              style={[
                gs.size32,
                gs.roundedFull,
                gs.center,
                {backgroundColor: colors.containerColor},
              ]}>
              <Icon
                name={selectedIcon ?? 'shapes'}
                size={16}
                color={colors.primaryText}
              />
            </View>
            <View style={gs.flex1}>
              <PrimaryText size={11} color={colors.secondaryText}>{t('图标')}</PrimaryText>
              <PrimaryText size={13} weight="medium">
                {selectedIcon ? t('更换') : t('选择')}
              </PrimaryText>
            </View>
          </TouchableOpacity>

          {canEditColor ? (
            <TouchableOpacity
              onPress={handleOpenColorPicker}
              activeOpacity={0.7}
              style={[
                gs.py10,
                gs.px14,
                gs.rounded12,
                gs.rowCenter,
                gs.gap8,
                gs.flex1,
                {backgroundColor: colors.secondaryAccent},
              ]}>
              <View
                style={[
                  gs.size32,
                  gs.roundedFull,
                  gs.center,
                  {backgroundColor: selectedColor ?? colors.accentGreen},
                ]}
              />
              <View style={gs.flex1}>
                <PrimaryText size={11} color={colors.secondaryText}>{t('颜色')}</PrimaryText>
                <PrimaryText size={13} weight="medium">
                  {selectedColor ? t('更换') : t('选择')}
                </PrimaryText>
              </View>
            </TouchableOpacity>
          ) : (
            <View
              style={[
                gs.py10,
                gs.px14,
                gs.rounded12,
                gs.rowCenter,
                gs.gap8,
                gs.flex1,
                {backgroundColor: colors.secondaryAccent},
              ]}>
              <View style={[gs.size32, gs.roundedFull, {backgroundColor: colors.iconContainer}]} />
              <View style={gs.flex1}>
                <PrimaryText size={11} color={colors.secondaryText}>{t('颜色')}</PrimaryText>
                <PrimaryText size={13} weight="medium">
                  {t('跟随大类')}
                </PrimaryText>
              </View>
            </View>
          )}
        </View>
      </View>

      <PrimaryButton
        onPress={handleAddFromDefaultOrAddCategory}
        colors={colors}
        buttonTitle={isAddButton ? t('新增') : t('更新')}
        disabled={!isValid}
      />
    </PrimaryView>
  );
};

export default memo(CategoryEntry);
