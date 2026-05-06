import {ScrollView, View} from 'react-native';
import React, {useCallback, useState} from 'react';
import AppHeader from '../../components/atoms/AppHeader';
import CustomInput from '../../components/atoms/CustomInput';
import PrimaryButton from '../../components/atoms/PrimaryButton';
import PrimaryText from '../../components/atoms/PrimaryText';
import PrimaryView from '../../components/atoms/PrimaryView';
import useThemeColors from '../../hooks/useThemeColors';
import {useDialog} from '../../context/DialogContext';
import {goBack} from '../../utils/navigationUtils';
import {clearAiSettings, getAiSettings, saveAiSettings} from '../../services/aiSettingsService';
import {gs} from '../../styles/globalStyles';

const AiSettingsScreen = () => {
  const colors = useThemeColors();
  const {showAlert, showDialog} = useDialog();
  const initialSettings = getAiSettings();
  const [apiBaseUrl, setApiBaseUrl] = useState(initialSettings.apiBaseUrl);
  const [apiKey, setApiKey] = useState(initialSettings.apiKey);
  const [modelName, setModelName] = useState(initialSettings.modelName);
  const [showApiKey, setShowApiKey] = useState(false);

  const handleSave = useCallback(async () => {
    saveAiSettings({apiBaseUrl, apiKey, modelName});
    await showAlert({
      type: 'success',
      message: 'AI 配置已保存',
      okLabel: '知道了',
    });
  }, [apiBaseUrl, apiKey, modelName, showAlert]);

  const handleClear = useCallback(async () => {
    const confirmed = await showDialog({
      type: 'warning',
      message: '确定要清空 AI 配置吗？',
      okLabel: '清空',
      cancelLabel: '取消',
    });

    if (!confirmed) {
      return;
    }

    clearAiSettings();
    setApiBaseUrl('');
    setApiKey('');
    setModelName('');
    await showAlert({
      type: 'success',
      message: 'AI 配置已清空',
      okLabel: '知道了',
    });
  }, [showAlert, showDialog]);

  return (
    <PrimaryView colors={colors} dismissKeyboardOnTouch>
      <View style={[gs.mb20, gs.mt20]}>
        <AppHeader onPress={goBack} colors={colors} text="AI 快速记账设置" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={gs.pb80}>
        <CustomInput
          colors={colors}
          input={apiBaseUrl}
          setInput={setApiBaseUrl}
          label="API Base URL"
          placeholder="例如 https://ark.cn-beijing.volces.com/api/v3"
          autoCapitalize="none"
        />
        <CustomInput
          colors={colors}
          input={apiKey}
          setInput={setApiKey}
          label="API Key"
          placeholder="请输入 API Key"
          autoCapitalize="none"
          secureTextEntry={!showApiKey}
          rightIcon={showApiKey ? 'eye-off' : 'eye'}
          onRightIconPress={() => setShowApiKey(prev => !prev)}
        />
        <CustomInput
          colors={colors}
          input={modelName}
          setInput={setModelName}
          label="Model Name"
          placeholder="例如 doubao-seed-1-6"
          autoCapitalize="none"
        />

        <View style={[gs.rounded12, gs.p14, gs.mt10, gs.mb15, {backgroundColor: colors.containerColor}]}>
          <PrimaryText size={13} weight="semibold" style={gs.mb8}>
            隐私说明
          </PrimaryText>
          <PrimaryText size={12} color={colors.secondaryText} style={{lineHeight: 18}}>
            自然语言内容会发送到你配置的 LLM 服务商。Zero 只发送当前输入、当前时间和可用分类名称，不发送完整账本历史。
          </PrimaryText>
          <PrimaryText size={12} color={colors.secondaryText} style={[gs.mt8, {lineHeight: 18}]}>
            API Key 仅保存在本地 MMKV 中，不会写入 Redux、数据库、导入导出文件或日志；但它不是系统 Keychain / Keystore 级别的加密存储。
          </PrimaryText>
        </View>

        <View style={gs.gap10}>
          <PrimaryButton onPress={handleSave} colors={colors} buttonTitle="保存配置" />
          <PrimaryButton onPress={handleClear} colors={colors} buttonTitle="清空配置" variant="outline" />
        </View>
      </ScrollView>
    </PrimaryView>
  );
};

export default AiSettingsScreen;
