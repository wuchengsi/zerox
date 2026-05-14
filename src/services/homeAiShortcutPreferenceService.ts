import StorageService from '../utils/asyncStorageService';

const HOME_AI_SHORTCUT_VISIBLE_KEY = 'homeAiShortcutVisible';

const listeners = new Set<(visible: boolean) => void>();

export const getHomeAiShortcutVisible = (): boolean =>
  StorageService.getItemSync(HOME_AI_SHORTCUT_VISIBLE_KEY) !== 'false';

export const setHomeAiShortcutVisible = (visible: boolean): void => {
  StorageService.setItemSync(HOME_AI_SHORTCUT_VISIBLE_KEY, visible ? 'true' : 'false');
  listeners.forEach(listener => listener(visible));
};

export const subscribeHomeAiShortcutVisible = (listener: (visible: boolean) => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
