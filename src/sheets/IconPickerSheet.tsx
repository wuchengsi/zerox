import {TouchableOpacity, View, useWindowDimensions} from 'react-native';
import React, {useCallback, useMemo, useState} from 'react';
import {SheetManager, SheetProps} from 'react-native-actions-sheet';
import {FlatList} from 'react-native-gesture-handler';
import {CustomBottomSheet} from '../components/atoms/CustomBottomSheet';
import useThemeColors from '../hooks/useThemeColors';
import CustomInput from '../components/atoms/CustomInput';
import Icon from '../components/atoms/Icons';
import PrimaryText from '../components/atoms/PrimaryText';
import {CATEGORY_ICON_SEARCH_ALIASES, CATEGORY_ICONS} from '../constants/categoryIcons';
import {gs} from '../styles/globalStyles';
import {useLanguage} from '../context/LanguageContext';

const IconPickerSheet: React.FC<SheetProps<'icon-picker-sheet'>> = React.memo(props => {
  const colors = useThemeColors();
  const {t} = useLanguage();
  const [searchText, setSearchText] = useState('');
  const selectedIcon = props.payload?.selectedIcon ?? 'null';

  const {width: screenWidth} = useWindowDimensions();
  const iconsPerRow = 6;
  const iconSize = (screenWidth * 0.85) / iconsPerRow;

  const filteredIcons = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    if (!normalizedSearch) {
      return CATEGORY_ICONS;
    }

    return CATEGORY_ICONS.filter(iconName => {
      const aliases = CATEGORY_ICON_SEARCH_ALIASES[iconName] ?? [];
      return [iconName, ...aliases].some(searchToken => searchToken.toLowerCase().includes(normalizedSearch));
    });
  }, [searchText]);

  const handleSelectIcon = useCallback(
    (iconName: string) => {
      props.payload?.onSelect?.(iconName);
    },
    [props.payload],
  );

  const handleClose = useCallback(() => {
    setSearchText('');
  }, []);

  const renderIconItem = useCallback(
    ({item}: {item: string}) => (
      <TouchableOpacity
        style={[
          gs.m8,
          gs.center,
          gs.rounded8,
          {
            width: iconSize,
            height: iconSize,
            backgroundColor: selectedIcon === item ? colors.primaryText : undefined,
          },
        ]}
        onPress={() => handleSelectIcon(item)}>
        <Icon name={item} size={30} color={selectedIcon === item ? colors.containerColor : colors.secondaryText} />
      </TouchableOpacity>
    ),
    [colors, selectedIcon, iconSize, handleSelectIcon],
  );

  return (
    <CustomBottomSheet
      sheetId={props.sheetId}
      header={{
        title: t('选择图标'),
        showCloseButton: true,
        onClosePress: () => {
          SheetManager.hide(props.sheetId);
        },
      }}
      onClose={handleClose}
      gestureEnabled>
      <View style={gs.px15}>
        <CustomInput
          input={searchText}
          label={undefined}
          colors={colors}
          placeholder={t('搜索图标')}
          setInput={setSearchText}
          schema={undefined}
        />
      </View>

      <View style={[gs.h350, gs.px10]}>
        <FlatList
          data={filteredIcons}
          renderItem={renderIconItem}
          numColumns={6}
          keyExtractor={(iconItem: string) => iconItem}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={[gs.center, gs.py20]}>
              <PrimaryText size={12} color={colors.secondaryText}>
                {t('没有匹配的图标')}
              </PrimaryText>
            </View>
          }
        />
      </View>
    </CustomBottomSheet>
  );
});

export default IconPickerSheet;
