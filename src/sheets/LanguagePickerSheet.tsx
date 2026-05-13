import {TouchableOpacity, View} from 'react-native';
import React, {useCallback, useState} from 'react';
import {SheetManager, SheetProps} from 'react-native-actions-sheet';
import useThemeColors from '../hooks/useThemeColors';
import {CustomBottomSheet} from '../components/atoms/CustomBottomSheet';
import PrimaryText from '../components/atoms/PrimaryText';
import {LanguageCode, useLanguage} from '../context/LanguageContext';
import {gs} from '../styles/globalStyles';

const LANGUAGES: Array<{code: LanguageCode; label: string}> = [
  {code: 'zh', label: '中文'},
  {code: 'en', label: 'English'},
];

const LanguagePickerSheet: React.FC<SheetProps<'language-picker-sheet'>> = React.memo(props => {
  const colors = useThemeColors();
  const {t} = useLanguage();
  const [selected, setSelected] = useState<LanguageCode>(props.payload?.currentLanguage ?? 'zh');

  const handleConfirm = useCallback(() => {
    props.payload?.onSelect?.(selected);
    void SheetManager.hide(props.sheetId);
  }, [props, selected]);

  return (
    <CustomBottomSheet
      sheetId={props.sheetId}
      header={{
        title: t('选择语言'),
        showCloseButton: true,
        onClosePress: () => void SheetManager.hide(props.sheetId),
      }}
      gestureEnabled>
      <View style={[gs.px20, gs.pb10, gs.pt5]}>
        {LANGUAGES.map(language => (
          <TouchableOpacity key={language.code} onPress={() => setSelected(language.code)} activeOpacity={0.6}>
            <View style={[gs.rowBetweenCenter, gs.py12]}>
              <PrimaryText size={15} weight={selected === language.code ? 'semibold' : 'medium'}>
                {language.label}
              </PrimaryText>
              <View
                style={[
                  gs.size20,
                  gs.rounded10,
                  gs.border2,
                  gs.center,
                  {borderColor: selected === language.code ? colors.accentGreen : colors.secondaryText},
                ]}>
                {selected === language.code ? (
                  <View style={[gs.size10, gs.rounded5, {backgroundColor: colors.accentGreen}]} />
                ) : null}
              </View>
            </View>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          onPress={handleConfirm}
          activeOpacity={0.7}
          style={[gs.mt10, gs.py12, gs.rounded10, gs.center, {backgroundColor: colors.accentGreen}]}>
          <PrimaryText size={14} weight="semibold" color={colors.buttonText}>
            {t('应用')}
          </PrimaryText>
        </TouchableOpacity>
      </View>
    </CustomBottomSheet>
  );
});

export default LanguagePickerSheet;

