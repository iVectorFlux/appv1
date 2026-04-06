-- Remove the "What is EQ?" video row — it was causing persistent S3 URL issues.
-- The "Emotional intelligence importance" episode (audio + video) remains as the intro content.
DELETE FROM public.learning_content
WHERE episode_title = 'What is EQ?';
