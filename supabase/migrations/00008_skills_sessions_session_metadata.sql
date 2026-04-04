-- Optional JSON for Skill Lab decision flow (options, choice, consequences, reflection)
ALTER TABLE public.skills_sessions
  ADD COLUMN IF NOT EXISTS session_metadata JSONB;

COMMENT ON COLUMN public.skills_sessions.session_metadata IS
  'Decision simulator: decisionOptions, selectedDecisionId, consequences, reflectionQuestion, etc.';
