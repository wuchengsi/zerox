import React, {createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode} from 'react';
import {useColorScheme, Appearance} from 'react-native';
import StorageService from '../utils/asyncStorageService';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';
export type AccentColorId = 'sage' | 'mint' | 'teal' | 'sky' | 'lavender' | 'coral';

export interface AccentColorOption {
  id: AccentColorId;
  label: string;
  light: string;
  dark: string;
}

export const ACCENT_COLORS: AccentColorOption[] = [
  {id: 'sage', label: '鼠尾草绿', light: '#6E8B3D', dark: '#B1FB98'},
  {id: 'mint', label: '薄荷绿', light: '#3A9B7A', dark: '#8DE8C0'},
  {id: 'teal', label: '湖蓝', light: '#2F8C95', dark: '#7EDAE2'},
  {id: 'sky', label: '天空蓝', light: '#3B82C4', dark: '#93C5FD'},
  {id: 'lavender', label: '薰衣草紫', light: '#8B6FD1', dark: '#C4B5FD'},
  {id: 'coral', label: '珊瑚橙', light: '#D56F55', dark: '#FDBA91'},
];

export interface ThemeColors {
  primaryBackground: string;
  primaryText: string;
  secondaryBackground: string;
  secondaryText: string;
  accentGreen: string;
  accentOrange: string;
  accentBlue: string;
  buttonText: string;
  containerColor: string;
  cardBackground: string;
  secondaryContainerColor: string;
  secondaryAccent: string;
  iconContainer: string;
  sameBlack: string;
  sameWhite: string;
  accentRed: string;
  lightAccent: string;
}

const LightColors: ThemeColors = {
  primaryBackground: '#FAFAF8',
  primaryText: '#1A1A1A',
  secondaryBackground: '#E4E9D8',
  secondaryText: '#505050',
  accentGreen: '#6E8B3D',
  accentOrange: '#B86E00',
  accentBlue: '#1E90FF',
  buttonText: '#FFFFFF',
  containerColor: '#ECEEE7',
  cardBackground: '#E8EAE3',
  secondaryContainerColor: '#E4E9D8',
  iconContainer: '#E4E9D8',
  secondaryAccent: '#EEEFE9',
  sameBlack: '#000000',
  sameWhite: '#FAFBF7',
  accentRed: '#C4503C',
  lightAccent: '#F5F6F2',
};

const DarkColors: ThemeColors = {
  primaryBackground: '#0F0F0F',
  primaryText: '#FFFFFF',
  secondaryBackground: '#333333',
  secondaryText: '#CCCCCC',
  accentGreen: '#B1FB98',
  accentOrange: '#FFA500',
  accentBlue: '#1E90FF',
  buttonText: '#000000',
  containerColor: '#1f1f1f',
  cardBackground: '#262626',
  secondaryContainerColor: '#1f1f1f',
  secondaryAccent: '#333333',
  iconContainer: '#313131',
  sameBlack: '#000000',
  sameWhite: '#FAFBF7',
  accentRed: '#FF6347',
  lightAccent: '#313131',
};

interface ThemeContextType {
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  colors: ThemeColors;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  accentColorId: AccentColorId;
  setAccentColor: (id: AccentColorId) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

const getInitialThemeMode = (): ThemeMode => {
  const saved = StorageService.getItemSync('themePreference');
  if (saved && ['light', 'dark', 'system'].includes(saved)) {
    return saved as ThemeMode;
  }
  return 'system';
};

const getInitialAccentColor = (): AccentColorId => {
  const saved = StorageService.getItemSync('accentColorPreference');
  return ACCENT_COLORS.some(color => color.id === saved) ? saved as AccentColorId : 'sage';
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({children}) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>(getInitialThemeMode);
  const [accentColorId, setAccentColorState] = useState<AccentColorId>(getInitialAccentColor);

  const resolvedTheme: ResolvedTheme = useMemo(() => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    return themeMode;
  }, [themeMode, systemColorScheme]);

  const colors = useMemo(() => {
    const baseColors = resolvedTheme === 'dark' ? DarkColors : LightColors;
    const accent = ACCENT_COLORS.find(color => color.id === accentColorId) ?? ACCENT_COLORS[0];
    return {
      ...baseColors,
      accentGreen: resolvedTheme === 'dark' ? accent.dark : accent.light,
    };
  }, [accentColorId, resolvedTheme]);

  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    const subscription = Appearance.addChangeListener(() => {});
    return () => subscription.remove();
  }, []);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    StorageService.setItemSync('themePreference', mode);
    setThemeModeState(mode);
  }, []);

  const setAccentColor = useCallback(async (id: AccentColorId) => {
    StorageService.setItemSync('accentColorPreference', id);
    setAccentColorState(id);
  }, []);

  const value = useMemo(
    () => ({
      themeMode,
      resolvedTheme,
      colors,
      isDark,
      setThemeMode,
      accentColorId,
      setAccentColor,
    }),
    [themeMode, resolvedTheme, colors, isDark, setThemeMode, accentColorId, setAccentColor],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const useThemeColors = (): ThemeColors => {
  const {colors} = useTheme();
  return colors;
};

export default ThemeContext;
