-- Align intro row with B2C pillar domain naming (SELF_AWARENESS).
UPDATE public.learning_content
SET domain = 'SELF_AWARENESS',
    competency = 'SELF_AWARENESS',
    sort_order = 1,
    updated_at = now()
WHERE eq_type = 'B2C'
  AND episode_title = 'Emotional intelligence importance';
