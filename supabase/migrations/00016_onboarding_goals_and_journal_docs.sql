-- Clarify how onboarding goals and Inner Ally data relate to existing tables (no schema change).

COMMENT ON COLUMN public.user_preferences.goals IS
'JSONB array of goal ids: new onboarding uses a single primary id per user, e.g. "feel_better", "build_skills", "manage_stress", "ai_growth", "explore"; legacy installs may still have older multi-select ids.';

COMMENT ON TABLE public.onboarding_emotional_check IS
'Rows created during the in-app onboarding flow only (first emotion). Not written from Inner Ally or Assist chat.';

COMMENT ON TABLE public.eq_check_ins IS
'Answers tied to eq_assessment_sessions (EQ check-in / full test). Chat does not write here; Inner Ally emotional snapshots use journal_entries with entry_source = inner_ally.';

COMMENT ON COLUMN public.journal_entries.reasons IS
'Optional life-area tags (same labels as Reflect), including values inferred by Inner Ally and stored via auto-journal from chat.';
