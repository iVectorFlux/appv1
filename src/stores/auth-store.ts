/**
 * Authentication Store
 * 
 * Manages user authentication state.
 * Uses Expo SecureStore for token storage on native platforms.
 * Falls back to AsyncStorage on web.
 */

import { create } from 'zustand';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, AuthState } from '@/types';

interface AuthStore extends AuthState {
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  setDemoMode: (enabled: boolean) => Promise<void>;
}

const DEMO_CREDENTIALS = {
  username: 'demo',
  password: 'demo123',
};

const AUTH_TOKEN_KEY = 'auth_token';
const USER_DATA_KEY = 'user_data';

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  initialize: async () => {
    try {
      let token: string | null = null;
      let userData: string | null = null;

      if (Platform.OS === 'web') {
        // Use AsyncStorage on web
        token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        userData = await AsyncStorage.getItem(USER_DATA_KEY);
      } else {
        // Use SecureStore on native platforms
        token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
        userData = await SecureStore.getItemAsync(USER_DATA_KEY);
      }
      
      if (token && userData) {
        const user = JSON.parse(userData) as User;
        set({ user, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      set({ isLoading: false });
    }
  },

  login: async (username: string, password: string): Promise<boolean> => {
    try {
      // Dummy authentication - in production, this would call an API
      if (username.toLowerCase() === DEMO_CREDENTIALS.username && password === DEMO_CREDENTIALS.password) {
        const user: User = {
          id: `user_${Date.now()}`,
          username: username.toLowerCase(),
          createdAt: Date.now(),
          isDemoMode: true,
        };

        // Generate a dummy token
        const token = `token_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // Store securely (SecureStore on native, AsyncStorage on web)
        if (Platform.OS === 'web') {
          await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
          await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
        } else {
          await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
          await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(user));
        }

        set({ user, isAuthenticated: true, isLoading: false });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  },

  logout: async () => {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
        await AsyncStorage.removeItem(USER_DATA_KEY);
      } else {
        await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
        await SecureStore.deleteItemAsync(USER_DATA_KEY);
      }
      set({ user: null, isAuthenticated: false });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  },

  setDemoMode: async (enabled: boolean) => {
    const { user } = get();
    if (user) {
      const updatedUser = { ...user, isDemoMode: enabled };
      if (Platform.OS === 'web') {
        await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(updatedUser));
      } else {
        await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(updatedUser));
      }
      set({ user: updatedUser });
    }
  },
}));
