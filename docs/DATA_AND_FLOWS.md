# EQ App — Tables, Sign Up/Sign In, Onboarding, Scores & Journal

This doc answers: **what tables exist**, **how sign up/sign in works**, **what onboarding asks**, **where EQ scores are stored**, and **where journal history is stored**.

---

## 1. All tables (Supabase / platform)

These tables are defined in **`supabase/migrations/00001_initial_schema.sql`**. Run that migration in Supabase so they exist in your project.

| Table | Purpose |
|-------|--------|
| **profiles** | Extends `auth.users`. App-specific user data (timezone, locale, is_demo_mode). Auto-created on signup via trigger. |
| **user_onboarding** | Onboarding progress: started_at, completed_at, steps_completed (JSONB), onboarding_version. |
| **user_goals** | Goal(s) selected in onboarding (e.g. manage_stress, improve_relationships). |
| **user_background** | Optional: age_range, context, occupation_category. |
| **user_preferences** | check_in_frequency, reminder_enabled, reminder_times, reminder_days (JSONB). |
| **onboarding_emotional_check** | One row per onboarding emotional question answered (question_id, value_scale / value_emotion / value_emotions). |
| **journal_entries** | Reflect check-ins + standalone journal. Metadata (pleasantness, energy_level, emotions, reasons) + encrypted body (journal_text_encrypted BYTEA). |
| **encryption_keys** | Metadata for journal encryption keys (key_hash, is_active, etc.). Actual keys stay on device. |
| **journal_tags** | User-defined tags for entries. |
| **journal_entry_tags** | Links journal_entries ↔ journal_tags (many-to-many). |
| **eq_assessment_sessions** | One row per EQ test/check-in attempt (status, assessment_type, started_at, completed_at, overall_score, dimension_scores). |
| **eq_check_ins** | One row per question answered (session_id, question_id, response JSONB, score, order_index). |
| **eq_scores** | One row per **completed** assessment: overall_score, dimension_scores, quality_indicators, strengths, growth_areas, insights (JSONB). |
| **insights** | Generated insights (type, category, title, description, etc.). |
| **insight_actions** | User actions on insights (e.g. helpful, dismiss). |
| **recovery_sessions** | Breathing, grounding, release, meditation sessions. |
| **meditation_sessions** | Guided meditation progress (audio_id, duration, rating, etc.). |
| **learning_modules** | Global content (dimension, title, audio_url, video_url, etc.). No user_id. |
| **learning_progress** | Per-user progress on learning modules (audio_completed, video_completed, progress %, etc.). |
| **user_metrics** | Optional daily aggregates (journal count, eq count, avg_pleasantness, etc.) per user per date. |

**Auth:** Users live in **Supabase Auth** (`auth.users`). The app does **not** create a custom `users` table; it uses `auth.uid()` and `public.profiles`.

---

## 2. Sign up / sign in (how it works)

- **Sign up:** User enters **email + password** on the Sign Up screen → app calls `supabase.auth.signUp({ email, password })`. Supabase creates a row in **`auth.users`** and sends a confirmation email if you have email confirmation enabled. The trigger **`on_auth_user_created`** then inserts one row into **`public.profiles`** (same `id` as `auth.users.id`).
- **Sign in:** User enters **email + password** on the Login screen → app calls `supabase.auth.signInWithPassword({ email, password })`. Supabase returns a session (JWT). The app stores the session (via Supabase client) and maps `auth.users` to the app’s `User` type (id, email, username from email prefix).
- **Logout:** `supabase.auth.signOut()`. Session is cleared; only Supabase-authenticated users are supported.

So: **identity** is in **Supabase Auth**; **app profile** is in **`public.profiles`** (one row per user, created on signup).

---

## 3. Onboarding options — are they saved on the platform?

**Schema:** Yes. The platform has tables for every onboarding choice:

- **user_onboarding** — Whether onboarding was started/completed and which steps were done (`steps_completed` JSONB).
- **user_goals** — Selected goal(s) from the “goal” step (e.g. `manage_stress`, `improve_relationships`).
- **user_background** — Optional age_range, context, occupation_category from the “background” step.
- **user_preferences** — check_in_frequency and reminder settings from the “frequency” step.
- **onboarding_emotional_check** — One row per emotional baseline question answered.

**App today:** The app **does** have a 5-screen onboarding flow that writes to Supabase. After sign-up/sign-in, users are directed to onboarding; on completion the app calls:

- `supabase.from('user_onboarding').upsert(...)` (completed_at, steps_completed)
- `supabase.from('user_goals').insert(...)` for each selected goal
- `supabase.from('user_background').upsert(...)` (age_range, context, etc.)
- `supabase.from('user_preferences').upsert(...)` (check_in_frequency, etc.)
- `supabase.from('onboarding_emotional_check').insert(...)` for emotional baseline answers
- `profiles.display_name` is updated when provided in onboarding.


---

## 4. What questions does onboarding ask?

Defined in **`app/onboarding/index.tsx`** (WHY_OPTIONS, FREQUENCY_OPTIONS, CONTEXT_OPTIONS, emotional check). Five screens:

### Step 1 — Goal (one or more)

- **user_goals** options:  
  `manage_stress` · `improve_relationships` · `build_self_awareness` · `improve_focus` · `emotional_regulation` · `other` (with optional custom_text).

### Step 2 — Background (optional)

- **user_background**:  
  - Age range: 18–24, 25–34, 35–44, 45–54, 55+, Prefer not to say.  
  - Occupation: student, employed, self_employed, caregiver, other.  
  - Optional free-text context.

### Step 3 — Frequency

- **user_preferences.check_in_frequency**:  
  Daily · A few times a week · About once a week · When I get a reminder · No reminders.  
- Plus reminder_enabled, reminder_times (e.g. 09:00, 21:00), reminder_days (0–6).

### Step 4 — Emotional check (baseline)

- **onboarding_emotional_check** — 5 questions, one row per answer:

| # | question_id | Question | Type | Stored as |
|---|-------------|----------|------|-----------|
| 1 | how_often_notice_emotions | How often do you notice your emotions in daily life? | scale 1–5 | value_scale |
| 2 | current_mood | Right now, how would you rate your overall mood? | scale 1–5 | value_scale |
| 3 | stress_level | How would you rate your stress level lately? | scale 1–5 | value_scale |
| 4 | emotional_clarity | When emotions come up, how clear are you about what you're feeling? | scale 1–5 | value_scale |
| 5 | primary_emotion_lately | Which word best describes how you've been feeling lately? | single emotion | value_emotion (e.g. Calm, Anxious, Happy, Stressed, Tired, Content, Overwhelmed, Peaceful, Neutral, Sad, Grateful, Frustrated) |

So: **goals** → `user_goals`, **background** → `user_background`, **frequency** → `user_preferences`, **emotional baseline** → `onboarding_emotional_check`. All of these are “the options that will be selected during onboarding” and **are** the ones to be saved in the platform once the app writes to Supabase.

---

## 5. When do we store the EQ test score? Where?

- **When:** When the user **finishes** an EQ assessment (status becomes `completed`).  
  - Create or update **eq_assessment_sessions**: set `status = 'completed'`, `completed_at`, `duration_ms`, `overall_score`, `dimension_scores`.  
  - Insert one row into **eq_scores** for that session.

- **Where (tables):**
  - **eq_assessment_sessions** — One row per test/check-in: `id`, `user_id`, `status`, `assessment_type`, `started_at`, `completed_at`, `overall_score`, `dimension_scores`, etc.
  - **eq_check_ins** — One row per question: `session_id`, `question_id`, `response` (JSONB), `score`, `order_index`.
  - **eq_scores** — One row per completed assessment: `session_id` (unique), `user_id`, `completed_at`, `overall_score`, `dimension_scores`, `quality_indicators`, `strengths`, `growth_areas`, `insights` (all JSONB).

So the **score** is stored in **eq_scores** (and duplicated on the session row in **eq_assessment_sessions** for convenience). The app currently uses **SQLite** on native for EQ (see `src/services/database.ts`); to store scores on the platform you’d add Supabase calls when completing an assessment (update `eq_assessment_sessions`, insert `eq_scores`, and insert `eq_check_ins` for each answer).

---

## 6. Where do we store journal history?

- **Platform (Supabase):** Table **journal_entries**.
  - Each row = one Reflect check-in or one standalone journal entry.
  - Stored: **user_id**, **entry_source** (`reflect` | `journal_only`), **pleasantness**, **energy_level**, **emotions** (JSONB), **reasons** (JSONB), **journal_text_encrypted** (BYTEA), **encryption_key_id**, **encryption_iv**, **created_at**, **updated_at**, and optional **word_count**, **is_archived**, **is_deleted**, **deleted_at**.
  - Journal **history** = list of a user’s rows from **journal_entries** (e.g. `WHERE user_id = auth.uid() AND is_deleted = FALSE ORDER BY created_at DESC`).

- **App today:** On **native**, the app uses **SQLite** (`src/services/database.ts`) for journal; it does **not** yet write or read journal from Supabase. On **web**, there is no SQLite, so journal is not persisted unless you add Supabase (or another backend) for **journal_entries**.

So: **journal history is intended to live in `journal_entries`** on the platform; the app still needs to be wired to Supabase for insert/update/delete and for loading history.

---

## 7. Summary: what’s in the platform vs what the app does today

| Data | Tables (platform) | App writes to platform? |
|------|--------------------|--------------------------|
| Identity / auth | `auth.users`, `public.profiles` | Yes (Supabase Auth + trigger for profiles). |
| Onboarding choices | user_onboarding, user_goals, user_background, user_preferences, onboarding_emotional_check | Yes (onboarding flow writes to Supabase). |
| Journal history | journal_entries, encryption_keys, journal_tags, journal_entry_tags | No (native uses SQLite; web has no persistence yet). |
| EQ scores | eq_assessment_sessions, eq_check_ins, eq_scores | No (native uses SQLite for EQ). |
| Insights | insights, insight_actions | No. |
| Recovery / meditation | recovery_sessions, meditation_sessions | No (native uses SQLite). |
| Learning progress | learning_modules, learning_progress | No. |

So: **all tables are available** in the schema. The app currently uses **Auth (sign up / sign in), profiles, and onboarding** (writes to Supabase). To have EQ scores and journal history saved on the platform, add app code that calls Supabase (e.g. `supabase.from('journal_entries').insert(...)`, `supabase.from('eq_scores').insert(...)`).
