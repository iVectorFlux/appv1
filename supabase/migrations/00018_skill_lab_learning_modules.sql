-- Skill Lab ↔ learning_progress FK: one placeholder row per top-level Skill Lab skill.
-- learning_progress.module_id references learning_modules(id). These rows are is_active = false
-- so they do not appear in legacy module UIs; they exist only to allow progress sync from the app.

INSERT INTO public.learning_modules (
  id,
  dimension,
  title,
  subtitle,
  description,
  audio_url,
  video_url,
  order_index,
  is_active
) VALUES
  ('emotional_intelligence', 'skill_lab', 'Skill Lab: Emotional Intelligence', 'AI practice', 'Complete exercises in Skill Lab. This row links progress only.', '', '', 9901, false),
  ('ai_literacy', 'skill_lab', 'Skill Lab: AI Literacy', 'AI practice', 'Complete exercises in Skill Lab. This row links progress only.', '', '', 9902, false),
  ('critical_thinking', 'skill_lab', 'Skill Lab: Critical Thinking', 'AI practice', 'Complete exercises in Skill Lab. This row links progress only.', '', '', 9903, false),
  ('problem_solving', 'skill_lab', 'Skill Lab: Problem Solving', 'AI practice', 'Complete exercises in Skill Lab. This row links progress only.', '', '', 9904, false),
  ('adaptability', 'skill_lab', 'Skill Lab: Adaptability', 'AI practice', 'Complete exercises in Skill Lab. This row links progress only.', '', '', 9905, false),
  ('creative_thinking', 'skill_lab', 'Skill Lab: Creative Thinking', 'AI practice', 'Complete exercises in Skill Lab. This row links progress only.', '', '', 9906, false),
  ('systems_thinking', 'skill_lab', 'Skill Lab: Systems Thinking', 'AI practice', 'Complete exercises in Skill Lab. This row links progress only.', '', '', 9907, false),
  ('communication_influence', 'skill_lab', 'Skill Lab: Communication & Influence', 'AI practice', 'Complete exercises in Skill Lab. This row links progress only.', '', '', 9908, false)
ON CONFLICT (id) DO UPDATE SET
  dimension = EXCLUDED.dimension,
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  description = EXCLUDED.description,
  is_active = false,
  updated_at = now();
