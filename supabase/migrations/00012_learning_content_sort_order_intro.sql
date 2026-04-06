-- Explicit curriculum order for Learn EQ (B2C personal + B2B professional).
-- B2C sequence: intro → foundations → existing dimension lessons → resilience.
-- B2B sequence: follows the order already used in seed data (workplace track).

ALTER TABLE public.learning_content
  ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 100;

CREATE INDEX IF NOT EXISTS idx_learning_content_sort
  ON public.learning_content (eq_type, sort_order, episode_title);

-- ─── B2C personal (1–99) ───────────────────────────────────────────────────
UPDATE public.learning_content SET sort_order = 10
  WHERE eq_type = 'B2C' AND episode_title = 'Name it to tame it';
UPDATE public.learning_content SET sort_order = 20
  WHERE eq_type = 'B2C' AND episode_title = 'The pause button';
UPDATE public.learning_content SET sort_order = 30
  WHERE eq_type = 'B2C' AND episode_title = 'In their shoes';
UPDATE public.learning_content SET sort_order = 40
  WHERE eq_type = 'B2C' AND episode_title = 'Words that land';
UPDATE public.learning_content SET sort_order = 50
  WHERE eq_type = 'B2C' AND episode_title = 'Why before willpower';

-- ─── B2B professional (100–999) — same order as original seed file ─────────
UPDATE public.learning_content SET sort_order = 100
  WHERE eq_type = 'B2B' AND episode_title = 'Name it to tame it';
UPDATE public.learning_content SET sort_order = 110
  WHERE eq_type = 'B2B' AND episode_title = 'Calm in the Chaos';
UPDATE public.learning_content SET sort_order = 120
  WHERE eq_type = 'B2B' AND episode_title = 'Plot Twist ; Hope Wins';
UPDATE public.learning_content SET sort_order = 130
  WHERE eq_type = 'B2B' AND episode_title = 'The Art of the Pivot';
UPDATE public.learning_content SET sort_order = 140
  WHERE eq_type = 'B2B' AND episode_title = 'Chasing Better';
UPDATE public.learning_content SET sort_order = 150
  WHERE eq_type = 'B2B' AND episode_title = 'In Their Shoes';
UPDATE public.learning_content SET sort_order = 160
  WHERE eq_type = 'B2B' AND episode_title = 'Reading the Room';
UPDATE public.learning_content SET sort_order = 170
  WHERE eq_type = 'B2B' AND episode_title = 'Persuasion, Not Pressure';
UPDATE public.learning_content SET sort_order = 180
  WHERE eq_type = 'B2B' AND episode_title = 'Torchbearer';
UPDATE public.learning_content SET sort_order = 190
  WHERE eq_type = 'B2B' AND episode_title = 'The Bridge Builders';
UPDATE public.learning_content SET sort_order = 200
  WHERE eq_type = 'B2B' AND episode_title = 'We > Me';
UPDATE public.learning_content SET sort_order = 210
  WHERE eq_type = 'B2B' AND episode_title = 'Light the Way';
UPDATE public.learning_content SET sort_order = 220
  WHERE eq_type = 'B2B' AND episode_title = 'Mirror, Meet Mind';
UPDATE public.learning_content SET sort_order = 230
  WHERE eq_type = 'B2B' AND episode_title = 'The Pause Button';
UPDATE public.learning_content SET sort_order = 240
  WHERE eq_type = 'B2B' AND episode_title = 'The Bright Side Chronicles';
UPDATE public.learning_content SET sort_order = 250
  WHERE eq_type = 'B2B' AND episode_title = 'Change Is the Character Arc';
UPDATE public.learning_content SET sort_order = 260
  WHERE eq_type = 'B2B' AND episode_title = 'Level Up Arc';
UPDATE public.learning_content SET sort_order = 270
  WHERE eq_type = 'B2B' AND episode_title = 'Feel It to Get It';
UPDATE public.learning_content SET sort_order = 280
  WHERE eq_type = 'B2B' AND episode_title = 'The Unspoken Rules';
UPDATE public.learning_content SET sort_order = 290
  WHERE eq_type = 'B2B' AND episode_title = 'The Ripple Effect';
UPDATE public.learning_content SET sort_order = 300
  WHERE eq_type = 'B2B' AND episode_title = 'Growth Is Contagious';
UPDATE public.learning_content SET sort_order = 310
  WHERE eq_type = 'B2B' AND episode_title = 'Tension Into Turning Point';
UPDATE public.learning_content SET sort_order = 320
  WHERE eq_type = 'B2B' AND episode_title = 'The Assist';
UPDATE public.learning_content SET sort_order = 330
  WHERE eq_type = 'B2B' AND episode_title = 'Borrow My Belief';

-- ─── New B2C rows (upload media to these paths or update s3_link in SQL Editor) ───
-- Intro rows use B2C pillar domain SELF_AWARENESS; app labels intro by episode_title.
INSERT INTO public.learning_content (
  id, content_for, eq_type, domain, competency, episode_title, episode_description,
  industry, level, content_type, s3_link, created_at, updated_at, language, sort_order
) VALUES
(
  'lceqfnd02aud0002en',
  'EQ', 'B2C', 'SELF_AWARENESS', 'SELF_AWARENESS', 'Emotional intelligence importance',
  'Why emotional intelligence shapes relationships, wellbeing, and effectiveness.',
  'GENERAL', 'All', 'audio',
  'https://lumi6eq.s3.us-west-1.amazonaws.com/applearningfiles/Emotional_Intelligence_Importance.m4a',
  now(), now(), 'en', 1
),
(
  'lceqfnd02vid0002en',
  'EQ', 'B2C', 'SELF_AWARENESS', 'SELF_AWARENESS', 'Emotional intelligence importance',
  'Why emotional intelligence shapes relationships, wellbeing, and effectiveness.',
  'GENERAL', 'All', 'video',
  'https://lumi6eq.s3.us-west-1.amazonaws.com/applearningfiles/Emotional_Intelligence_Importance.mp4',
  now(), now(), 'en', 1
),
(
  'lceqb2c08audbounce1',
  'EQ', 'B2C', 'RESILIENCE', 'RESILIENCE', 'The Bounce Back Muscle',
  'Learn how to recover from setbacks, manage stress, and sustain performance under pressure.',
  'GENERAL', 'All', 'audio',
  'https://lumi6eq.s3.us-west-1.amazonaws.com/applearningfiles/Resilience+The+Bounce+Back+Muscle.m4a',
  now(), now(), 'en', 60
),
(
  'lceqb2c08vidbounce1',
  'EQ', 'B2C', 'RESILIENCE', 'RESILIENCE', 'The Bounce Back Muscle',
  'Learn how to recover from setbacks, manage stress, and sustain performance under pressure.',
  'GENERAL', 'All', 'video',
  'https://lumi6eq.s3.us-west-1.amazonaws.com/applearningfiles/Resilience+The+Bounce+Back+Muscle.mp4',
  now(), now(), 'en', 60
)
ON CONFLICT (id) DO NOTHING;
