import {useDispatch} from 'react-redux';
import useThemeColors from '../../hooks/useThemeColors';
import {useState} from 'react';
import {Linking, Platform} from 'react-native';
import {requestStoragePermission} from '../../utils/dataUtils';
import {useDialog} from '../../context/DialogContext';
import {pick, types} from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import {
  createUser,
  deleteAllData,
  createCategory,
  createDebtor,
  createCurrency,
  createExpense,
  createDebt,
  createIncome,
  ensureDefaultCategoriesForUser,
  getAllCategoriesByUserId,
} from '../../watermelondb/services';
import {fetchCategories} from '../../redux/slice/categoryDataSlice';
import {fetchDebtors} from '../../redux/slice/debtorDataSlice';
import {fetchUserData} from '../../redux/slice/userIdSlice';
import {fetchCurrency} from '../../redux/slice/currencyDataSlice';
import {fetchExpenses} from '../../redux/slice/expenseDataSlice';
import {fetchAllDebts} from '../../redux/slice/allDebtDataSlice';
import StorageService from '../../utils/asyncStorageService';
import {setIsOnboarded} from '../../redux/slice/isOnboardedSlice';
import {AppDispatch} from '../../redux/store';
import {upgradeExportData} from '../../backend/export/upgrader';
import type {ExportData} from '../../backend/export/format';
import {LEGACY_CATEGORY_MAP} from '../../constants/defaultCategories';

type ImportedData = ExportData;

interface SyncStatus {
  user: 'pending' | 'syncing' | 'done' | 'error';
  categories: 'pending' | 'syncing' | 'done' | 'error';
  debtors: 'pending' | 'syncing' | 'done' | 'error';
  currencies: 'pending' | 'syncing' | 'done' | 'error';
  expenses: 'pending' | 'syncing' | 'done' | 'error';
  incomes: 'pending' | 'syncing' | 'done' | 'error';
  debts: 'pending' | 'syncing' | 'done' | 'error';
}

const useExistingUser = () => {
  const colors = useThemeColors();
  const dispatch = useDispatch<AppDispatch>();
  const {showDialog} = useDialog();

  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState('上传文件');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncComplete, setIsSyncComplete] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    user: 'pending',
    categories: 'pending',
    debtors: 'pending',
    currencies: 'pending',
    expenses: 'pending',
    incomes: 'pending',
    debts: 'pending',
  });
  const [syncStats, setSyncStats] = useState({
    categories: 0,
    expenses: 0,
    incomes: 0,
    debtors: 0,
    debts: 0,
  });

  const normalizePath = (path: string | undefined): string => {
    try {
      if (path === undefined) {
        throw new Error('Path is undefined');
      }
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        const filePrefix = 'file:';
        if (path.startsWith(filePrefix)) {
          path = path.substring(filePrefix.length);
        }
        path = decodeURI(path);
      }
      return path;
    } catch (e) {
      if (__DEV__) {
        console.error({msg: 'Failed to normalize path', data: e});
      }
      return '';
    }
  };

  const isValidKey = (key: string | null): boolean => {
    if (!key || key.length !== 20) {
      return false;
    }
    const prefix = key.slice(0, 4);
    if (prefix !== 'zero') {
      return false;
    }
    const alphanumericPart = key.slice(4);
    return /^[a-zA-Z0-9]+$/.test(alphanumericPart);
  };

  const syncAllData = async (data: ImportedData, userId: string) => {
    const categoryIdMap = new Map<string, string>();
    const debtorIdMap = new Map<string, string>();

    setSyncStatus(prev => ({...prev, categories: 'syncing'}));
    try {
      await ensureDefaultCategoriesForUser(userId);
      const existingCategories = await getAllCategoriesByUserId(userId);
      const findCategory = (name: string, parentName?: string) =>
        existingCategories.find(category => {
          if (parentName) {
            return category.name === name && category.parent?.name === parentName;
          }
          return category.name === name && !category.parentId;
        });

      for (const category of existingCategories) {
        categoryIdMap.set(category.name, category.id);
        if (category.parent?.name) {
          categoryIdMap.set(`${category.parent.name}·${category.name}`, category.id);
        }
      }

      for (const categoryData of data.categories) {
        const {name, icon, color, kind, parentName} = categoryData;
        const existing = findCategory(name, parentName);
        if (existing) {
          categoryIdMap.set(name, existing.id);
          if (parentName) {
            categoryIdMap.set(`${parentName}·${name}`, existing.id);
          }
          continue;
        }

        let parentId: string | null = null;
        if (parentName) {
          const parent = findCategory(parentName);
          parentId = parent?.id ?? null;
        }

        const newCategoryId = await createCategory(name, userId, icon ?? null, color ?? null, kind ?? 'expense', parentId);
        if (newCategoryId) {
          categoryIdMap.set(name, newCategoryId);
          if (parentName) {
            categoryIdMap.set(`${parentName}·${name}`, newCategoryId);
          }
        }
      }
      setSyncStats(prev => ({...prev, categories: data.categories.length}));
      setSyncStatus(prev => ({...prev, categories: 'done'}));
      dispatch(fetchCategories());
    } catch (error) {
      if (__DEV__) {
        console.error('Error syncing categories:', error);
      }
      setSyncStatus(prev => ({...prev, categories: 'error'}));
      throw error;
    }

    setSyncStatus(prev => ({...prev, debtors: 'syncing'}));
    try {
      for (const debtorData of data.debtors) {
        const {title, icon, type, color} = debtorData;
        const newDebtorId = await createDebtor(title, userId, icon ?? null, type ?? 'Other', color ?? null);
        if (newDebtorId) {
          debtorIdMap.set(title, newDebtorId);
        }
      }
      setSyncStats(prev => ({...prev, debtors: data.debtors.length}));
      setSyncStatus(prev => ({...prev, debtors: 'done'}));
      dispatch(fetchDebtors());
    } catch (error) {
      if (__DEV__) {
        console.error('Error syncing debtors:', error);
      }
      setSyncStatus(prev => ({...prev, debtors: 'error'}));
      throw error;
    }

    setSyncStatus(prev => ({...prev, currencies: 'syncing'}));
    try {
      for (const currencyData of data.currencies) {
        const {code, symbol, name} = currencyData;
        await createCurrency(code, symbol, name, userId);
      }
      setSyncStatus(prev => ({...prev, currencies: 'done'}));
      dispatch(fetchCurrency());
    } catch (error) {
      if (__DEV__) {
        console.error('Error syncing currencies:', error);
      }
      setSyncStatus(prev => ({...prev, currencies: 'error'}));
      throw error;
    }

    setSyncStatus(prev => ({...prev, expenses: 'syncing'}));
    try {
      let expenseCount = 0;
      for (const expenseData of data.expenses) {
        const {title, amount, category, date} = expenseData;
        const mapped = category.parentName
          ? {parent: category.parentName, child: category.name}
          : LEGACY_CATEGORY_MAP[category.name] ?? LEGACY_CATEGORY_MAP.其他;
        const categoryId =
          categoryIdMap.get(`${mapped.parent}·${mapped.child}`) ??
          categoryIdMap.get('其他·其他');
        if (categoryId) {
          await createExpense(userId, title, amount, categoryId, date);
          expenseCount++;
        }
      }
      setSyncStats(prev => ({...prev, expenses: expenseCount}));
      setSyncStatus(prev => ({...prev, expenses: 'done'}));
      dispatch(fetchExpenses());
    } catch (error) {
      if (__DEV__) {
        console.error('Error syncing expenses:', error);
      }
      setSyncStatus(prev => ({...prev, expenses: 'error'}));
      throw error;
    }

    setSyncStatus(prev => ({...prev, incomes: 'syncing'}));
    try {
      let incomeCount = 0;
      for (const incomeData of data.incomes ?? []) {
        const {title, amount, category, date} = incomeData;
        const categoryId = categoryIdMap.get(category.name) ?? categoryIdMap.get('收入');
        if (categoryId) {
          await createIncome(userId, title, amount, categoryId, date);
          incomeCount++;
        }
      }
      setSyncStats(prev => ({...prev, incomes: incomeCount}));
      setSyncStatus(prev => ({...prev, incomes: 'done'}));
    } catch (error) {
      if (__DEV__) {
        console.error('Error syncing incomes:', error);
      }
      setSyncStatus(prev => ({...prev, incomes: 'error'}));
      throw error;
    }

    setSyncStatus(prev => ({...prev, debts: 'syncing'}));
    try {
      let debtCount = 0;
      for (const debtData of data.debts) {
        const {amount, description, debtor, date, type} = debtData;
        const debtorId = debtorIdMap.get(debtor.title);
        if (debtorId) {
          await createDebt(userId, amount, description, debtorId, date, type);
          debtCount++;
        }
      }
      setSyncStats(prev => ({...prev, debts: debtCount}));
      setSyncStatus(prev => ({...prev, debts: 'done'}));
      dispatch(fetchAllDebts());
    } catch (error) {
      if (__DEV__) {
        console.error('Error syncing debts:', error);
      }
      setSyncStatus(prev => ({...prev, debts: 'error'}));
      throw error;
    }
  };

  const importData = async () => {
    try {
      setIsSyncing(false);
      setIsSyncComplete(false);
      setSyncError(null);
      setSyncStatus({
        user: 'pending',
        categories: 'pending',
        debtors: 'pending',
        currencies: 'pending',
        expenses: 'pending',
        incomes: 'pending',
        debts: 'pending',
      });

      const storagePermissionGranted = await requestStoragePermission();

      if (!storagePermissionGranted) {
        const confirmed = await showDialog({
          type: 'warning',
          message: '上传备份文件需要存储权限',
          okLabel: '去设置',
          cancelLabel: '取消',
        });
        if (confirmed) {
          Linking.openSettings();
        }
        return;
      }

      const result = await pick({
        type: [types.allFiles],
        allowMultiSelection: false,
      });

      const {0: res} = result;
      const path = normalizePath(res.uri);
      if (!path) {
        setUploadMessage('文件路径无效');
        return;
      }

      const fileContent = await RNFS.readFile(path, 'utf8');
      const jsonData = JSON.parse(fileContent);

      const {key} = jsonData;
      if (!key || !isValidKey(key)) {
        setUploadMessage('密钥无效，请上传有效的 Zerox 导出文件。');
        return;
      }

      const data: ImportedData = upgradeExportData(jsonData);

      setFileName(res.name ?? 'data.json');
      setUploadMessage('正在同步数据...');
      setIsSyncing(true);

      setSyncStatus(prev => ({...prev, user: 'syncing'}));
      const {users} = data;
      const {username, email} = users[0];
      const newUserId = await createUser(username, email);

      if (!newUserId) {
        throw new Error('Failed to create user');
      }

      setSyncStatus(prev => ({...prev, user: 'done'}));
      dispatch(fetchUserData());

      await syncAllData(data, newUserId);

      setIsSyncing(false);
      setIsSyncComplete(true);
      setUploadMessage('所有数据已同步完成！');
    } catch (error) {
      if (__DEV__) {
        console.error('Error importing data:', error);
      }
      setIsSyncing(false);
      setSyncError('同步数据失败，请重试。');
      setUploadMessage('同步数据出错，请重试。');
    }
  };

  const reUpload = async () => {
    await deleteAllData();
    dispatch(fetchCategories());
    dispatch(fetchDebtors());
    dispatch(fetchUserData());
    setFileName(null);
    setIsSyncComplete(false);
    setSyncError(null);
    setSyncStats({categories: 0, expenses: 0, incomes: 0, debtors: 0, debts: 0});
    await importData();
  };

  const handleContinue = async () => {
    StorageService.setItemSync('isOnboarded', JSON.stringify(true));
    dispatch(setIsOnboarded(true));
  };

  return {
    colors,
    importData,
    fileName,
    uploadMessage,
    reUpload,
    handleContinue,
    isSyncing,
    isSyncComplete,
    syncError,
    syncStatus,
    syncStats,
  };
};

export default useExistingUser;
