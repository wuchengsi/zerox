import {TouchableOpacity, View} from 'react-native';
import React, {useCallback, useState} from 'react';
import {SheetManager, SheetProps} from 'react-native-actions-sheet';
import {ACCENT_COLORS, AccentColorId, useLanguage, useTheme} from '../context';
import {CustomBottomSheet} from '../components/atoms/CustomBottomSheet';
import PrimaryText from '../components/atoms/PrimaryText';
import {gs} from '../styles/globalStyles';

const AccentColorPickerSheet: React.FC<SheetProps<'accent-color-picker-sheet'>> = React.memo(props => {
  const {colors, resolvedTheme} = useTheme();
  const {t, language} = useLanguage();
  const [selected, setSelected] = useState<AccentColorId>(props.payload?.currentAccentColor ?? 'sage');

  const handleConfirm = useCallback(() => {
    props.payload?.onSelect?.(selected);
    void SheetManager.hide(props.sheetId);
  }, [props, selected]);

  return (
    <CustomBottomSheet
      sheetId={props.sheetId}
      header={{
        title: t('选择主题色'),
        showCloseButton: true,
        onClosePress: () => void SheetManager.hide(props.sheetId),
      }}
      gestureEnabled>
      <View style={[gs.px20, gs.pb10, gs.pt5]}>
        {ACCENT_COLORS.map(option => {
          const color = resolvedTheme === 'dark' ? option.dark : option.light;
          const label = language === 'en'
            ? ({
                sage: 'Sage',
                mint: 'Mint',
                teal: 'Teal',
                sky: 'Sky',
                lavender: 'Lavender',
                coral: 'Coral',
              }[option.id])
            : option.label;

          return (
            <TouchableOpacity key={option.id} onPress={() => setSelected(option.id)} activeOpacity={0.6}>
              <View style={[gs.rowBetweenCenter, gs.py12]}>
                <View style={[gs.rowCenter, gs.gap10]}>
                  <View style={[gs.size24, gs.roundedFull, {backgroundColor: color}]} />
                  <PrimaryText size={15} weight={selected === option.id ? 'semibold' : 'medium'}>
                    {label}
                  </PrimaryText>
                </View>
                <View
                  style={[
                    gs.size20,
                    gs.rounded10,
                    gs.border2,
                    gs.center,
                    {borderColor: selected === option.id ? colors.accentGreen : colors.secondaryText},
                  ]}>
                  {selected === option.id ? (
                    <View style={[gs.size10, gs.rounded5, {backgroundColor: colors.accentGreen}]} />
                  ) : null}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
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

export default AccentColorPickerSheet;

