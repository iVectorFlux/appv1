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
import { supabase } from '@/lib/supabase';
import type { User, AuthState } from '@/types';

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
  login: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  /** Mark onboarding complete (writes to Supabase user_onboarding, sets hasCompletedOnboarding). */
  setOnboardingComplete: (stepsCompleted?: string[]) => Promise<void>;
  /** Re-fetch onboarding status from Supabase (e.g. after completing onboarding). */
  refreshOnboardingStatus: () => Promise<void>;
  /** Re-fetch display name from profiles and update user (e.g. after onboarding or profile edit). */
  refreshDisplayName: () => Promise<void>;
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
        let hasCompletedOnboarding = false;
        try {
          const { data: row } = await supabase
            .from('user_onboarding')
            .select('completed_at')
            .eq('user_id', session.user.id)
            .maybeSingle();
          hasCompletedOnboarding = !!row?.completed_at;
        } catch {
          // Table may not exist or RLS; treat as not completed
        }
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

      supabase.auth.onAuthStateChange(async (_event, session) => {
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
          get().refreshOnboardingStatus();
        } else {
          set({ user: null, isAuthenticated: false, hasCompletedOnboarding: null, needsEmailConfirmation: false });
        }
      });
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      set({ isLoading: false });
    }
  },

  login: async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

      if (error) {
        console.error('Supabase login error:', error.message);
        return false;
      }

      if (data.user) {
        const user = await getUserWithProfile(data.user);
        const needsEmailConfirmation =
          typeof (data.user as { email_confirmed_at?: string | null }).email_confirmed_at !== 'undefined' &&
          !(data.user as { email_confirmed_at?: string | null }).email_confirmed_at;
        let hasCompletedOnboarding = false;
        try {
          const { data: row } = await supabase
            .from('user_onboarding')
            .select('completed_at')
            .eq('user_id', data.user.id)
            .maybeSingle();
          hasCompletedOnboarding = !!row?.completed_at;
        } catch {
          // ignore
        }
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          hasCompletedOnboarding,
          needsEmailConfirmation: !!needsEmailConfirmation,
        });
        recordSessionStart(data.user.id);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
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

  logout: async () => {
    const userId = get().user?.id;
    try {
      if (userId) await endSession(userId);
      await supabase.auth.signOut();
      set({ user: null, isAuthenticated: false, hasCompletedOnboarding: null, needsEmailConfirmation: false });
    } catch (error) {
      console.error('Logout failed:', error);
      set({ user: null, isAuthenticated: false, hasCompletedOnboarding: null, needsEmailConfirmation: false });
    }
  },

  refreshOnboardingStatus: async () => {
    const { user, isAuthenticated } = get();
    if (!isAuthenticated || !user) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data: row } = await supabase
        .from('user_onboarding')
        .select('completed_at')
        .eq('user_id', session.user.id)
        .maybeSingle();
      set({ hasCompletedOnboarding: !!row?.completed_at });
    } catch {
      // ignore
    }
  },

  setOnboardingComplete: async (stepsCompleted = ['goal']) => {
    const { user } = get();
    if (!user) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { error } = await supabase.from('user_onboarding').upsert(
        {
          user_id: session.user.id,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          steps_completed: stepsCompleted,
          onboarding_version: 1,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
      if (error) {
        console.error('[Auth] user_onboarding upsert failed:', error.message, error.code, '- Run supabase/migrations/00001_initial_schema.sql in Supabase SQL Editor.');
      }
      set({ hasCompletedOnboarding: true });
    } catch (error) {
      console.error('[Auth] Failed to save onboarding completion:', error);
      set({ hasCompletedOnboarding: true });
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
    } catch (_) {
      // Non-fatal
    }
  },
}));
