import {ScrollView, Text, TouchableOpacity, View, Platform, Share} from 'react-native';
import React, {useCallback} from 'react';
import Icon from '../../components/atoms/Icons';
import {goBack, navigate} from '../../utils/navigationUtils';
import useSettings from './useSettings';
import PrimaryView from '../../components/atoms/PrimaryView';
import PrimaryText from '../../components/atoms/PrimaryText';
import RNFS from 'react-native-fs';
import {generateUniqueKey, requestStoragePermission} from '../../utils/dataUtils';
import {getTimestamp} from '../../utils/dateUtils';
import {CURRENT_EXPORT_VERSION} from '../../backend/export/format';
import {SheetManager} from 'react-native-actions-sheet';
import {Colors} from '../../hooks/useThemeColors';
import {gs, hitSlop} from '../../styles/globalStyles';

interface SettingsRowProps {
  icon: string;
  label: string;
  subtitle?: string;
  value?: string;
  valueNode?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  colors: Colors;
}

const SettingsRow: React.FC<SettingsRowProps> = ({icon, label, subtitle, value, valueNode, onPress, destructive, colors}) => (
  <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.6 : 1} disabled={!onPress}>
    <View style={[gs.rowCenter, gs.px14, gs.py12, gs.gap10]}>
      <View style={[gs.size32, gs.rounded8, gs.center, {backgroundColor: colors.secondaryAccent}]}>
        <Icon name={icon} size={16} color={destructive ? colors.accentOrange : colors.secondaryText} />
      </View>
      <View style={[gs.flex1, gs.gap2]}>
        <PrimaryText size={14} weight="medium" color={destructive ? colors.accentOrange : colors.primaryText}>
          {label}
        </PrimaryText>
        {subtitle ? (
          <PrimaryText size={11} color={colors.secondaryText}>{subtitle}</PrimaryText>
        ) : null}
      </View>
      {value ? (
        <PrimaryText size={13} color={colors.secondaryText}>{value}</PrimaryText>
      ) : null}
      {valueNode ?? null}
      {onPress ? <Icon name="chevron-right" size={14} color={colors.secondaryText} /> : null}
    </View>
  </TouchableOpacity>
);

const SettingsScreen = () => {
  const {
    appVersion,
    colors,
    handleThemeSelection,
    handleLanguageSelection,
    handleAccentColorSelection,
    handleNameUpdate,
    handleCurrencyUpdate,
    selectedTheme,
    selectedLanguage,
    selectedAccentColor,
    userName,
    currencySymbol,
    currencyName,
    handleReportBug,
    handleGithub,
    handleDeleteAllData,
    allData,
    handleExportResult,
    requestStorageViaDialog,
    t,
  } = useSettings();

  const themeLabelMap: Record<string, string> = {
    light: t('浅色'),
    dark: t('深色'),
    system: t('跟随系统'),
  };

  const languageLabelMap: Record<string, string> = {
    zh: t('中文'),
    en: t('英语'),
  };

  const accentLabelMap: Record<string, string> = {
    sage: selectedLanguage === 'en' ? 'Sage' : '鼠尾草绿',
    mint: selectedLanguage === 'en' ? 'Mint' : '薄荷绿',
    teal: selectedLanguage === 'en' ? 'Teal' : '湖蓝',
    sky: selectedLanguage === 'en' ? 'Sky' : '天空蓝',
    lavender: selectedLanguage === 'en' ? 'Lavender' : '薰衣草紫',
    coral: selectedLanguage === 'en' ? 'Coral' : '珊瑚橙',
  };

  const handleOpenCurrencySheet = useCallback(() => {
    void SheetManager.show('currency-picker-sheet', {
      payload: {
        selectedCurrency: {code: '', name: currencyName, symbol: currencySymbol},
        onSelect: (currency: {code: string; name: string; symbol: string}) => {
          handleCurrencyUpdate(currency);
        },
      },
    });
  }, [currencyName, currencySymbol, handleCurrencyUpdate]);

  const exportData = async (dataToExport: unknown) => {
    try {
      if (!dataToExport) {
        handleExportResult(false);
        return;
      }

      const currentDateAndTime = getTimestamp();
      const fileName = `zero_v${CURRENT_EXPORT_VERSION}_${currentDateAndTime}.json`;
      const jsonData = JSON.stringify({key: generateUniqueKey(), version: CURRENT_EXPORT_VERSION, data: dataToExport}, null, 2);

      if (Platform.OS === 'ios') {
        const path = `${RNFS.DocumentDirectoryPath}/${fileName}`;

        await RNFS.writeFile(path, jsonData, 'utf8');

        await Share.share({
          url: `file://${path}`,
          title: '导出 Zerox 数据',
        });

        handleExportResult(true);
      } else {
        const storagePermissionGranted = await requestStoragePermission();

        if (!storagePermissionGranted) {
          requestStorageViaDialog();
          return;
        }

        const path = `${RNFS.DownloadDirectoryPath}/${fileName}`;

        await RNFS.writeFile(path, jsonData, 'utf8');
        handleExportResult(true);
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Error saving file:', error);
      }
      handleExportResult(false);
    }
  };

  const openThemePicker = useCallback(() => {
    void SheetManager.show('theme-picker-sheet', {
      payload: {
        currentTheme: selectedTheme,
        onSelect: (theme: string) => {
          handleThemeSelection(theme);
        },
      },
    });
  }, [selectedTheme, handleThemeSelection]);

  const openLanguagePicker = useCallback(() => {
    void SheetManager.show('language-picker-sheet', {
      payload: {
        currentLanguage: selectedLanguage,
        onSelect: handleLanguageSelection,
      },
    });
  }, [handleLanguageSelection, selectedLanguage]);

  const openAccentColorPicker = useCallback(() => {
    void SheetManager.show('accent-color-picker-sheet', {
      payload: {
        currentAccentColor: selectedAccentColor,
        onSelect: handleAccentColorSelection,
      },
    });
  }, [handleAccentColorSelection, selectedAccentColor]);

  return (
    <PrimaryView colors={colors} dismissKeyboardOnTouch>
      <View style={[gs.rowCenter, gs.gap10, gs.mt5p]}>
        <TouchableOpacity onPress={() => goBack()} hitSlop={hitSlop}>
          <Icon name="arrow-left" size={22} color={colors.primaryText} />
        </TouchableOpacity>
        <PrimaryText size={22} weight="semibold">{t('设置')}</PrimaryText>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={gs.pb80}>
        <PrimaryText
          size={11}
          weight="semibold"
          color={colors.accentGreen}
          style={[gs.mt20, gs.mb6, {letterSpacing: 0.8}]}>
          {t('个性化')}
        </PrimaryText>
        <View style={[gs.rounded12, gs.overflowHidden, {backgroundColor: colors.containerColor}]}>
          <SettingsRow
            colors={colors}
            icon="sun-moon"
            label={t('深/浅模式')}
            value={themeLabelMap[selectedTheme] ?? selectedTheme}
            onPress={openThemePicker}
          />
          <View style={[gs.mx16, {height: 1, backgroundColor: colors.secondaryAccent}]} />
          <SettingsRow
            colors={colors}
            icon="palette"
            label={t('主题色')}
            value={accentLabelMap[selectedAccentColor] ?? selectedAccentColor}
            onPress={openAccentColorPicker}
          />
          <View style={[gs.mx16, {height: 1, backgroundColor: colors.secondaryAccent}]} />
          <SettingsRow
            colors={colors}
            icon="globe"
            label={t('语言')}
            value={languageLabelMap[selectedLanguage] ?? selectedLanguage}
            onPress={openLanguagePicker}
          />
          <View style={[gs.mx16, {height: 1, backgroundColor: colors.secondaryAccent}]} />
          <SettingsRow
            colors={colors}
            icon="user"
            label={t('昵称')}
            value={userName}
            onPress={() => {
              void SheetManager.show('change-name-sheet', {
                payload: {
                  currentName: userName,
                  onUpdate: (newName: string) => {
                    handleNameUpdate(newName);
                  },
                },
              });
            }}
          />
          <View style={[gs.mx16, {height: 1, backgroundColor: colors.secondaryAccent}]} />
          <SettingsRow
            colors={colors}
            icon="banknote"
            label={t('货币')}
            onPress={handleOpenCurrencySheet}
            valueNode={
              <View style={gs.itemsEnd}>
                <PrimaryText size={13} color={colors.secondaryText} variant="number">{currencySymbol}</PrimaryText>
                <PrimaryText size={10} color={colors.secondaryText}>{currencyName}</PrimaryText>
              </View>
            }
          />
        </View>

        <PrimaryText
          size={11}
          weight="semibold"
          color={colors.accentGreen}
          style={[gs.mt20, gs.mb6, {letterSpacing: 0.8}]}>
          {t('AI 快速记账')}
        </PrimaryText>
        <View style={[gs.rounded12, gs.overflowHidden, {backgroundColor: colors.containerColor}]}>
          <SettingsRow
            colors={colors}
            icon="bot"
            label={t('LLM API 配置')}
            subtitle={t('OpenAI 兼容接口，本地保存 API Key')}
            onPress={() => navigate('AiSettingsScreen')}
          />
        </View>

        <PrimaryText
          size={11}
          weight="semibold"
          color={colors.accentGreen}
          style={[gs.mt20, gs.mb6, {letterSpacing: 0.8}]}>
          {t('数据')}
        </PrimaryText>
        <View style={[gs.rounded12, gs.overflowHidden, {backgroundColor: colors.containerColor}]}>
          <SettingsRow
            colors={colors}
            icon="download"
            label={t('导出数据')}
            subtitle={t('稍后可在新设备导入')}
            onPress={() => exportData(allData)}
          />
          <View style={[gs.mx16, {height: 1, backgroundColor: colors.secondaryAccent}]} />
          <SettingsRow
            colors={colors}
            icon="trash-2"
            label={t('删除所有数据')}
            subtitle={t('此操作无法撤销')}
            onPress={handleDeleteAllData}
            destructive
          />
        </View>

        <PrimaryText
          size={11}
          weight="semibold"
          color={colors.accentGreen}
          style={[gs.mt20, gs.mb6, {letterSpacing: 0.8}]}>
          {t('关于')}
        </PrimaryText>
        <View style={[gs.rounded12, gs.overflowHidden, {backgroundColor: colors.containerColor}]}>
          <SettingsRow
            colors={colors}
            icon="bug"
            label={t('反馈问题')}
            subtitle={t('在 GitHub 提交 issue')}
            onPress={handleReportBug}
          />
          <View style={[gs.mx16, {height: 1, backgroundColor: colors.secondaryAccent}]} />
          <SettingsRow
            colors={colors}
            icon="code"
            label={t('源代码')}
            subtitle={t('在 GitHub 查看')}
            onPress={handleGithub}
          />
          <View style={[gs.mx16, {height: 1, backgroundColor: colors.secondaryAccent}]} />
          <SettingsRow
            colors={colors}
            icon="info"
            label={t('版本')}
            value={`v${appVersion}`}
          />
        </View>

        <View style={[gs.mt20, gs.mb10, gs.center, gs.gap2]}>
          <PrimaryText size={11} color={colors.secondaryText}>
            {t('保持简单，清楚记账')}
          </PrimaryText>
          <PrimaryText size={11} color={colors.secondaryText}>
            {t('使用')} <Text style={{color: colors.accentGreen}}>Zerox</Text> {t('管理日常支出')}
          </PrimaryText>
        </View>
      </ScrollView>

    </PrimaryView>
  );
};

export default SettingsScreen;
