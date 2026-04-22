-- User profile context for personalized Skill Lab scenarios and UI.
-- Applied in app: profile screen + onboarding; mapped to practiceContext in /api/skills-coach

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_interests text,
  ADD COLUMN IF NOT EXISTS life_situation text,
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS professional_role text,
  ADD COLUMN IF NOT EXISTS org_context text;

COMMENT ON COLUMN public.profiles.profile_interests IS 'Free-text interests, hobbies, focus areas (Skill Lab + coaching context).';
COMMENT ON COLUMN public.profiles.life_situation IS 'e.g. student, entrepreneur, employed, between_roles, other';
COMMENT ON COLUMN public.profiles.industry IS 'Work domain or field.';
COMMENT ON COLUMN public.profiles.professional_role IS 'Job title or role.';
COMMENT ON COLUMN public.profiles.org_context IS 'Optional: team size, org type, or work setting.';
