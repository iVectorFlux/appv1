-- Extra fields for analytics and product insights on grounding / recovery sessions.
ALTER TABLE public.recovery_sessions
  ADD COLUMN IF NOT EXISTS stress_after INT,
  ADD COLUMN IF NOT EXISTS session_metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.recovery_sessions.stress_after IS 'Self-reported stress 1–5 after exercise (nullable when not collected)';
COMMENT ON COLUMN public.recovery_sessions.session_metadata IS 'Optional JSON: emotional_tone, entry_tag, source screen, etc.';
