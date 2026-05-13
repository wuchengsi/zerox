import React, {createContext, useCallback, useContext, useMemo, useState, type ReactNode} from 'react';
import {
  getCurrentLanguage,
  LanguageCode,
  saveCurrentLanguage,
  translate,
} from '../i18n';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const [language, setLanguageState] = useState<LanguageCode>(getCurrentLanguage);

  const setLanguage = useCallback(async (nextLanguage: LanguageCode) => {
    saveCurrentLanguage(nextLanguage);
    setLanguageState(nextLanguage);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => translate(key, language, params),
    [language],
  );

  const value = useMemo(
    () => ({language, setLanguage, t}),
    [language, setLanguage, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export type {LanguageCode};

