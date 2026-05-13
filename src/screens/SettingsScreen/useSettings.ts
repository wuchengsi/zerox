import {useDispatch, useSelector} from 'react-redux';
import {selectUserName, setUserName} from '../../redux/slice/userNameSlice';
import {selectUserId} from '../../redux/slice/userIdSlice';
import {
  selectCurrencyId,
  selectCurrencyName,
  selectCurrencySymbol,
  setCurrencyData,
} from '../../redux/slice/currencyDataSlice';
import {useCallback, useEffect} from 'react';
import {getAppVersion} from '../../utils/getVersion';
import {AccentColorId, ThemeMode, useLanguage, useTheme} from '../../context';
import {useDialog} from '../../context/DialogContext';
import StorageService from '../../utils/asyncStorageService';
import {updateUserById, updateCurrencyById, deleteAllData} from '../../watermelondb/services';
import {Linking} from 'react-native';
import {setIsOnboarded} from '../../redux/slice/isOnboardedSlice';
import {fetchAllData, selectAllData} from '../../redux/slice/allDataSlice';
import {AppDispatch} from '../../redux/store';

const useSettings = () => {
  const userName = useSelector(selectUserName);
  const userId = useSelector(selectUserId);
  const currencyId = useSelector(selectCurrencyId);
  const currencyName = useSelector(selectCurrencyName);
  const currencySymbol = useSelector(selectCurrencySymbol);
  const allData = useSelector(selectAllData);

  const {colors, themeMode, setThemeMode, accentColorId, setAccentColor} = useTheme();
  const {language, setLanguage, t} = useLanguage();
  const {showDialog, showAlert} = useDialog();
  const appVersion = getAppVersion();

  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    dispatch(fetchAllData());
  }, [dispatch]);

  const handleThemeSelection = useCallback(async (theme: string) => {
    try {
      await setThemeMode(theme as ThemeMode);
    } catch (error) {
      if (__DEV__) {
        console.error('Error saving theme preference:', error);
      }
    }
  }, [setThemeMode]);

  const handleLanguageSelection = useCallback(async (nextLanguage: string) => {
    await setLanguage(nextLanguage === 'en' ? 'en' : 'zh');
  }, [setLanguage]);

  const handleAccentColorSelection = useCallback(async (color: AccentColorId) => {
    await setAccentColor(color);
  }, [setAccentColor]);

  const handleNameUpdate = useCallback(async (newName: string) => {
    try {
      await updateUserById(userId, {username: newName});
      dispatch(setUserName(newName));
    } catch (error) {
      if (__DEV__) {
        console.error('Error updating the name:', error);
      }
    }
  }, [userId, dispatch]);

  const handleCurrencyUpdate = useCallback(
    async (currency: {code: string; name: string; symbol: string}) => {
      try {
        await updateCurrencyById(currencyId, {
          name: currency.name,
          code: currency.code,
          symbol: currency.symbol,
        });
        const updatedCurrencyData = {
          currencyId,
          currencyName: currency.name,
          currencySymbol: currency.symbol,
          currencyCode: currency.code,
        };
        dispatch(setCurrencyData(updatedCurrencyData));
      } catch (error) {
        if (__DEV__) {
          console.error('Error updating the currency:', error);
        }
      }
    },
    [currencyId, dispatch],
  );

  const handleReportBug = useCallback(() => {
    const issueURL = 'https://github.com/wuchengsi/zerox/issues/new';
    Linking.openURL(issueURL).catch(err => {
      if (__DEV__) {
        console.error('Error opening issue page:', err);
      }
    });
  }, []);

  const handleGithub = useCallback(() => {
    const githubRepoURL = 'https://github.com/wuchengsi/zerox';
    Linking.openURL(githubRepoURL).catch(err => {
      if (__DEV__) {
        console.error('Error opening GitHub:', err);
      }
    });
  }, []);

  const handleDeleteAllData = useCallback(async () => {
    const confirmed = await showDialog({
      type: 'warning',
      message: t('确定要删除所有数据吗？'),
      okLabel: t('删除'),
      cancelLabel: t('取消'),
    });
    if (confirmed) {
      await deleteAllData();
      StorageService.setItemSync('isOnboarded', JSON.stringify(false));
      dispatch(setIsOnboarded(false));
    }
  }, [dispatch, showDialog, t]);

  const handleExportResult = useCallback(
    async (success: boolean) => {
      if (success) {
        await showAlert({
          type: 'success',
          message: t('数据已成功导出到下载目录'),
          okLabel: t('知道了'),
        });
      } else {
        await showAlert({
          type: 'error',
          message: t('导出数据时出错'),
          okLabel: t('知道了'),
        });
      }
    },
    [showAlert, t],
  );

  const requestStorageViaDialog = useCallback(async () => {
    const confirmed = await showDialog({
      type: 'warning',
      message: t('需要手动授予存储权限后才能下载数据'),
      okLabel: t('去设置'),
      cancelLabel: t('取消'),
    });
    if (confirmed) {
      Linking.openSettings();
    }
  }, [showDialog, t]);

  return {
    appVersion,
    colors,
    handleThemeSelection,
    handleLanguageSelection,
    handleAccentColorSelection,
    handleNameUpdate,
    handleCurrencyUpdate,
    selectedTheme: themeMode,
    selectedLanguage: language,
    selectedAccentColor: accentColorId,
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
  };
};

export default useSettings;
