/**
 * Theme Store
 * 
 * Manages dark mode preference.
 * Single theme with light and dark variants.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type ColorMode = 'light' | 'dark';

interface ThemeState {
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => Promise<void>;
  toggleColorMode: () => Promise<void>;
  initialize: () => Promise<void>;
}

const COLOR_MODE_STORAGE_KEY = 'eq-app-color-mode';

export const useThemeStore = create<ThemeState>((set) => ({
  colorMode: 'light',
  
  setColorMode: async (mode: ColorMode) => {
    set({ colorMode: mode });
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.setItem(COLOR_MODE_STORAGE_KEY, mode);
      } else {
        await SecureStore.setItemAsync(COLOR_MODE_STORAGE_KEY, mode);
      }
    } catch (error) {
      console.error('Failed to save color mode:', error);
    }
  },
  
  toggleColorMode: async () => {
    const currentMode = useThemeStore.getState().colorMode;
    const newMode = currentMode === 'light' ? 'dark' : 'light';
    await useThemeStore.getState().setColorMode(newMode);
  },
  
  initialize: async () => {
    try {
      let savedColorMode: ColorMode = 'light';
      
      if (Platform.OS === 'web') {
        const colorMode = await AsyncStorage.getItem(COLOR_MODE_STORAGE_KEY);
        if (colorMode) savedColorMode = colorMode as ColorMode;
      } else {
        const colorMode = await SecureStore.getItemAsync(COLOR_MODE_STORAGE_KEY);
        if (colorMode) savedColorMode = colorMode as ColorMode;
      }
      
      set({ colorMode: savedColorMode });
    } catch (error) {
      console.error('Failed to initialize theme:', error);
    }
  },
}));
