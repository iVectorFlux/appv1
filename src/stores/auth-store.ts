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
  isOnboardingCompleteLocal,
  markOnboardingCompleteLocal,
} from '@/services/onboarding-progress';
import type { User, AuthState } from '@/types';

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
  displayName?: string | null
): User {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? undefined,
    username: supabaseUser.email?.split('@')[0] ?? supabaseUser.id.slice(0, 8),
    displayName: displayName?.trim() || undefined,
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

/** Fetch display_name from profiles and return full User. */
async function getUserWithProfile(supabaseUser: { id: string; email?: string; created_at: string }): Promise<User> {
  try {
    const { data } = await supabase.from('profiles').select('display_name').eq('id', supabaseUser.id).maybeSingle();
    return mapSupabaseUserToAppUser(supabaseUser, data?.display_name);
  } catch {
    return mapSupabaseUserToAppUser(supabaseUser, null);
  }
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

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  hasCompletedOnboarding: null,
  needsEmailConfirmation: false,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const user = await getUserWithProfile(session.user);
        const needsEmailConfirmation =
          typeof (session.user as { email_confirmed_at?: string | null }).email_confirmed_at !== 'undefined' &&
          !(session.user as { email_confirmed_at?: string | null }).email_confirmed_at;
        const hasCompletedOnboarding = await resolveOnboardingComplete(session.user.id);
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          hasCompletedOnboarding,
          needsEmailConfirmation: !!needsEmailConfirmation,
        });
        recordSessionStart(session.user.id);
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false, hasCompletedOnboarding: null, needsEmailConfirmation: false });
      }

      supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const user = await getUserWithProfile(session.user);
          const needsEmailConfirmation =
            typeof (session.user as { email_confirmed_at?: string | null }).email_confirmed_at !== 'undefined' &&
            !(session.user as { email_confirmed_at?: string | null }).email_confirmed_at;
          set({
            user,
            isAuthenticated: true,
            needsEmailConfirmation: !!needsEmailConfirmation,
          });
          // Token refresh on app resume must not re-run onboarding checks (RLS race → false redirect).
          if (event !== 'TOKEN_REFRESHED' && event !== 'INITIAL_SESSION') {
            get().refreshOnboardingStatus();
          }
        } else {
          set({ user: null, isAuthenticated: false, hasCompletedOnboarding: null, needsEmailConfirmation: false });
        }
      });
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

  refreshDisplayName: async () => {
    const { user } = get();
    if (!user?.id) return;
    try {
      const { data } = await supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle();
      const displayName = data?.display_name?.trim() || undefined;
      set((state) => ({
        user: state.user ? { ...state.user, displayName } : null,
      }));
    } catch {
      // Non-fatal
    }
  },

  revalidateSession: async () => {
    try {
      const { hasCompletedOnboarding: wasOnboarded } = get();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const user = await getUserWithProfile(session.user);
        const needsEmailConfirmation =
          typeof (session.user as { email_confirmed_at?: string | null }).email_confirmed_at !== 'undefined' &&
          !(session.user as { email_confirmed_at?: string | null }).email_confirmed_at;
        const resolved = await resolveOnboardingComplete(session.user.id);
        set({
          user,
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
  },
}));
