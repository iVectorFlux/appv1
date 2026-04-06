-- Upload rows via Table Editor or SQL: you can leave id, created_at, updated_at, language empty
-- (defaults apply). Required: eq_type (B2C = personal, B2B = professional), domain, competency,
-- episode_title, content_type (audio | video), s3_link. Pair one video + one audio row by using the
-- same eq_type, domain, competency, episode_title, and language.
--
-- Easier inserts in Dashboard / SQL: id and timestamps optional; language defaults to en.
ALTER TABLE public.learning_content
  ALTER COLUMN id SET DEFAULT (gen_random_uuid()::text),
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.learning_content
  ALTER COLUMN language SET DEFAULT 'en';

ALTER TABLE public.learning_content
  ALTER COLUMN content_for SET DEFAULT 'EQ';

-- Per-user progress for catalog episodes (pairs video+audio by episode_key in app).
CREATE TABLE IF NOT EXISTS public.learning_content_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  episode_key TEXT NOT NULL,
  video_completed BOOLEAN NOT NULL DEFAULT FALSE,
  audio_completed BOOLEAN NOT NULL DEFAULT FALSE,
  video_progress_pct INT NOT NULL DEFAULT 0,
  audio_progress_pct INT NOT NULL DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, episode_key)
);

CREATE INDEX IF NOT EXISTS idx_learning_content_progress_user
  ON public.learning_content_progress (user_id, last_accessed_at DESC NULLS LAST);

ALTER TABLE public.learning_content_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "learning_content_progress_own" ON public.learning_content_progress;
CREATE POLICY "learning_content_progress_own"
  ON public.learning_content_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_updated_at ON public.learning_content_progress;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.learning_content_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
