-- =============================================================================
-- MIGRATION 00009: Inner Ally auto-journal + Skill analytics expansion
-- =============================================================================
--
-- 1. journal_entries
--    - Allow entry_source = 'inner_ally' (auto-saved from chat)
--    - Add chat_message_id (nullable) to trace back to the originating chat turn
--
-- 2. skills_sessions
--    - Add duration_ms    — time from scenario load to feedback received
--    - Add practice_mode  — which workflow was used (decision_simulator etc.)
--
-- 3. skills_progress
--    - Add total_time_ms          — cumulative practice time per skill
--    - Add scenarios_attempted    — total scenario loads (including abandoned)
--    - Add top_strengths          — JSONB: most frequent strength tags across sessions
--    - Add top_growth_areas       — JSONB: most frequent growth area tags
--    - Add atomic_skill_breakdown — JSONB: { atomicSkillId: sessions_count }
--
-- HOW TO RUN:
-- Supabase dashboard → SQL Editor → paste this file → Run
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. journal_entries: allow 'inner_ally' as entry_source
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop existing check constraint (constraint name may vary; try both)
ALTER TABLE public.journal_entries
  DROP CONSTRAINT IF EXISTS journal_entries_entry_source_check;

-- Re-add with inner_ally included
ALTER TABLE public.journal_entries
  ADD CONSTRAINT journal_entries_entry_source_check
  CHECK (entry_source IN ('reflect', 'journal_only', 'inner_ally'));

-- Add nullable FK back to the originating chat message
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS chat_message_id UUID REFERENCES public.ai_chat_messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_journal_chat_message
  ON public.journal_entries(chat_message_id)
  WHERE chat_message_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. skills_sessions: add duration_ms and practice_mode
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.skills_sessions
  ADD COLUMN IF NOT EXISTS duration_ms   INT,
  ADD COLUMN IF NOT EXISTS practice_mode TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. skills_progress: expand analytics columns
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.skills_progress
  ADD COLUMN IF NOT EXISTS total_time_ms          BIGINT  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scenarios_attempted     INT     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS top_strengths           JSONB,
  ADD COLUMN IF NOT EXISTS top_growth_areas        JSONB,
  ADD COLUMN IF NOT EXISTS atomic_skill_breakdown  JSONB;

COMMENT ON COLUMN public.skills_progress.total_time_ms IS
  'Cumulative ms spent actively practicing this skill (sum of duration_ms across sessions).';
COMMENT ON COLUMN public.skills_progress.scenarios_attempted IS
  'Total number of scenarios started (includes incomplete rounds without feedback).';
COMMENT ON COLUMN public.skills_progress.top_strengths IS
  'JSONB array of most-frequent strength tags, e.g. ["clear reasoning","trade-off awareness"].';
COMMENT ON COLUMN public.skills_progress.top_growth_areas IS
  'JSONB array of most-frequent growth area tags.';
COMMENT ON COLUMN public.skills_progress.atomic_skill_breakdown IS
  'JSONB map of atomicSkillId → sessions_completed, e.g. {"bias_detection":3,"first_principles_thinking":1}.';
