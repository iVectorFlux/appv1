-- =============================================================================
-- MIGRATION 00020: Big Five (Mini-IPIP) personality assessments
-- =============================================================================
-- Stores completed Mini-IPIP–style (20-item) responses and derived OCEAN scores.
-- Run in Supabase SQL Editor after prior migrations.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.big5_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instrument_version TEXT NOT NULL DEFAULT 'ipip_big5_50_v1',
  responses JSONB NOT NULL,
  scores JSONB NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_big5_assessments_user_completed
  ON public.big5_assessments(user_id, completed_at DESC);

COMMENT ON TABLE public.big5_assessments IS
  'Big Five (IPIP markers). responses: { big5_01..50: 1-5 }. scores: OCEAN on 1-5; N = Neuroticism (inverse of Emotional Stability mean).';

ALTER TABLE public.big5_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "big5_assessments_all_own" ON public.big5_assessments;
CREATE POLICY "big5_assessments_all_own" ON public.big5_assessments
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
