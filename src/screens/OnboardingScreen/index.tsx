import {ScrollView, TouchableOpacity, View} from 'react-native';
import React from 'react';
import PrimaryButton from '../../components/atoms/PrimaryButton';
import useOnboarding from './useOnboarding';
import PrimaryView from '../../components/atoms/PrimaryView';
import PrimaryText from '../../components/atoms/PrimaryText';
import Icon from '../../components/atoms/Icons';
import {gs} from '../../styles/globalStyles';

interface CategoryData {
  name: string;
  icon?: string;
  color?: string;
  parentName?: string;
  parentIcon?: string;
  parentColor?: string;
}

const OnboardingScreen = () => {
  const {
    colors,
    language,
    setLanguage,
    t,
    defaultExpenseCategories,
    handleSkip,
    handleSubmit,
    toggleCategorySelection,
    isCategorySelected,
  } = useOnboarding();

  return (
    <PrimaryView colors={colors} style={gs.justifyBetween}>
      <View style={gs.flex1}>
        <TouchableOpacity style={[gs.selfEnd, gs.pt5p]} onPress={handleSkip}>
          <PrimaryText size={13} weight="medium" color={colors.secondaryText}>{t('跳过')}</PrimaryText>
        </TouchableOpacity>

        <View style={gs.pt10p}>
          <PrimaryText size={28} weight="bold">{t('选择常用分类')}</PrimaryText>
        </View>

        <PrimaryText size={14} color={colors.secondaryText} style={[gs.mt6, gs.mb20]}>
          {t('选择你想记录的支出类型')}
        </PrimaryText>

        <View style={[gs.row, gs.gap8, gs.mb10]}>
          {(['zh', 'en'] as const).map(item => (
            <TouchableOpacity
              key={item}
              onPress={() => setLanguage(item)}
              activeOpacity={0.7}
              style={[
                gs.py8,
                gs.px14,
                gs.rounded12,
                {backgroundColor: language === item ? colors.primaryText : colors.secondaryAccent},
              ]}>
              <PrimaryText
                size={13}
                weight={language === item ? 'semibold' : 'regular'}
                color={language === item ? colors.buttonText : colors.primaryText}>
                {item === 'zh' ? '中文' : 'English'}
              </PrimaryText>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[gs.row, gs.wrap, gs.pb80]}>
          {defaultExpenseCategories.flatMap(group =>
            group.children.map(child => ({
              name: child.name,
              icon: child.icon,
              color: group.color,
              parentName: group.name,
              parentIcon: group.icon,
              parentColor: group.color,
            })),
          ).map((category: CategoryData) => {
            const isSelected = isCategorySelected(category.name, category.parentName);

            return (
              <TouchableOpacity key={category.name} onPress={() => toggleCategorySelection(category)} activeOpacity={0.7}>
                <View
                  style={[
                    gs.py8,
                    gs.px14,
                    gs.mr8,
                    gs.mt10,
                    gs.rounded12,
                    gs.rowCenter,
                    gs.gap6,
                    {
                      backgroundColor: isSelected ? colors.primaryText : colors.secondaryAccent,
                    },
                  ]}>
                  {category.icon !== undefined && (
                    <Icon
                      name={category.icon}
                      size={16}
                      color={isSelected ? colors.buttonText : (category.color ?? colors.secondaryText)}
                    />
                  )}
                  <PrimaryText
                    size={13}
                    weight={isSelected ? 'semibold' : 'regular'}
                    color={isSelected ? colors.buttonText : colors.primaryText}>
                    {category.parentName}·{category.name}
                  </PrimaryText>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      <PrimaryButton onPress={handleSubmit} colors={colors} buttonTitle={t('继续')} />
    </PrimaryView>
  );
};

export default OnboardingScreen;
