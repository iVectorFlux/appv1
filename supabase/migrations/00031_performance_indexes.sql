-- Performance indexes for multi-user / multi-device scale
CREATE INDEX IF NOT EXISTS idx_learning_content_lang_for_sort
  ON public.learning_content (language, content_for, sort_order, episode_title);

CREATE INDEX IF NOT EXISTS idx_eq_scores_user_completed_desc
  ON public.eq_scores (user_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_content_progress_user_accessed
  ON public.learning_content_progress (user_id, last_accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_company_role
  ON public.profiles (company_id, role);
