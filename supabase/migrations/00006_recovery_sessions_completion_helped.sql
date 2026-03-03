-- Add completion and "did it help?" to recovery (grounding/breathing) sessions for logging.
ALTER TABLE public.recovery_sessions
  ADD COLUMN IF NOT EXISTS completion_pct INT,
  ADD COLUMN IF NOT EXISTS helped BOOLEAN;

COMMENT ON COLUMN public.recovery_sessions.completion_pct IS '0-100, from app when user completes the exercise';
COMMENT ON COLUMN public.recovery_sessions.helped IS 'User said "Yes" or "Not really" to "Did it help?"';
