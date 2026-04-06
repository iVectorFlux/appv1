-- Remove the "What is EQ?" episode entirely (all content types); it caused repeated media issues.
-- First lesson in the catalog is "Emotional intelligence importance" (audio + video).
DELETE FROM public.learning_content
WHERE episode_title = 'What is EQ?';
