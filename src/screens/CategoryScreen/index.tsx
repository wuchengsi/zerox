import {RefreshControl, ScrollView, TouchableOpacity, View} from 'react-native';
import React, {useCallback, useState} from 'react';
import {navigate} from '../../utils/navigationUtils';
import Icon from '../../components/atoms/Icons';
import HeaderContainer from '../../components/molecules/HeaderContainer';
import useCategory from './useCategory';
import PrimaryView from '../../components/atoms/PrimaryView';
import PrimaryText from '../../components/atoms/PrimaryText';
import type {CategoryData as Category, ExpenseCategoryGroup} from '../../watermelondb/services';
import EmptyState from '../../components/atoms/EmptyState';
import type {Colors} from '../../hooks/useThemeColors';
import {gs, hitSlop} from '../../styles/globalStyles';

const Segment = ({
  active,
  label,
  onPress,
  colors,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  colors: Colors;
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    style={[
      gs.py8,
      gs.px14,
      gs.rounded12,
      {backgroundColor: active ? colors.primaryText : colors.secondaryAccent},
    ]}>
    <PrimaryText
      size={13}
      weight={active ? 'semibold' : 'regular'}
      color={active ? colors.buttonText : colors.primaryText}>
      {label}
    </PrimaryText>
  </TouchableOpacity>
);

const CategoryRow = ({
  category,
  colors,
  onEdit,
  onDelete,
  prefix,
}: {
  category: Category;
  colors: Colors;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
  prefix?: string;
}) => (
  <View
    style={[
      gs.rounded12,
      gs.rowBetweenCenter,
      gs.px14,
      gs.py12,
      gs.mb6,
      {backgroundColor: colors.containerColor},
    ]}>
    <View style={[gs.rowCenter, gs.flex1]}>
      <View
        style={[
          gs.size36,
          gs.rounded10,
          gs.center,
          {backgroundColor: (category.color || colors.primaryText) + '18'},
        ]}>
        <Icon name={category.icon || 'shapes'} size={18} color={category.color || colors.primaryText} />
      </View>
      <View style={[gs.flex1, gs.ml12]}>
        <PrimaryText weight="medium" size={14} numberOfLines={1}>
          {prefix ? `${prefix}·${category.name}` : category.name}
        </PrimaryText>
      </View>
    </View>
    <View style={[gs.rowCenter, gs.gap8]}>
      <TouchableOpacity onPress={() => onEdit(category)} hitSlop={hitSlop}>
        <Icon name="pencil" size={18} color={colors.secondaryText} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onDelete(category.id)} hitSlop={hitSlop}>
        <Icon name="trash-2" size={18} color={colors.accentOrange} />
      </TouchableOpacity>
    </View>
  </View>
);

const CategoryScreen = () => {
  const {
    colors,
    refreshing,
    onRefresh,
    expenseGroups,
    incomeCategories,
    handleEdit,
    handleDelete,
  } = useCategory();
  const [tab, setTab] = useState<'expense' | 'income'>('expense');
  const [expandedExpenseGroupId, setExpandedExpenseGroupId] = useState<string | null>(null);

  const editCategory = useCallback(
    (category: Category) => {
      handleEdit(
        String(category.id),
        category.name,
        category.icon ?? '',
        category.color ?? colors.primaryText,
        category.kind,
        category.parentId,
      );
    },
    [colors.primaryText, handleEdit],
  );

  const renderExpenseGroup = useCallback(
    (group: ExpenseCategoryGroup) => {
      const isExpanded = expandedExpenseGroupId === group.id;

      return (
        <View key={group.id} style={gs.mb8}>
          <View
            style={[
              gs.rowBetweenCenter,
              gs.px14,
              gs.py12,
              gs.rounded12,
              {backgroundColor: colors.secondaryAccent},
            ]}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setExpandedExpenseGroupId(current => (current === group.id ? null : group.id))}
              style={[gs.rowCenter, gs.flex1]}>
              <View
                style={[
                  gs.size32,
                  gs.rounded10,
                  gs.center,
                  {backgroundColor: (group.color || colors.primaryText) + '18'},
                ]}>
                <Icon name={group.icon || 'shapes'} size={16} color={group.color || colors.primaryText} />
              </View>
              <View style={[gs.flex1, gs.ml10]}>
                <PrimaryText weight="semibold" size={15} numberOfLines={1}>
                  {group.name}
                </PrimaryText>
                <PrimaryText size={11} variant="number" color={colors.secondaryText}>
                  {group.children.length} 个小类
                </PrimaryText>
              </View>
              <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.secondaryText} />
            </TouchableOpacity>
            <View style={[gs.rowCenter, gs.gap8]}>
              <TouchableOpacity
                onPress={() => navigate('AddCategoryScreen', {categoryKind: 'expense', parentId: group.id, parentName: group.name})}
                hitSlop={hitSlop}>
                <Icon name="plus-circle" size={19} color={colors.primaryText} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => editCategory(group)} hitSlop={hitSlop}>
                <Icon name="pencil" size={17} color={colors.secondaryText} />
              </TouchableOpacity>
            </View>
          </View>
          {isExpanded ? (
            <View style={gs.mt8}>
              {group.children.map(child => (
                <CategoryRow
                  key={child.id}
                  category={child}
                  colors={colors}
                  onEdit={editCategory}
                  onDelete={handleDelete}
                />
              ))}
            </View>
          ) : null}
          </View>
      );
    },
    [colors, editCategory, expandedExpenseGroupId, handleDelete],
  );

  const isEmpty = tab === 'expense' ? expenseGroups.length === 0 : incomeCategories.length === 0;

  return (
    <>
      <PrimaryView colors={colors} useSidePadding={false} useBottomPadding={false}>
        <View style={[gs.mb15, gs.px16]}>
          <HeaderContainer headerText={'分类'} />
          <View style={[gs.row, gs.gap8, gs.mt12]}>
            <Segment active={tab === 'expense'} label="支出" onPress={() => setTab('expense')} colors={colors} />
            <Segment active={tab === 'income'} label="收入" onPress={() => setTab('income')} colors={colors} />
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{...gs.px16, ...gs.pb80}}>
          {isEmpty ? (
            <EmptyState colors={colors} type={'Categories'} style={gs.mt30p} />
          ) : tab === 'expense' ? (
            expenseGroups.map(renderExpenseGroup)
          ) : (
            incomeCategories.map(category => (
              <CategoryRow
                key={category.id}
                category={category}
                colors={colors}
                onEdit={editCategory}
                onDelete={handleDelete}
              />
            ))
          )}
        </ScrollView>
      </PrimaryView>
      <View style={[gs.absolute, gs.bottom15, gs.right15, gs.zIndex1]}>
        <TouchableOpacity
          style={[gs.size50, gs.roundedFull, gs.center, {backgroundColor: colors.primaryText}]}
          onPress={() => navigate('AddCategoryScreen', {categoryKind: tab})}
          hitSlop={hitSlop}
          accessibilityLabel="新增分类"
          accessibilityRole="button">
          <Icon name="plus" size={24} color={colors.buttonText} />
        </TouchableOpacity>
      </View>
    </>
  );
};

export default CategoryScreen;
