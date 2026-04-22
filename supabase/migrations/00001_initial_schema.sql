-- =============================================================================
-- EQ APP - FULL DATABASE MIGRATION (Supabase / PostgreSQL)
-- =============================================================================
-- One script: all tables, RLS, triggers. Safe to re-run.
--
-- How to run:
-- 1. In Cursor: open this file (supabase/migrations/00001_initial_schema.sql),
--    select all, copy.
-- 2. In browser: supabase.com → your project → SQL Editor → New query → paste → Run.
-- 3. Check Table Editor - you should see all tables.
-- =============================================================================

-- Enable required extensions (Supabase usually has these)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. PROFILES (extends auth.users - app-specific user data)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  locale TEXT NOT NULL DEFAULT 'en-US',
  display_name TEXT,
  is_demo_mode BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_updated ON public.profiles(updated_at DESC);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 2. ONBOARDING & PREFERENCES
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_onboarding (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  onboarding_version INT NOT NULL DEFAULT 1,
  steps_completed JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id TEXT NOT NULL,
  custom_text TEXT,
  selected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_primary BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_goals_user ON public.user_goals(user_id, is_primary DESC, selected_at DESC);

CREATE TABLE IF NOT EXISTS public.user_background (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  age_range TEXT,
  context TEXT,
  occupation_category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  check_in_frequency TEXT NOT NULL DEFAULT 'few_times_week'
    CHECK (check_in_frequency IN ('daily', 'few_times_week', 'weekly', 'when_reminded', 'no_reminders')),
  reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  reminder_times JSONB NOT NULL DEFAULT '[]',
  reminder_days JSONB NOT NULL DEFAULT '[0,1,2,3,4,5,6]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.onboarding_emotional_check (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  question_text TEXT,
  value_type TEXT NOT NULL CHECK (value_type IN ('scale', 'emotion', 'multi_emotion')),
  value_scale INT,
  value_emotion TEXT,
  value_emotions JSONB,
  order_index INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_emotional_user ON public.onboarding_emotional_check(user_id, order_index);

-- =============================================================================
-- 3. JOURNAL (encrypted body only - metadata for insights)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_source TEXT NOT NULL DEFAULT 'reflect' CHECK (entry_source IN ('reflect', 'journal_only')),
  pleasantness INT CHECK (pleasantness IS NULL OR (pleasantness >= 0 AND pleasantness <= 100)),
  energy_level INT CHECK (energy_level IS NULL OR (energy_level >= 1 AND energy_level <= 5)),
  emotions JSONB,
  reasons JSONB,
  journal_text_encrypted BYTEA NOT NULL DEFAULT ''::BYTEA,
  encryption_key_id UUID,
  encryption_iv BYTEA,
  word_count INT,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_journal_user_created ON public.journal_entries(user_id, created_at DESC)
  WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_journal_user_archived ON public.journal_entries(user_id, is_archived, created_at DESC)
  WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_journal_emotions_gin ON public.journal_entries USING GIN (emotions)
  WHERE is_deleted = FALSE AND emotions IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  rotated_at TIMESTAMPTZ,
  rotation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_encryption_keys_user ON public.encryption_keys(user_id, is_active);

CREATE TABLE IF NOT EXISTS public.journal_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  entry_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_journal_tags_user ON public.journal_tags(user_id, name);

CREATE TABLE IF NOT EXISTS public.journal_entry_tags (
  entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.journal_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (entry_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_journal_entry_tags_entry ON public.journal_entry_tags(entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_tags_tag ON public.journal_entry_tags(tag_id);

-- =============================================================================
-- 4. EQ ASSESSMENTS (sessions + per-question responses + scores)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.eq_assessment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  assessment_type TEXT NOT NULL CHECK (assessment_type IN ('check_in', 'full_test')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INT,
  questions_answered INT DEFAULT 0,
  total_questions INT,
  overall_score INT,
  dimension_scores JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eq_sessions_user_created ON public.eq_assessment_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_eq_sessions_status ON public.eq_assessment_sessions(user_id, status, started_at DESC);

CREATE TABLE IF NOT EXISTS public.eq_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.eq_assessment_sessions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  question_type TEXT NOT NULL,
  domain TEXT NOT NULL,
  response JSONB NOT NULL,
  score INT,
  order_index INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eq_check_ins_session ON public.eq_check_ins(session_id, order_index);
CREATE INDEX IF NOT EXISTS idx_eq_check_ins_user_created ON public.eq_check_ins(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.eq_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES public.eq_assessment_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL,
  overall_score INT NOT NULL,
  dimension_scores JSONB NOT NULL,
  quality_indicators JSONB,
  strengths JSONB,
  growth_areas JSONB,
  insights JSONB,
  response_ids JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eq_scores_user_completed ON public.eq_scores(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_eq_scores_session ON public.eq_scores(session_id);

-- =============================================================================
-- 5. INSIGHTS (derived from metadata only - never journal text)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority INT DEFAULT 0,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  is_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
  dismissed_at TIMESTAMPTZ,
  source_data JSONB,
  confidence_score REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insights_user_created ON public.insights(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_insights_user_unread ON public.insights(user_id, is_read, priority DESC, created_at DESC)
  WHERE is_dismissed = FALSE;

CREATE TABLE IF NOT EXISTS public.insight_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_id UUID NOT NULL REFERENCES public.insights(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insight_actions_insight ON public.insight_actions(insight_id, created_at DESC);

-- =============================================================================
-- 6. RECOVERY & MEDITATION SESSIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.recovery_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('breathing', 'grounding', 'release', 'meditation')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INT,
  technique TEXT,
  intensity INT,
  effectiveness INT,
  release_text_encrypted BYTEA,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recovery_user_created ON public.recovery_sessions(user_id, started_at DESC);

CREATE TABLE IF NOT EXISTS public.meditation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audio_id TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INT,
  progress_pct INT,
  rating INT,
  notes_encrypted BYTEA,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meditation_user_created ON public.meditation_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_meditation_audio ON public.meditation_sessions(user_id, audio_id, started_at DESC);

-- =============================================================================
-- 7. LEARNING (global content + per-user progress)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.learning_modules (
  id TEXT PRIMARY KEY,
  dimension TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  description TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  video_url TEXT NOT NULL,
  audio_duration_sec INT,
  video_duration_sec INT,
  icon TEXT,
  color TEXT,
  key_takeaways JSONB,
  order_index INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_learning_dimension ON public.learning_modules(dimension, order_index);

CREATE TABLE IF NOT EXISTS public.learning_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL REFERENCES public.learning_modules(id) ON DELETE CASCADE,
  audio_completed BOOLEAN NOT NULL DEFAULT FALSE,
  video_completed BOOLEAN NOT NULL DEFAULT FALSE,
  audio_progress_pct INT DEFAULT 0,
  video_progress_pct INT DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_learning_progress_user ON public.learning_progress(user_id, last_accessed_at DESC NULLS LAST);

-- =============================================================================
-- 8. USER METRICS (aggregates - optional, for dashboards)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  journal_entries_count INT DEFAULT 0,
  eq_check_ins_count INT DEFAULT 0,
  recovery_sessions_count INT DEFAULT 0,
  meditation_sessions_count INT DEFAULT 0,
  avg_pleasantness REAL,
  avg_energy_level REAL,
  top_emotions JSONB,
  avg_eq_score REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_user_metrics_date ON public.user_metrics(user_id, date DESC);

-- =============================================================================
-- 9. USER SESSIONS (audit / time-on-app: session start and end)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_started ON public.user_sessions(user_id, started_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) - every table scoped by auth.uid()
-- =============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_background ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_emotional_check ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eq_assessment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eq_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eq_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insight_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meditation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Policies: user can only access their own rows (drop first so script is re-runnable)
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "user_onboarding_all_own" ON public.user_onboarding;
DROP POLICY IF EXISTS "user_goals_all_own" ON public.user_goals;
DROP POLICY IF EXISTS "user_background_all_own" ON public.user_background;
DROP POLICY IF EXISTS "user_preferences_all_own" ON public.user_preferences;
DROP POLICY IF EXISTS "onboarding_emotional_all_own" ON public.onboarding_emotional_check;
CREATE POLICY "user_onboarding_all_own" ON public.user_onboarding FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_goals_all_own" ON public.user_goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_background_all_own" ON public.user_background FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_preferences_all_own" ON public.user_preferences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "onboarding_emotional_all_own" ON public.onboarding_emotional_check FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "journal_entries_all_own" ON public.journal_entries;
CREATE POLICY "journal_entries_all_own" ON public.journal_entries FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "encryption_keys_all_own" ON public.encryption_keys;
CREATE POLICY "encryption_keys_all_own" ON public.encryption_keys FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "journal_tags_all_own" ON public.journal_tags;
CREATE POLICY "journal_tags_all_own" ON public.journal_tags FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "journal_entry_tags_all_own" ON public.journal_entry_tags;
CREATE POLICY "journal_entry_tags_all_own" ON public.journal_entry_tags FOR ALL
  USING (EXISTS (SELECT 1 FROM public.journal_entries e WHERE e.id = entry_id AND e.user_id = auth.uid()));

DROP POLICY IF EXISTS "eq_sessions_all_own" ON public.eq_assessment_sessions;
DROP POLICY IF EXISTS "eq_check_ins_all_own" ON public.eq_check_ins;
DROP POLICY IF EXISTS "eq_scores_all_own" ON public.eq_scores;
DROP POLICY IF EXISTS "insights_all_own" ON public.insights;
DROP POLICY IF EXISTS "insight_actions_all_own" ON public.insight_actions;
DROP POLICY IF EXISTS "recovery_sessions_all_own" ON public.recovery_sessions;
DROP POLICY IF EXISTS "meditation_sessions_all_own" ON public.meditation_sessions;
DROP POLICY IF EXISTS "learning_progress_all_own" ON public.learning_progress;
DROP POLICY IF EXISTS "user_metrics_all_own" ON public.user_metrics;
DROP POLICY IF EXISTS "user_sessions_all_own" ON public.user_sessions;
CREATE POLICY "user_metrics_all_own" ON public.user_metrics FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_sessions_all_own" ON public.user_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "eq_sessions_all_own" ON public.eq_assessment_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "eq_check_ins_all_own" ON public.eq_check_ins FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "eq_scores_all_own" ON public.eq_scores FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "insights_all_own" ON public.insights FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "insight_actions_all_own" ON public.insight_actions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "recovery_sessions_all_own" ON public.recovery_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "meditation_sessions_all_own" ON public.meditation_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "learning_progress_all_own" ON public.learning_progress FOR ALL USING (auth.uid() = user_id);

-- learning_modules: read-only for all authenticated users (no user_id)
ALTER TABLE public.learning_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "learning_modules_select_all" ON public.learning_modules;
CREATE POLICY "learning_modules_select_all" ON public.learning_modules FOR SELECT TO authenticated USING (true);

-- =============================================================================
-- UPDATED_AT TRIGGER (keep updated_at in sync)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON public.user_onboarding;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_onboarding FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON public.user_background;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_background FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON public.user_preferences;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON public.journal_entries;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON public.eq_assessment_sessions;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.eq_assessment_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON public.insights;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.insights FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON public.learning_progress;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.learning_progress FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON public.learning_modules;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.learning_modules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON COLUMN public.profiles.display_name IS 'Preferred name for the user (onboarding).';
