-- =============================================================================
-- EQ QUESTIONS TABLE
-- =============================================================================
-- Stores all assessment questions with type, domain, scoring rules, and payload.
-- Use for: reporting, admin, future server-side scoring, and single source of truth.
--
-- SCORING NOTES:
-- - reverse_keyed (Likert): when true, scale is inverted (disagreement = higher score).
--   We do NOT use "negative marking" (no points deducted for wrong answers).
-- - Meta-EQ: no reverse keying; score = calibration (how close self-rating matches
--   "how others would rate you"). Feeds self-awareness dimension + metaEQOutput.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.eq_questions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN (
    'forced_choice', 'likert', 'emotion_vocabulary', 'meta_eq',
    'physiological_proxy', 'consistency_probe', 'ranking_allocation',
    'sjt_decision', 'emotion_perception'
  )),
  domain TEXT NOT NULL CHECK (domain IN (
    'self_awareness', 'self_regulation', 'empathy', 'social_skills',
    'motivation', 'resilience'
  )),
  facet TEXT,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  version INT NOT NULL DEFAULT 1,

  -- Scoring (for server-side or reporting)
  reverse_keyed BOOLEAN NOT NULL DEFAULT FALSE,
  negative_marking BOOLEAN NOT NULL DEFAULT FALSE,
  scoring_config JSONB NOT NULL DEFAULT '{}',
  payload JSONB NOT NULL,

  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eq_questions_type ON public.eq_questions(type);
CREATE INDEX IF NOT EXISTS idx_eq_questions_domain ON public.eq_questions(domain);
CREATE INDEX IF NOT EXISTS idx_eq_questions_active ON public.eq_questions(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE public.eq_questions IS 'EQ assessment question bank: type, domain, reverse_keyed, scoring_config, and full payload for rendering.';
COMMENT ON COLUMN public.eq_questions.reverse_keyed IS 'Likert only: true = disagreement is scored as positive (scale inverted).';
COMMENT ON COLUMN public.eq_questions.negative_marking IS 'Reserved: true would mean wrong answer deducts points; currently unused.';
COMMENT ON COLUMN public.eq_questions.scoring_config IS 'Type-specific: scale, ideal_delta, paired_with_id, effectiveness/partialCredit per option, etc.';
COMMENT ON COLUMN public.eq_questions.payload IS 'Full question content: prompt, statement, scenario, options, anchor_labels, etc.';

-- RLS: read-only for authenticated (questions are global)
ALTER TABLE public.eq_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "eq_questions_select_all" ON public.eq_questions;
CREATE POLICY "eq_questions_select_all" ON public.eq_questions
  FOR SELECT TO authenticated USING (true);

-- Updated_at trigger
DROP TRIGGER IF EXISTS set_updated_at ON public.eq_questions;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.eq_questions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
