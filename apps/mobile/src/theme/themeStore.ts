import type { ThemeMode } from '@et-chess/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface ThemeStoreState {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeStoreState>()(
  persist(
    (set, get, api) => {
      Object.defineProperty(api, 'getInitialState', {
        configurable: true,
        enumerable: true,
        get: () => () => get(),
        set: () => {},
      });
      return {
        themeMode: 'system',
        setThemeMode: (mode: ThemeMode) => set({ themeMode: mode }),
      };
    },
    {
      name: 'et-chess-theme-mode',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

useThemeStore.getInitialState = () => useThemeStore.getState();

export default useThemeStore;
