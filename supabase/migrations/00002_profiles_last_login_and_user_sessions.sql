-- =============================================================================
-- PROFILES: last_login_at + USER_SESSIONS (time-on-app audit)
-- =============================================================================
-- Run after 00001_initial_schema.sql. Safe to re-run (IF NOT EXISTS / ADD IF NOT EXISTS).

-- Last time the user signed in (updated on login and on app init when session exists)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.last_login_at IS 'Set on each login / app open with valid session; used for profile and audit.';

-- Audit / time-on-app: one row per app session (login → logout or app background)
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_started ON public.user_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_ended ON public.user_sessions(user_id, ended_at DESC NULLS LAST);

COMMENT ON TABLE public.user_sessions IS 'Audit log: app session start/end for time-on-app and last activity.';

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_sessions_all_own" ON public.user_sessions;
CREATE POLICY "user_sessions_all_own" ON public.user_sessions
  FOR ALL USING (auth.uid() = user_id);
