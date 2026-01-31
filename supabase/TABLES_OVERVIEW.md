# Where is user / profile / onboarding data?

- **User account** (email, sign-in) → **Supabase Auth** (`auth.users`). See **Authentication → Users** in the dashboard.
- **Profile** (timezone, locale, display name, last login) → **`public.profiles`** (one row per user, created on signup). **`user_sessions`** stores session start/end for time-in-app audit.
- **Onboarding** → **`user_onboarding`**, **`user_goals`**, **`user_preferences`**, **`user_background`**, **`onboarding_emotional_check`**.

---

## How to run the migration (one script)

1. **In Cursor:** Open **`supabase/migrations/00001_initial_schema.sql`**, select all (Cmd+A / Ctrl+A), copy (Cmd+C / Ctrl+C).
2. **In browser:** [supabase.com](https://supabase.com) → your project → **SQL Editor** → **New query** → paste → **Run**.
3. Check **Table Editor** in the left sidebar — you should see all tables.

The script is re-runnable (uses `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS`, `DROP TRIGGER IF EXISTS`). If you already ran **00001** before `last_login_at` and `user_sessions` were added, run **`supabase/migrations/00002_profiles_last_login_and_user_sessions.sql`** in the SQL Editor as well.

---

## Tables created

| Layer | Tables |
|-------|--------|
| **Identity / audit** | `profiles` (includes `last_login_at`), `user_sessions` (time-on-app) |
| **Onboarding** | `user_onboarding`, `user_goals`, `user_background`, `user_preferences`, `onboarding_emotional_check` |
| **Journal** | `journal_entries`, `encryption_keys`, `journal_tags`, `journal_entry_tags` |
| **EQ** | `eq_assessment_sessions`, `eq_check_ins`, `eq_scores` |
| **Insights** | `insights`, `insight_actions` |
| **Wellness** | `recovery_sessions`, `meditation_sessions` |
| **Learning** | `learning_modules`, `learning_progress` |
| **Metrics** | `user_metrics` |
