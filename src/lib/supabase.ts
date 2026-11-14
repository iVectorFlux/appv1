/**
 * Supabase client
 *
 * Uses env from app.config.js extra (via expo-constants) or process.env.
 * .env is loaded by app.config.js via dotenv.
 * Session persists via AsyncStorage (web + native). On SSR (no window), storage no-ops so the app doesn't crash.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const PLACEHOLDER_HOST = 'your-project.supabase.co';

function readSupabaseUrl(): string {
  return (
    Constants.expoConfig?.extra?.supabaseUrl ??
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
    ''
  ).trim();
}

function readSupabaseAnonKey(): string {
  return (
    Constants.expoConfig?.extra?.supabaseAnonKey ??
    process.env.EXPO_PUBLIC_SUPABASE_KEY ??
    ''
  ).trim();
}

const supabaseUrl = readSupabaseUrl();
const supabaseAnonKey = readSupabaseAnonKey();

export function isSupabasePlaceholderUrl(url = supabaseUrl): boolean {
  return !url || url.includes(PLACEHOLDER_HOST) || url.includes('your-anon-public-key');
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] URL or anon key missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY in .env and restart (npx expo start -c).'
  );
} else if (isSupabasePlaceholderUrl()) {
  console.error(
    '[Supabase] Placeholder URL still loaded (your-project.supabase.co). Update .env with your real project URL, then stop Expo and run: npx expo start -c'
  );
}

/** Use before any Supabase call to fail fast instead of hanging. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
      supabaseAnonKey &&
      supabaseUrl.startsWith('http') &&
      !isSupabasePlaceholderUrl()
  );
}

/** For sign-in diagnostics — which project the running app bundle is actually using. */
export function getSupabaseConnectionInfo(): {
  url: string;
  projectRef: string | null;
  configured: boolean;
  isPlaceholder: boolean;
} {
  const url = supabaseUrl;
  const match = url.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co/i);
  return {
    url,
    projectRef: match?.[1] ?? null,
    configured: isSupabaseConfigured(),
    isPlaceholder: isSupabasePlaceholderUrl(),
  };
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

const SUPABASE_FETCH_TIMEOUT_MS = 12_000;

/**
 * Abort stalled Supabase HTTP requests (e.g. waking mobile tab / sleeping TCP socket)
 * so auth refresh and PostgREST queries fail fast and trigger cached fallbacks.
 */
const fetchWithTimeout: typeof fetch = async (input, init) => {
  if (init?.signal || typeof AbortController === 'undefined') {
    return fetch(input, init);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SUPABASE_FETCH_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

export const supabase: SupabaseClient = createClient(supabaseUrl || 'http://invalid.local', supabaseAnonKey || 'invalid', {
  auth: {
    storage: safeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    lock: (_name, _acquireTimeout, fn) => fn(),
  },
  global: {
    fetch: fetchWithTimeout,
  },
});
