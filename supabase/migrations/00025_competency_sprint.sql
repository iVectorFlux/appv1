-- =============================================================================
-- COMPETENCY SPRINTS SCHEMA (migration 00025)
-- =============================================================================
-- Table:
--   competency_sprints - stores the state and transcripts of linear competency sprints
-- Uses RLS: user can only read/write their own rows.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.competency_sprints (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id              TEXT NOT NULL,
  status                TEXT NOT NULL CHECK (status IN ('active', 'completed')),
  current_stage         TEXT NOT NULL DEFAULT 'primer',
  micro_skills          JSONB DEFAULT '[]'::jsonb,
  micro_drills_progress JSONB DEFAULT '[]'::jsonb,
  guided_sim_chat       JSONB DEFAULT '[]'::jsonb,
  independent_sim_chat  JSONB DEFAULT '[]'::jsonb,
  escalated_sim_chat    JSONB DEFAULT '[]'::jsonb,
  final_report          JSONB DEFAULT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_competency_sprints_user_skill
  ON public.competency_sprints(user_id, skill_id, created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE public.competency_sprints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "competency_sprints_all_own" ON public.competency_sprints;
CREATE POLICY "competency_sprints_all_own" ON public.competency_sprints
  FOR ALL USING (auth.uid() = user_id);

-- =============================================================================
-- UPDATED_AT TRIGGER
-- =============================================================================
DROP TRIGGER IF EXISTS set_updated_at ON public.competency_sprints;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.competency_sprints
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
