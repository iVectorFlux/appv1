-- Normalize intro content:
-- - "What is EQ?" is video-only (remove broken/missing audio row)
-- - Intro rows use INTRO_DOMAIN / INTRO

DELETE FROM public.learning_content
WHERE eq_type = 'B2C'
  AND episode_title = 'What is EQ?'
  AND content_type = 'audio';

UPDATE public.learning_content
SET domain = 'INTRO_DOMAIN',
    competency = 'INTRO',
    sort_order = CASE
      WHEN episode_title = 'What is EQ?' THEN 1
      WHEN episode_title = 'Emotional intelligence importance' THEN 2
      ELSE sort_order
    END,
    updated_at = now()
WHERE eq_type = 'B2C'
  AND episode_title IN ('What is EQ?', 'Emotional intelligence importance');
