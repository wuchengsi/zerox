import {RefreshControl, ScrollView, TouchableOpacity, View} from 'react-native';
import React, {memo, useCallback, useEffect, useRef, useState} from 'react';
import Animated, {interpolate, SharedValue, useAnimatedStyle} from 'react-native-reanimated';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import {TouchableOpacity as GestureTouchableOpacity} from 'react-native-gesture-handler';
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
  prefix,
}: {
  category: Category;
  colors: Colors;
  onEdit: (category: Category) => void;
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
    </View>
  </View>
);

const ACTION_WIDTH = 50;

const CategoryDeleteAction = ({
  progress,
  colors,
  onPress,
}: {
  progress: SharedValue<number>;
  colors: Colors;
  onPress: () => void;
}) => {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.6, 1], [0, 0.8, 1]),
    transform: [{scale: interpolate(progress.value, [0, 1], [0.6, 1])}],
  }));

  return (
    <GestureTouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[gs.center, {flex: 1, width: ACTION_WIDTH}]}>
      <Animated.View style={[gs.size40, gs.roundedFull, gs.center, animatedStyle, {backgroundColor: colors.lightAccent}]}>
        <Icon name="trash-2" size={18} color={colors.accentOrange} />
      </Animated.View>
    </GestureTouchableOpacity>
  );
};

const InlineUndo = memo(({
  colors,
  onUndo,
}: {
  colors: Colors;
  onUndo: () => void;
}) => (
  <View style={gs.mb6}>
    <View
      style={[
        gs.rounded12,
        gs.rowBetweenCenter,
        gs.px14,
        gs.py12,
        {backgroundColor: colors.secondaryAccent},
      ]}>
      <PrimaryText size={13} color={colors.secondaryText}>
        分类已删除
      </PrimaryText>
      <TouchableOpacity
        onPress={onUndo}
        activeOpacity={0.7}
        style={[gs.py8, gs.px14, gs.rounded10, {backgroundColor: colors.accentGreen}]}>
        <PrimaryText size={12} weight="semibold" color={colors.buttonText}>
          撤销
        </PrimaryText>
      </TouchableOpacity>
    </View>
  </View>
));

const DELETE_DELAY_MS = 3000;

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
  const deletionTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(() => new Set());

  useEffect(
    () => () => {
      deletionTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      deletionTimeoutsRef.current.clear();
    },
    [],
  );

  const removePendingDeleteId = useCallback((categoryId: string) => {
    setPendingDeleteIds(prev => {
      if (!prev.has(categoryId)) {
        return prev;
      }

      const next = new Set(prev);
      next.delete(categoryId);
      return next;
    });
  }, []);

  const scheduleDelete = useCallback(
    (categoryId: string) => {
      setPendingDeleteIds(prev => new Set(prev).add(categoryId));

      const existingTimeout = deletionTimeoutsRef.current.get(categoryId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      const timeout = setTimeout(async () => {
        deletionTimeoutsRef.current.delete(categoryId);
        removePendingDeleteId(categoryId);
        await handleDelete(categoryId);
      }, DELETE_DELAY_MS);

      deletionTimeoutsRef.current.set(categoryId, timeout);
    },
    [handleDelete, removePendingDeleteId],
  );

  const handleUndoDelete = useCallback(
    (categoryId: string) => {
      const timeout = deletionTimeoutsRef.current.get(categoryId);
      if (timeout) {
        clearTimeout(timeout);
        deletionTimeoutsRef.current.delete(categoryId);
      }
      removePendingDeleteId(categoryId);
    },
    [removePendingDeleteId],
  );

  const renderPendingDelete = useCallback(
    (categoryId: string) => (
      <InlineUndo colors={colors} onUndo={() => handleUndoDelete(categoryId)} />
    ),
    [colors, handleUndoDelete],
  );

  const editCategory = useCallback(
    (category: Category) => {
      handleEdit(
        String(category.id),
        category.name,
        category.icon ?? '',
        category.color ?? colors.primaryText,
        category.kind,
        category.parentId,
        category.parent?.name,
      );
    },
    [colors.primaryText, handleEdit],
  );

  const renderExpenseGroup = useCallback(
    (group: ExpenseCategoryGroup) => {
      if (pendingDeleteIds.has(group.id)) {
        return (
          <View key={group.id} style={gs.mb8}>
            {renderPendingDelete(group.id)}
          </View>
        );
      }

      const isExpanded = expandedExpenseGroupId === group.id;
      const toggleGroup = () => setExpandedExpenseGroupId(current => (current === group.id ? null : group.id));
      const deleteGroup = () => {
        if (isExpanded) {
          setExpandedExpenseGroupId(null);
        }
        scheduleDelete(group.id);
      };

      return (
        <View key={group.id} style={gs.mb8}>
          <ReanimatedSwipeable
            renderRightActions={(progress, _translation, swipeableMethods) => (
              <CategoryDeleteAction
                progress={progress}
                colors={colors}
                onPress={() => {
                  swipeableMethods.close();
                  deleteGroup();
                }}
              />
            )}
            friction={2}
            overshootRight={false}
            overshootFriction={8}>
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
                onPress={toggleGroup}
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
              </TouchableOpacity>
              <View style={[gs.rowCenter, gs.gap8, gs.ml8]}>
                <TouchableOpacity
                  onPress={() => navigate('AddCategoryScreen', {categoryKind: 'expense', parentId: group.id, parentName: group.name})}
                  hitSlop={hitSlop}>
                  <Icon name="plus-circle" size={19} color={colors.primaryText} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => editCategory(group)} hitSlop={hitSlop}>
                  <Icon name="pencil" size={17} color={colors.secondaryText} />
                </TouchableOpacity>
                <TouchableOpacity onPress={toggleGroup} hitSlop={hitSlop}>
                  <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.secondaryText} />
                </TouchableOpacity>
              </View>
            </View>
          </ReanimatedSwipeable>
          {isExpanded ? (
            <View style={gs.mt8}>
              {group.children.map(child => (
                pendingDeleteIds.has(child.id) ? (
                  <View key={child.id}>{renderPendingDelete(child.id)}</View>
                ) : (
                  <ReanimatedSwipeable
                    key={child.id}
                    renderRightActions={(progress, _translation, swipeableMethods) => (
                      <CategoryDeleteAction
                        progress={progress}
                        colors={colors}
                        onPress={() => {
                          swipeableMethods.close();
                          scheduleDelete(child.id);
                        }}
                      />
                    )}
                    friction={2}
                    overshootRight={false}
                    overshootFriction={8}>
                    <CategoryRow
                      category={child}
                      colors={colors}
                      onEdit={editCategory}
                    />
                  </ReanimatedSwipeable>
                )
              ))}
            </View>
          ) : null}
        </View>
      );
    },
    [colors, editCategory, expandedExpenseGroupId, handleUndoDelete, pendingDeleteIds, renderPendingDelete, scheduleDelete],
  );

  const isEmpty = tab === 'expense' ? expenseGroups.length === 0 : incomeCategories.length === 0;

  return (
    <>
      <PrimaryView colors={colors} useSidePadding={false} useBottomPadding={false}>
        <View style={[gs.mb15, gs.px16]}>
          <HeaderContainer headerText={'分类'} />
          <View style={[gs.row, gs.gap8, gs.mt10]}>
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
              pendingDeleteIds.has(category.id) ? (
                <View key={category.id}>{renderPendingDelete(category.id)}</View>
              ) : (
                <ReanimatedSwipeable
                  key={category.id}
                  renderRightActions={(progress, _translation, swipeableMethods) => (
                    <CategoryDeleteAction
                      progress={progress}
                      colors={colors}
                      onPress={() => {
                        swipeableMethods.close();
                        scheduleDelete(category.id);
                      }}
                    />
                  )}
                  friction={2}
                  overshootRight={false}
                  overshootFriction={8}>
                  <CategoryRow
                    category={category}
                    colors={colors}
                    onEdit={editCategory}
                  />
                </ReanimatedSwipeable>
              )
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
