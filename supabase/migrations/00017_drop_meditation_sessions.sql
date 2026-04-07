-- Remove unused guided-meditation table (app uses Recover / grounding only via recovery_sessions).
-- Keeps recovery_sessions; drops meditation_sessions and the unused aggregate column on user_metrics.

DROP POLICY IF EXISTS "meditation_sessions_all_own" ON public.meditation_sessions;

DROP TABLE IF EXISTS public.meditation_sessions;

ALTER TABLE public.user_metrics
  DROP COLUMN IF EXISTS meditation_sessions_count;
