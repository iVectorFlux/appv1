-- =============================================================================
-- AI CHAT MESSAGES + FUTURE SKILLS (migration 00007)
-- =============================================================================
-- Tables:
--   ai_chat_messages  - stores chat turns for Inner Ally and Coach modes
--   skills_sessions   - stores AI practice question/answer/feedback rounds
--   skills_progress   - aggregated per-user per-skill progress
-- All tables use RLS: user can only read/write their own rows.
-- =============================================================================

-- =============================================================================
-- 1. AI CHAT MESSAGES
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode         TEXT NOT NULL CHECK (mode IN ('inner_ally', 'coach')),
  role         TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content      TEXT NOT NULL,
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_user_mode_created
  ON public.ai_chat_messages(user_id, mode, created_at DESC);

-- =============================================================================
-- 2. SKILLS SESSIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.skills_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id        TEXT NOT NULL,
  atomic_skill_id TEXT,
  scenario        TEXT,
  ai_question     TEXT NOT NULL,
  user_answer     TEXT NOT NULL,
  ai_feedback     TEXT NOT NULL,
  strengths       JSONB,
  growth_areas    JSONB,
  attempt_number  INT NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skills_sessions_user_skill
  ON public.skills_sessions(user_id, skill_id, created_at DESC);

-- =============================================================================
-- 3. SKILLS PROGRESS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.skills_progress (
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id           TEXT NOT NULL,
  sessions_completed INT NOT NULL DEFAULT 0,
  last_practiced_at  TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_skills_progress_user
  ON public.skills_progress(user_id, last_practiced_at DESC NULLS LAST);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills_sessions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills_progress   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_chat_messages_all_own" ON public.ai_chat_messages;
CREATE POLICY "ai_chat_messages_all_own" ON public.ai_chat_messages
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "skills_sessions_all_own" ON public.skills_sessions;
CREATE POLICY "skills_sessions_all_own" ON public.skills_sessions
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "skills_progress_all_own" ON public.skills_progress;
CREATE POLICY "skills_progress_all_own" ON public.skills_progress
  FOR ALL USING (auth.uid() = user_id);

-- =============================================================================
-- UPDATED_AT TRIGGER for skills_progress
-- =============================================================================
DROP TRIGGER IF EXISTS set_updated_at ON public.skills_progress;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.skills_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
