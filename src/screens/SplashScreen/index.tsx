import React from 'react';
import PrimaryButton from '../../components/atoms/PrimaryButton';
import useSplash from './useSplash';
import PrimaryView from '../../components/atoms/PrimaryView';
import PrimaryText from '../../components/atoms/PrimaryText';
import {View} from 'react-native';
import {gs} from '../../styles/globalStyles';

const SplashScreen = () => {
  const {handleClick, colors} = useSplash();

  return (
    <PrimaryView colors={colors} style={gs.justifyBetween}>
      <View style={gs.pt20p}>
        <PrimaryText size={72} weight="bold" color={colors.primaryText}>
          zerox
        </PrimaryText>
        <View style={gs.mt10}>
          <PrimaryText size={18} color={colors.secondaryText}>
            认真记录每一笔。
          </PrimaryText>
          <PrimaryText size={18} color={colors.secondaryText} style={{opacity: 0.5}}>
            数据留在本地。
          </PrimaryText>
        </View>
      </View>
      <PrimaryButton onPress={handleClick} colors={colors} buttonTitle={'开始使用'} />
    </PrimaryView>
  );
};

export default SplashScreen;
