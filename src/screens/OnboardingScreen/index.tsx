import {TouchableOpacity, View} from 'react-native';
import React from 'react';
import PrimaryButton from '../../components/atoms/PrimaryButton';
import useOnboarding from './useOnboarding';
import PrimaryView from '../../components/atoms/PrimaryView';
import PrimaryText from '../../components/atoms/PrimaryText';
import {gs} from '../../styles/globalStyles';

const OnboardingScreen = () => {
  const {
    colors,
    language,
    setLanguage,
    t,
    handleContinue,
  } = useOnboarding();

  return (
    <PrimaryView colors={colors} style={gs.justifyBetween}>
      <View>
        <View style={gs.pt15p}>
          <PrimaryText size={28} weight="bold">{t('选择语言')}</PrimaryText>
        </View>

        <PrimaryText size={14} color={colors.secondaryText} style={[gs.mt6, gs.mb20]}>
          {t('稍后也可以在设置中修改')}
        </PrimaryText>

        <View style={gs.gap10}>
          {(['zh', 'en'] as const).map(item => {
            const active = language === item;
            return (
              <TouchableOpacity
                key={item}
                onPress={() => void setLanguage(item)}
                activeOpacity={0.7}
                style={[
                  gs.rounded12,
                  gs.px14,
                  gs.py12,
                  {
                    backgroundColor: active ? colors.primaryText : colors.secondaryAccent,
                  },
                ]}>
                <PrimaryText
                  size={15}
                  weight={active ? 'semibold' : 'regular'}
                  color={active ? colors.buttonText : colors.primaryText}>
                  {item === 'zh' ? '中文' : 'English'}
                </PrimaryText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <PrimaryButton onPress={handleContinue} colors={colors} buttonTitle={t('开始使用')} />
    </PrimaryView>
  );
};

export default OnboardingScreen;
