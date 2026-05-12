import {TouchableOpacity, View} from 'react-native';
import React, {useCallback, useEffect, useState} from 'react';
import Icon from '../atoms/Icons';
import PrimaryText from '../atoms/PrimaryText';
import type {Colors} from '../../hooks/useThemeColors';
import type {CategoryData, ExpenseCategoryGroup} from '../../watermelondb/services';
import {gs} from '../../styles/globalStyles';

interface ExpenseCategoryAccordionProps {
  groups: ExpenseCategoryGroup[];
  colors: Colors;
  selectedCategories: CategoryData[];
  toggleCategorySelection(category: CategoryData): void;
}

const ExpenseCategoryAccordion: React.FC<ExpenseCategoryAccordionProps> = React.memo(
  ({groups, colors, selectedCategories, toggleCategorySelection}) => {
    const selectedCategory = selectedCategories[0];
    const [expandedParentId, setExpandedParentId] = useState<string | null>(null);

    useEffect(() => {
      if (selectedCategory?.parentId) {
        setExpandedParentId(selectedCategory.parentId);
      }
    }, [selectedCategory?.parentId]);

    const handleToggleParent = useCallback((parentId: string) => {
      setExpandedParentId(current => (current === parentId ? null : parentId));
    }, []);

    return (
      <View>
        {groups.map(group => {
          const isExpanded = expandedParentId === group.id;
          const selectedInGroup = selectedCategory?.parentId === group.id;

          return (
            <View key={group.id} style={gs.mb8}>
              <TouchableOpacity
                onPress={() => handleToggleParent(group.id)}
                activeOpacity={0.7}
                style={[
                  gs.rowBetweenCenter,
                  gs.px14,
                  gs.py12,
                  gs.rounded12,
                  {
                    backgroundColor: selectedInGroup ? colors.primaryText : colors.secondaryAccent,
                  },
                ]}>
                <View style={[gs.rowCenter, gs.flex1]}>
                  <View
                    style={[
                      gs.size32,
                      gs.rounded10,
                      gs.center,
                      {
                        backgroundColor: selectedInGroup
                          ? colors.buttonText + '22'
                          : (group.color || colors.primaryText) + '18',
                      },
                    ]}>
                    <Icon
                      name={group.icon || 'shapes'}
                      size={16}
                      color={selectedInGroup ? colors.buttonText : group.color || colors.primaryText}
                    />
                  </View>
                  <View style={[gs.flex1, gs.ml10]}>
                    <PrimaryText
                      size={14}
                      weight="semibold"
                      numberOfLines={1}
                      color={selectedInGroup ? colors.buttonText : colors.primaryText}>
                      {group.name}
                    </PrimaryText>
                    <PrimaryText
                      size={11}
                      variant="number"
                      color={selectedInGroup ? colors.buttonText : colors.secondaryText}
                      style={selectedInGroup ? {opacity: 0.75} : undefined}>
                      {group.children.length} 个小类
                    </PrimaryText>
                  </View>
                </View>
                <Icon
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={selectedInGroup ? colors.buttonText : colors.secondaryText}
                />
              </TouchableOpacity>

              {isExpanded ? (
                <View style={[gs.row, gs.wrap, gs.mt8, gs.ml8]}>
                  {group.children.map(child => {
                    const isSelected = selectedCategory?.id === child.id;

                    return (
                      <TouchableOpacity
                        key={child.id}
                        onPress={() => toggleCategorySelection(child)}
                        activeOpacity={0.7}>
                        <View
                          style={[
                            gs.py8,
                            gs.px14,
                            gs.mr8,
                            gs.mb8,
                            gs.rounded12,
                            gs.rowCenter,
                            gs.gap6,
                            {
                              backgroundColor: isSelected ? colors.primaryText : colors.containerColor,
                            },
                          ]}>
                          {!!child.icon && (
                            <Icon
                              name={child.icon}
                              size={16}
                              color={isSelected ? colors.buttonText : child.color || group.color || colors.secondaryText}
                            />
                          )}
                          <PrimaryText
                            size={13}
                            weight={isSelected ? 'semibold' : 'regular'}
                            color={isSelected ? colors.buttonText : colors.primaryText}>
                            {child.name}
                          </PrimaryText>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    );
  },
);

export default ExpenseCategoryAccordion;
