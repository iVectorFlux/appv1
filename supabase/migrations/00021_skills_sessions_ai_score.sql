-- AI-assessed score (0–10) per practice response (enforced in app + API)
ALTER TABLE public.skills_sessions
  ADD COLUMN IF NOT EXISTS ai_score SMALLINT;

COMMENT ON COLUMN public.skills_sessions.ai_score IS
  'Coach model score 0–10 for the learner response on this round.';
