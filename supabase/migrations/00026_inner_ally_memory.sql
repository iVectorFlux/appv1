-- =============================================================================
-- INNER ALLY LONG-TERM MEMORY (migration 00026)
-- =============================================================================
-- Rolling structured memory for Inner Ally: goals, open concerns, themes.
-- Updated server-side after chat turns; read into the Inner Ally system prompt.
-- Coach mode does not use this table.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.inner_ally_memory (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  summary         TEXT,
  goals           JSONB NOT NULL DEFAULT '[]'::jsonb,
  open_concerns   JSONB NOT NULL DEFAULT '[]'::jsonb,
  recurring_themes JSONB NOT NULL DEFAULT '[]'::jsonb,
  follow_ups      JSONB NOT NULL DEFAULT '[]'::jsonb,
  turn_count      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.inner_ally_memory IS
  'Long-term Inner Ally memory per user. Coach mode does not read or write here.';
COMMENT ON COLUMN public.inner_ally_memory.summary IS
  'Short narrative of what matters to this person across past Inner Ally chats.';
COMMENT ON COLUMN public.inner_ally_memory.goals IS
  'Inferred or stated wellbeing goals, e.g. ["manage work stress","sleep better"].';
COMMENT ON COLUMN public.inner_ally_memory.open_concerns IS
  'Unresolved topics to follow up on gently, e.g. ["conflict with manager"].';
COMMENT ON COLUMN public.inner_ally_memory.recurring_themes IS
  'Life domains that come up often, e.g. ["Work / School","Relationships"].';
COMMENT ON COLUMN public.inner_ally_memory.follow_ups IS
  'Topics to follow up on later, e.g. [{"topic":"feeling low","noted_at":"...","last_nudged_at":null,"resolved":false}]';

ALTER TABLE public.inner_ally_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inner_ally_memory_all_own" ON public.inner_ally_memory;
CREATE POLICY "inner_ally_memory_all_own" ON public.inner_ally_memory
  FOR ALL USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.inner_ally_memory;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.inner_ally_memory
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
