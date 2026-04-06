-- Normalize intro content for DBs where domain uses enum EqDomain (no INTRO_DOMAIN value).
-- - "What is EQ?" is video-only (remove audio row if present)
-- - Keep domain/competency on values that exist in EqDomain / Competency enums (e.g. SELF_AWARENESS_DOMAIN + SELF_AWARENESS)
-- - App labels intro episodes by episode_title, not domain

DELETE FROM public.learning_content
WHERE eq_type = 'B2C'
  AND episode_title = 'What is EQ?'
  AND content_type = 'audio';

UPDATE public.learning_content
SET domain = 'SELF_AWARENESS_DOMAIN',
    competency = 'SELF_AWARENESS',
    sort_order = CASE
      WHEN episode_title = 'What is EQ?' THEN 1
      WHEN episode_title = 'Emotional intelligence importance' THEN 2
      ELSE sort_order
    END,
    updated_at = now()
WHERE eq_type = 'B2C'
  AND episode_title IN ('What is EQ?', 'Emotional intelligence importance');
