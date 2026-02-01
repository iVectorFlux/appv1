-- =============================================================================
-- Consolidate onboarding multi-select into user_preferences (one row per user)
-- =============================================================================
-- Replaces: user_goals (one row per goal) + user_background (one row per user)
-- with: user_preferences.goals (JSONB array) + user_preferences.context (JSONB)
--
-- Scalability: One row per user + JSONB for multi-select is better for:
--   - Read path: one query to load all preferences and goals
--   - Write path: one upsert instead of N inserts
--   - Still queryable: GIN index on goals allows "users who selected goal X"
-- =============================================================================

-- 1. Add goals and context to user_preferences
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS goals JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS context JSONB;

COMMENT ON COLUMN public.user_preferences.goals IS 'Onboarding "what brings you here" goal ids as JSON array, e.g. ["understand_emotions","handle_stress"]';
COMMENT ON COLUMN public.user_preferences.context IS 'Optional "using for" context ids as JSON array; reserved for future use';

-- 2. Migrate existing user_goals into user_preferences.goals (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_goals') THEN
    UPDATE public.user_preferences up
    SET goals = sub.goals
    FROM (
      SELECT user_id, coalesce(jsonb_agg(goal_id ORDER BY is_primary DESC, selected_at), '[]') AS goals
      FROM public.user_goals
      GROUP BY user_id
    ) sub
    WHERE up.user_id = sub.user_id;

    INSERT INTO public.user_preferences (user_id, goals)
    SELECT user_id, coalesce(jsonb_agg(goal_id ORDER BY is_primary DESC, selected_at), '[]')
    FROM public.user_goals
    GROUP BY user_id
    ON CONFLICT (user_id) DO UPDATE SET goals = EXCLUDED.goals;
  END IF;
END $$;

-- 3. Migrate user_background.context into user_preferences.context (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_background') THEN
    UPDATE public.user_preferences up
    SET context = sub.context_json
    FROM (
      SELECT ub.user_id,
        CASE
          WHEN trim(ub.context) = '' OR ub.context IS NULL THEN NULL
          ELSE to_jsonb(string_to_array(trim(ub.context), ','))
        END AS context_json
      FROM public.user_background ub
    ) sub
    WHERE up.user_id = sub.user_id AND sub.context_json IS NOT NULL;
  END IF;
END $$;

-- 4. Drop old tables (RLS policies drop with the table)
DROP TABLE IF EXISTS public.user_goals;
DROP TABLE IF EXISTS public.user_background;

-- 5. Optional: GIN index for querying "users who selected goal X" (e.g. analytics)
CREATE INDEX IF NOT EXISTS idx_user_preferences_goals_gin ON public.user_preferences USING GIN (goals);
