import StorageService from '../utils/asyncStorageService';

export interface AiSettings {
  apiBaseUrl: string;
  apiKey: string;
  modelName: string;
}

const AI_API_BASE_URL_KEY = 'ai.apiBaseUrl';
const AI_API_KEY_KEY = 'ai.apiKey';
const AI_MODEL_NAME_KEY = 'ai.modelName';

export const EMPTY_AI_SETTINGS: AiSettings = {
  apiBaseUrl: '',
  apiKey: '',
  modelName: '',
};

export const getAiSettings = (): AiSettings => ({
  apiBaseUrl: StorageService.getItemSync(AI_API_BASE_URL_KEY) ?? '',
  apiKey: StorageService.getItemSync(AI_API_KEY_KEY) ?? '',
  modelName: StorageService.getItemSync(AI_MODEL_NAME_KEY) ?? '',
});

export const saveAiSettings = (settings: AiSettings): void => {
  StorageService.setItemSync(AI_API_BASE_URL_KEY, settings.apiBaseUrl.trim());
  StorageService.setItemSync(AI_API_KEY_KEY, settings.apiKey.trim());
  StorageService.setItemSync(AI_MODEL_NAME_KEY, settings.modelName.trim());
};

export const clearAiSettings = (): void => {
  StorageService.removeItemSync(AI_API_BASE_URL_KEY);
  StorageService.removeItemSync(AI_API_KEY_KEY);
  StorageService.removeItemSync(AI_MODEL_NAME_KEY);
};

export const getMissingAiSettingsFields = (settings: AiSettings): string[] => {
  const missing: string[] = [];
  if (!settings.apiBaseUrl.trim()) {
    missing.push('API Base URL');
  }
  if (!settings.apiKey.trim()) {
    missing.push('API Key');
  }
  if (!settings.modelName.trim()) {
    missing.push('Model Name');
  }
  return missing;
};

export const hasCompleteAiSettings = (settings: AiSettings = getAiSettings()): boolean =>
  getMissingAiSettingsFields(settings).length === 0;
