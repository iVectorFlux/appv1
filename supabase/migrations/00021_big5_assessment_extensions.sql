-- =============================================================================
-- MIGRATION 00021: Big Five extended scoring (norms, validity, reliability)
-- =============================================================================
-- Adds optional JSONB columns for z-scores, percentiles, reliability estimates,
-- validity flags, and session duration. Existing `scores` remains raw OCEAN 1–5.
-- =============================================================================

ALTER TABLE public.big5_assessments
  ADD COLUMN IF NOT EXISTS scores_normalized JSONB,
  ADD COLUMN IF NOT EXISTS percentiles JSONB,
  ADD COLUMN IF NOT EXISTS reliability JSONB,
  ADD COLUMN IF NOT EXISTS validity_flags JSONB,
  ADD COLUMN IF NOT EXISTS duration_seconds DOUBLE PRECISION;

COMMENT ON COLUMN public.big5_assessments.scores_normalized IS
  'Z-scores vs placeholder population mean/SD (same keys as scores).';
COMMENT ON COLUMN public.big5_assessments.percentiles IS
  'Approximate percentiles 0–100 from normal CDF of z-scores.';
COMMENT ON COLUMN public.big5_assessments.reliability IS
  'Per-trait effective alpha and low_confidence flags (reference × session quality).';
COMMENT ON COLUMN public.big5_assessments.validity_flags IS
  'inconsistent, straight_lining, too_fast, reverse_pair_conflicts.';
COMMENT ON COLUMN public.big5_assessments.duration_seconds IS
  'Wall time for the 50-question session (optional).';
