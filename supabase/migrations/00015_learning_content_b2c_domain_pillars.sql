-- Align B2C learning_content rows with six EQ pillar domains (matches app Learn filters / Skill Lab).
-- Idempotent: safe if rows already use pillar names.

UPDATE public.learning_content
SET domain = 'SELF_AWARENESS', competency = 'SELF_AWARENESS', updated_at = now()
WHERE eq_type = 'B2C' AND episode_title = 'Name it to tame it';

UPDATE public.learning_content
SET domain = 'SELF_REGULATION', competency = 'SELF_REGULATION', updated_at = now()
WHERE eq_type = 'B2C' AND episode_title = 'The pause button';

UPDATE public.learning_content
SET domain = 'EMPATHY', competency = 'EMPATHY', updated_at = now()
WHERE eq_type = 'B2C' AND episode_title = 'In their shoes';

UPDATE public.learning_content
SET domain = 'SOCIAL_SKILLS', competency = 'SOCIAL_SKILLS', updated_at = now()
WHERE eq_type = 'B2C' AND episode_title = 'Words that land';

UPDATE public.learning_content
SET domain = 'MOTIVATION', competency = 'MOTIVATION', updated_at = now()
WHERE eq_type = 'B2C' AND episode_title = 'Why before willpower';

UPDATE public.learning_content
SET domain = 'RESILIENCE', competency = 'RESILIENCE', updated_at = now()
WHERE eq_type = 'B2C' AND episode_title = 'The Bounce Back Muscle';

UPDATE public.learning_content
SET
  domain = 'SELF_AWARENESS',
  competency = 'SELF_AWARENESS',
  sort_order = 1,
  updated_at = now()
WHERE eq_type = 'B2C' AND episode_title = 'Emotional intelligence importance';
