import {TouchableOpacity, View} from 'react-native';
import React from 'react';
import PrimaryButton from '../../components/atoms/PrimaryButton';
import usePersonalize from './usePersonalize';
import PrimaryView from '../../components/atoms/PrimaryView';
import PrimaryText from '../../components/atoms/PrimaryText';
import CustomInput from '../../components/atoms/CustomInput';
import {gs} from '../../styles/globalStyles';
import {useLanguage} from '../../context/LanguageContext';

const PersonalizeScreen = () => {
  const {colors, setName, name, handleSubmit, handleSkip, nameSchema} = usePersonalize();
  const {t} = useLanguage();
  const isValid = nameSchema.safeParse(name).success;

  return (
    <PrimaryView colors={colors} style={gs.justifyBetween} dismissKeyboardOnTouch>
      <View>
        <TouchableOpacity style={[gs.selfEnd, gs.pt5p]} onPress={handleSkip}>
          <PrimaryText size={13} weight="medium" color={colors.secondaryText}>{t('跳过')}</PrimaryText>
        </TouchableOpacity>

        <View style={gs.pt15p}>
          <PrimaryText size={28} weight="bold">{t('怎么称呼你？')}</PrimaryText>
        </View>

        <PrimaryText size={14} color={colors.secondaryText} style={gs.mt6}>
          {t('用来让账本显示得更亲切')}
        </PrimaryText>

        <View style={gs.mt30}>
          <CustomInput
            input={name}
            label={t('昵称')}
            colors={colors}
            placeholder={t('例如 小林')}
            setInput={setName}
            schema={nameSchema}
          />
        </View>
      </View>
      <PrimaryButton onPress={handleSubmit} colors={colors} buttonTitle={t('继续')} disabled={!isValid} />
    </PrimaryView>
  );
};

export default PersonalizeScreen;
