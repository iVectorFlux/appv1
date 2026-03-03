/**
 * Supabase client
 *
 * Uses env from app.config.js extra (via expo-constants) or process.env.
 * .env is loaded by app.config.js via dotenv.
 * Session persists via AsyncStorage (web + native). On SSR (no window), storage no-ops so the app doesn't crash.
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const supabaseUrl =
  Constants.expoConfig?.extra?.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey =
  Constants.expoConfig?.extra?.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] URL or anon key missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY in .env and restart (expo start --web).'
  );
}

/** Use before any Supabase call to fail fast instead of hanging. */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http'));
}

/** Storage that only uses AsyncStorage in the browser (avoids "window is not defined" during SSR). */
const safeStorage =
  typeof window !== 'undefined'
    ? AsyncStorage
    : {
        getItem: async () => null,
        setItem: async () => {},
        removeItem: async () => {},
      };

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    storage: safeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
