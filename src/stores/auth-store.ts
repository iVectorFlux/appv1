/**
 * Authentication Store
 *
 * Supabase Auth only. No demo or legacy token fallback.
 * Session persists via Supabase client (secure storage).
 * After auth, users go to onboarding until they complete it (hasCompletedOnboarding).
 * needsEmailConfirmation when Supabase requires email confirmation and user hasn't confirmed.
 */

import { create } from 'zustand';
import Constants from 'expo-constants';
import { supabase, getSupabaseConnectionInfo, isSupabaseConfigured } from '@/lib/supabase';
import {
  cacheSegments,
  clearMemoryCache,
  dedupeRequest,
  isCacheFresh,
  readCacheEntry,
  removeCacheSegment,
  withTimeout,
  writeCacheJson,
} from '@/lib/async-data-cache';
import {
  isOnboardingCompleteLocal,
  markOnboardingCompleteLocal,
} from '@/services/onboarding-progress';
import type { User, AuthState } from '@/types';

const AUTH_SESSION_TIMEOUT_MS = 8_000;
const AUTH_PROFILE_TIMEOUT_MS = 6_000;
const PROFILE_FRESH_MS = 5 * 60 * 1000;

function hasSavedOnboardingGoals(goals: unknown): boolean {
  return Array.isArray(goals) && goals.some((g) => typeof g === 'string' && g.trim().length > 0);
}

/** True when onboarding is done — local cache first, then Supabase, then saved goals. */
async function resolveOnboardingComplete(userId: string): Promise<boolean> {
  if (await isOnboardingCompleteLocal(userId)) return true;

  try {
    const { data: row, error: onboardingError } = await supabase
      .from('user_onboarding')
      .select('completed_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (onboardingError) {
      console.warn('[Auth] user_onboarding read:', onboardingError.message);
    }
    if (row?.completed_at) {
      await markOnboardingCompleteLocal(userId);
      return true;
    }

    const { data: prefs, error: prefsError } = await supabase
      .from('user_preferences')
      .select('goals')
      .eq('user_id', userId)
      .maybeSingle();
    if (prefsError) {
      console.warn('[Auth] user_preferences read:', prefsError.message);
    }
    if (hasSavedOnboardingGoals(prefs?.goals)) {
      await markOnboardingCompleteLocal(userId);
      return true;
    }
  } catch (err) {
    console.warn('[Auth] resolveOnboardingComplete failed:', err);
  }

  return false;
}

/** URL to redirect to after email confirmation. On web uses current origin; otherwise env EXPO_PUBLIC_APP_URL. */
function getAuthRedirectUrl(): string | undefined {
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return Constants.expoConfig?.extra?.appUrl ?? (process.env as Record<string, string | undefined>).EXPO_PUBLIC_APP_URL;
}

interface AuthStore extends AuthState {
  /** True after user has completed onboarding (from Supabase user_onboarding). */
  hasCompletedOnboarding: boolean | null;
  /** True when Supabase requires email confirmation and user has not confirmed yet. */
  needsEmailConfirmation: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  /** Mark onboarding complete (writes to Supabase user_onboarding, sets hasCompletedOnboarding). */
  setOnboardingComplete: (stepsCompleted?: string[]) => Promise<void>;
  /** Re-fetch onboarding status from Supabase (e.g. after completing onboarding). */
  refreshOnboardingStatus: () => Promise<void>;
  /** Re-fetch display name from profiles and update user (e.g. after onboarding or profile edit). */
  refreshDisplayName: () => Promise<void>;
  /** Re-validate session from storage (e.g. when app comes to foreground after token refresh). */
  revalidateSession: () => Promise<void>;
}

function mapSupabaseUserToAppUser(
  supabaseUser: { id: string; email?: string; created_at: string },
  profile?: {
    displayName?: string | null;
    role?: 'user' | 'admin';
    companyId?: string | null;
    companyName?: string | null;
  }
): User {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? undefined,
    username: supabaseUser.email?.split('@')[0] ?? supabaseUser.id.slice(0, 8),
    displayName: profile?.displayName?.trim() || undefined,
    role: profile?.role ?? 'user',
    companyId: profile?.companyId ?? null,
    companyName: profile?.companyName ?? null,
    createdAt: new Date(supabaseUser.created_at).getTime(),
  };
}

/** Update profiles.last_login_at and insert a row in user_sessions for time-on-app audit. */
async function recordSessionStart(userId: string): Promise<void> {
  try {
    const now = new Date().toISOString();
    await supabase.from('profiles').update({ last_login_at: now, updated_at: now }).eq('id', userId);
    await supabase.from('user_sessions').insert({ user_id: userId, started_at: now });
  } catch {
    // Non-fatal: profile/session tables may not exist yet
  }
}

/** Fetch display_name, role, and company_id from profiles (cached + deduplicated + timeout-guarded). */
async function getUserWithProfile(
  supabaseUser: { id: string; email?: string; created_at: string },
  forceRefresh = false
): Promise<User> {
  const seg = cacheSegments.authUser(supabaseUser.id);
  const cached = await readCacheEntry<User>(seg);
  if (!forceRefresh && cached?.data && isCacheFresh(cached.updatedAt, PROFILE_FRESH_MS)) {
    return cached.data;
  }

  return dedupeRequest(`auth_profile:${supabaseUser.id}`, async () => {
    try {
      const { data, error } = await withTimeout(
        (async () =>
          supabase
            .from('profiles')
            .select('display_name, role, company_id')
            .eq('id', supabaseUser.id)
            .maybeSingle())(),
        AUTH_PROFILE_TIMEOUT_MS,
        'Profile lookup'
      );

      if (!error && data) {
        let companyName: string | null = null;
        if (data.company_id) {
          const { data: comp } = await withTimeout(
            (async () =>
              supabase
                .from('companies')
                .select('name')
                .eq('id', data.company_id)
                .maybeSingle())(),
            4_000,
            'Company lookup'
          );
          companyName = (comp?.name as string | undefined) ?? null;
        }
        const hydrated = mapSupabaseUserToAppUser(supabaseUser, {
          displayName: (data.display_name as string | null) ?? null,
          role: data.role === 'admin' ? 'admin' : 'user',
          companyId: (data.company_id as string | null) ?? null,
          companyName,
        });
        void writeCacheJson(seg, hydrated);
        return hydrated;
      }

      // Fallback when migration 00028 (role/company_id columns) hasn't been applied yet
      const { data: basic } = await withTimeout(
        (async () =>
          supabase
            .from('profiles')
            .select('display_name')
            .eq('id', supabaseUser.id)
            .maybeSingle())(),
        4_000,
        'Basic profile lookup'
      );
      const basicUser = mapSupabaseUserToAppUser(supabaseUser, {
        displayName: (basic?.display_name as string | null) ?? null,
      });
      void writeCacheJson(seg, basicUser);
      return basicUser;
    } catch {
      return cached?.data ?? mapSupabaseUserToAppUser(supabaseUser);
    }
  });
}

/** Set ended_at on the current open session(s) for this user (audit). */
async function endSession(userId: string): Promise<void> {
  try {
    const { data: rows } = await supabase
      .from('user_sessions')
      .select('id')
      .eq('user_id', userId)
      .is('ended_at', null)
      .order('started_at', { ascending: false });
    if (rows?.length) {
      const now = new Date().toISOString();
      for (const row of rows) {
        await supabase.from('user_sessions').update({ ended_at: now }).eq('id', row.id);
      }
    }
  } catch {
    // Non-fatal
  }
}

/**
 * Read persisted Supabase session user synchronously on web `localStorage` so repeat launches
 * render immediately without waiting on remote JWT token refresh.
 */
function readStoredSupabaseUserSync(): {
  id: string;
  email?: string;
  created_at: string;
  email_confirmed_at?: string | null;
} | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i);
      if (!k || !k.startsWith('sb-') || !k.endsWith('-auth-token')) continue;
      const raw = window.localStorage.getItem(k);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as {
        user?: { id?: string; email?: string; created_at?: string; email_confirmed_at?: string | null };
        currentSession?: {
          user?: { id?: string; email?: string; created_at?: string; email_confirmed_at?: string | null };
        };
      };
      const u = parsed?.user ?? parsed?.currentSession?.user;
      if (u?.id) {
        return {
          id: u.id,
          email: u.email,
          created_at: u.created_at ?? new Date().toISOString(),
          email_confirmed_at: u.email_confirmed_at,
        };
      }
    }
  } catch {
    // ignore storage parse failure
  }
  return null;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  hasCompletedOnboarding: null,
  needsEmailConfirmation: false,

  initialize: async () => {
    try {
      // Optimistic local boot: hydrate from web localStorage session + cached profile immediately
      // instead of blocking first render on a slow remote token refresh.
      const localUser = readStoredSupabaseUserSync();
      let optimisticHydrated = false;
      if (localUser) {
        const needsEmailConfirmation =
          typeof localUser.email_confirmed_at !== 'undefined' && !localUser.email_confirmed_at;
        const [cachedProfile, localDone] = await Promise.all([
          readCacheEntry<User>(cacheSegments.authUser(localUser.id)),
          isOnboardingCompleteLocal(localUser.id),
        ]);
        if (cachedProfile?.data || localDone) {
          optimisticHydrated = true;
          set({
            user: cachedProfile?.data ?? mapSupabaseUserToAppUser(localUser),
            isAuthenticated: true,
            isLoading: false,
            hasCompletedOnboarding: localDone ? true : null,
            needsEmailConfirmation: !!needsEmailConfirmation,
          });
        }
      }

      const {
        data: { session },
      } = await withTimeout(supabase.auth.getSession(), AUTH_SESSION_TIMEOUT_MS, 'Session restore');

      if (session?.user) {
        const needsEmailConfirmation =
          typeof (session.user as { email_confirmed_at?: string | null }).email_confirmed_at !== 'undefined' &&
          !(session.user as { email_confirmed_at?: string | null }).email_confirmed_at;

        // Hydrate immediately from cached profile & onboarding state so repeat launches never stall on loading
        const [cachedProfile, localDone] = await Promise.all([
          readCacheEntry<User>(cacheSegments.authUser(session.user.id)),
          isOnboardingCompleteLocal(session.user.id),
        ]);

        if (cachedProfile?.data) {
          set({
            user: cachedProfile.data,
            isAuthenticated: true,
            isLoading: false,
            hasCompletedOnboarding: localDone ? true : null,
            needsEmailConfirmation: !!needsEmailConfirmation,
          });
          // Sync latest role/profile & onboarding status quietly in the background
          void (async () => {
            const [freshUser, done] = await Promise.all([
              getUserWithProfile(session.user),
              localDone ? Promise.resolve(true) : resolveOnboardingComplete(session.user.id),
            ]);
            set({
              user: freshUser,
              hasCompletedOnboarding: done,
              needsEmailConfirmation: !!needsEmailConfirmation,
            });
          })();
        } else {
          const [user, hasCompletedOnboarding] = await Promise.all([
            getUserWithProfile(session.user),
            resolveOnboardingComplete(session.user.id),
          ]);
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            hasCompletedOnboarding,
            needsEmailConfirmation: !!needsEmailConfirmation,
          });
        }
        recordSessionStart(session.user.id);
      } else {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          hasCompletedOnboarding: null,
          needsEmailConfirmation: false,
        });
      }

      supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const needsEmailConfirmation =
            typeof (session.user as { email_confirmed_at?: string | null }).email_confirmed_at !== 'undefined' &&
            !(session.user as { email_confirmed_at?: string | null }).email_confirmed_at;
          if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
            return;
          }
          const user = await getUserWithProfile(session.user);
          set({
            user,
            isAuthenticated: true,
            needsEmailConfirmation: !!needsEmailConfirmation,
          });
          get().refreshOnboardingStatus();
        } else {
          set({ user: null, isAuthenticated: false, hasCompletedOnboarding: null, needsEmailConfirmation: false });
        }
      });
      if (!optimisticHydrated && get().isLoading) {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      set({ isLoading: false });
    }
  },

  login: async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const conn = getSupabaseConnectionInfo();
      if (!isSupabaseConfigured()) {
        const hint = conn.isPlaceholder
          ? 'App is still using the placeholder Supabase URL (your-project). Fix .env, then run: npx expo start -c'
          : 'Supabase is not configured. Check EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY in .env.';
        return { success: false, error: hint };
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

      if (error) {
        console.error('Supabase login error:', error.message);
        let msg = error.message;
        if (error.message === 'Invalid login credentials') {
          msg = 'Invalid email or password. If you just signed up, confirm your email first.';
        } else if (error.message === 'Failed to fetch' || error.message.includes('fetch')) {
          msg =
            'Cannot reach Supabase. Your app may still be on the old placeholder URL — stop Expo, run npx expo start -c, and hard-refresh the browser.';
        }
        return { success: false, error: msg };
      }

      if (data.user) {
        const user = await getUserWithProfile(data.user);
        const needsEmailConfirmation =
          typeof (data.user as { email_confirmed_at?: string | null }).email_confirmed_at !== 'undefined' &&
          !(data.user as { email_confirmed_at?: string | null }).email_confirmed_at;
        const hasCompletedOnboarding = await resolveOnboardingComplete(data.user.id);
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          hasCompletedOnboarding,
          needsEmailConfirmation: !!needsEmailConfirmation,
        });
        recordSessionStart(data.user.id);
        return { success: true };
      }

      return { success: false, error: 'Sign in failed. Please try again.' };
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: 'Sign in failed. Please try again.' };
    }
  },

  signUp: async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const redirectTo = getAuthRedirectUrl();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        ...(redirectTo && { options: { emailRedirectTo: redirectTo } }),
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        const user = await getUserWithProfile(data.user);
        const needsEmailConfirmation =
          typeof (data.user as { email_confirmed_at?: string | null }).email_confirmed_at !== 'undefined' &&
          !(data.user as { email_confirmed_at?: string | null }).email_confirmed_at;
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          hasCompletedOnboarding: false,
          needsEmailConfirmation: !!needsEmailConfirmation,
        });
        return { success: true };
      }

      return { success: false, error: 'Sign up failed' };
    } catch (error) {
      console.error('Sign up failed:', error);
      return { success: false, error: 'Sign up failed. Please try again.' };
    }
  },

  resetPassword: async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const redirectTo = getAuthRedirectUrl();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        ...(redirectTo && { redirectTo }),
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch {
      return { success: false, error: 'Could not send reset email. Try again.' };
    }
  },

  logout: async () => {
    const userId = get().user?.id;
    // 1) Global: revoke refresh token on server (may fail offline).
    // 2) Local: always remove session from storage - required on RN/Expo when global fails
    //    or storage would still rehydrate the user on next getSession().
    try {
      const { error: g } = await supabase.auth.signOut({ scope: 'global' });
      if (g) console.warn('[Auth] signOut global:', g.message);
    } catch (e) {
      console.warn('[Auth] signOut global exception:', e);
    }
    try {
      const { error: l } = await supabase.auth.signOut({ scope: 'local' });
      if (l) console.warn('[Auth] signOut local:', l.message);
    } catch (e) {
      console.warn('[Auth] signOut local exception:', e);
    }
    clearMemoryCache();
    if (userId) {
      void removeCacheSegment(cacheSegments.authUser(userId));
    }
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      hasCompletedOnboarding: null,
      needsEmailConfirmation: false,
    });
    if (userId) void endSession(userId).catch(() => {});
  },

  refreshOnboardingStatus: async () => {
    const { user, isAuthenticated, hasCompletedOnboarding } = get();
    if (!isAuthenticated || !user) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const done = await resolveOnboardingComplete(session.user.id);
      set({ hasCompletedOnboarding: hasCompletedOnboarding === true || done });
    } catch {
      // ignore
    }
  },

  setOnboardingComplete: async (stepsCompleted = ['goal']) => {
    const { user } = get();
    if (!user) return;
    const userId = user.id;
    let savedRemote = false;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? userId;
      const { error } = await supabase.from('user_onboarding').upsert(
        {
          user_id: uid,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          steps_completed: stepsCompleted,
          onboarding_version: 1,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
      if (error) {
        console.error('[Auth] user_onboarding upsert failed:', error.message, error.code);
      } else {
        savedRemote = true;
      }
    } catch (error) {
      console.error('[Auth] Failed to save onboarding completion:', error);
    }
    await markOnboardingCompleteLocal(userId);
    set({ hasCompletedOnboarding: true });
    if (!savedRemote) {
      console.warn('[Auth] Onboarding saved locally; Supabase sync may have failed.');
    }
  },

  /** Re-fetch display name, role, and company from profiles and update user. */
  refreshDisplayName: async () => {
    const { user } = get();
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, role, company_id')
        .eq('id', user.id)
        .maybeSingle();
      if (!error && data) {
        let companyName: string | null = null;
        if (data.company_id) {
          const { data: comp } = await supabase
            .from('companies')
            .select('name')
            .eq('id', data.company_id)
            .maybeSingle();
          companyName = (comp?.name as string | undefined) ?? null;
        }
        set((state) => ({
          user: state.user
            ? {
                ...state.user,
                displayName: (data.display_name as string | null)?.trim() || undefined,
                role: data.role === 'admin' ? 'admin' : 'user',
                companyId: (data.company_id as string | null) ?? null,
                companyName,
              }
            : null,
        }));
        return;
      }
      const { data: basic } = await supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle();
      const displayName = (basic?.display_name as string | null)?.trim() || undefined;
      set((state) => ({
        user: state.user ? { ...state.user, displayName } : null,
      }));
    } catch {
      // Non-fatal
    }
  },

  revalidateSession: async () => {
    return dedupeRequest('auth:revalidate_session', async () => {
      try {
        const { hasCompletedOnboarding: wasOnboarded, user: currentUser } = get();
        const {
          data: { session },
        } = await withTimeout(supabase.auth.getSession(), AUTH_SESSION_TIMEOUT_MS, 'Revalidate session');
        if (session?.user) {
          const needsEmailConfirmation =
            typeof (session.user as { email_confirmed_at?: string | null }).email_confirmed_at !== 'undefined' &&
            !(session.user as { email_confirmed_at?: string | null }).email_confirmed_at;
          const [user, resolved] = await Promise.all([
            getUserWithProfile(session.user),
            wasOnboarded === true ? Promise.resolve(true) : resolveOnboardingComplete(session.user.id),
          ]);
          set({
            user: user ?? currentUser,
            isAuthenticated: true,
            hasCompletedOnboarding: wasOnboarded === true || resolved,
            needsEmailConfirmation: !!needsEmailConfirmation,
          });
        } else {
          set({ user: null, isAuthenticated: false, hasCompletedOnboarding: null, needsEmailConfirmation: false });
        }
      } catch {
        // Non-fatal; keep current state
      }
    });
  },
}));
