# Where is user / profile / onboarding data?

- **User account** (email, sign-in) → **Supabase Auth** (`auth.users`). See **Authentication → Users** in the dashboard.
- **Profile** (timezone, locale, display name, last login) → **`public.profiles`** (one row per user, created on signup). **`user_sessions`** stores session start/end for time-in-app audit.
- **Onboarding** → **`user_onboarding`**, **`user_preferences`** (includes **goals** JSONB and **context** JSONB), **`onboarding_emotional_check`**.

---

## How to run the migration (one script)

1. **In Cursor:** Open **`supabase/migrations/00001_initial_schema.sql`**, select all (Cmd+A / Ctrl+A), copy (Cmd+C / Ctrl+C).
2. **In browser:** [supabase.com](https://supabase.com) → your project → **SQL Editor** → **New query** → paste → **Run**.
3. Check **Table Editor** in the left sidebar — you should see all tables.

The script is re-runnable (uses `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS`, `DROP TRIGGER IF EXISTS`). If you already ran **00001** before `last_login_at` and `user_sessions` were added, run **`00002_profiles_last_login_and_user_sessions.sql`**; then run **`00003_consolidate_onboarding_into_user_preferences.sql`** to move goals/context into `user_preferences` (JSONB) and drop `user_goals` / `user_background`.

---

## Tables created (after 00001 → 00004)

**Note:** Migration 00003 drops `user_goals` and `user_background`; goals and context live in `user_preferences.goals` and `user_preferences.context`.

| Layer | Tables | Used in app? |
|-------|--------|----------------|
| **Identity / audit** | `profiles` (includes `last_login_at`), `user_sessions` (time-on-app) | Yes |
| **Onboarding** | `user_onboarding`, `user_preferences` (goals + context as JSONB), `onboarding_emotional_check` | Yes |
| **Journal** | `journal_entries` | Yes (web + native via journal-storage / database) |
| **Journal (reserved)** | `encryption_keys`, `journal_tags`, `journal_entry_tags` | No — reserved for future |
| **EQ** | `eq_assessment_sessions`, `eq_check_ins`, `eq_scores` | No — reserved for future |
| **Insights** | `insights`, `insight_actions` | No — reserved for future |
| **Wellness** | `recovery_sessions`, `meditation_sessions` | No — reserved for future |
| **Learning** | `learning_modules` (FK target), `learning_progress` | learning_progress: Yes; learning_modules: FK only |
| **Metrics** | `user_metrics` | No — reserved for future |

See **docs/SCHEMA_REVIEW.md** for a full used-vs-unused review.
