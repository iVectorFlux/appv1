-- Add timestamped follow-up items for proactive Inner Ally nudges across fresh sessions.

ALTER TABLE public.inner_ally_memory
  ADD COLUMN IF NOT EXISTS follow_ups JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.inner_ally_memory.follow_ups IS
  'Topics to follow up on later, e.g. [{"topic":"feeling low","noted_at":"...","last_nudged_at":null,"resolved":false}]';
