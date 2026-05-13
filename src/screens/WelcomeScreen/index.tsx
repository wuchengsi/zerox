import {View} from 'react-native';
import React from 'react';
import PrimaryView from '../../components/atoms/PrimaryView';
import PrimaryText from '../../components/atoms/PrimaryText';
import PrimaryButton from '../../components/atoms/PrimaryButton';
import Carousel from '../../components/atoms/Carousel';
import useWelcome from './useWelcome';
import {gs} from '../../styles/globalStyles';
import {useLanguage} from '../../context/LanguageContext';

const WelcomeScreen = () => {
  const {colors, handleAllreadyUser, handleNewUser} = useWelcome();
  const {language} = useLanguage();

  return (
    <PrimaryView colors={colors} style={gs.justifyBetween}>
      <View style={gs.pt15p}>
        <PrimaryText size={28} weight="bold" color={colors.primaryText}>
          {language === 'en' ? 'Welcome to ' : '欢迎使用 '}
          <PrimaryText size={28} weight="bold" color={colors.accentGreen}>
            zerox
          </PrimaryText>
        </PrimaryText>
        <PrimaryText size={14} color={colors.secondaryText} style={gs.mt6}>
          {language === 'en' ? 'Your ledger stays on your device.' : '你的账本，留在你的设备上。'}
        </PrimaryText>
      </View>

      <Carousel />

      <View style={gs.gap12}>
        <PrimaryButton onPress={handleNewUser} colors={colors} buttonTitle={language === 'en' ? 'Get started' : '开始使用'} />
        <PrimaryButton onPress={handleAllreadyUser} colors={colors} buttonTitle={language === 'en' ? 'I have a backup' : '我有备份'} variant="outline" />
      </View>
    </PrimaryView>
  );
};

export default WelcomeScreen;
