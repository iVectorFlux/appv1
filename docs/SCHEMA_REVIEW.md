# Schema & codebase review — what’s used vs unused

Reserved/unused schema (EQ, insights, recovery, etc.) is **for future use**; this doc is for clarity and cleanup only.

This reflects a full pass over the database schema (Supabase + SQLite) and app code: **what is actually used** vs **reserved or removed**.

---

## 1. Supabase (PostgreSQL) — usage

### Used in app (read/write)

| Table | Used by |
|-------|--------|
| `profiles` | auth-store (last_login_at, display_name), profile screen, onboarding (display_name) |
| `user_onboarding` | auth-store (hasCompletedOnboarding, upsert on complete) |
| `user_preferences` | onboarding (goals, context, check_in_frequency, etc.) |
| `onboarding_emotional_check` | onboarding (emotional baseline answers) |
| `journal_entries` | journal-storage (create/get/update/delete on web) |
| `user_sessions` | auth-store (session start/end for time-on-app) |
| `learning_progress` | learning-progress.ts (video/audio completion, last_accessed_at) |

### Used only as dependency (no direct app queries)

| Table | Role |
|-------|------|
| `learning_modules` | FK target for `learning_progress`; app uses `src/data/learning-content.ts` for content. Table can be seeded for FK; app does not SELECT from it. |

### Not used in app (reserved / legacy)

- **Dropped by migration 00003:** `user_goals`, `user_background` — data moved into `user_preferences.goals` and `user_preferences.context`. Do not reference in code.
- **Never read or written by app:**  
  `encryption_keys`, `journal_tags`, `journal_entry_tags`,  
  `eq_assessment_sessions`, `eq_check_ins`, `eq_scores`,  
  `insights`, `insight_actions`,  
  `user_metrics`,  
  `recovery_sessions`, `meditation_sessions`

These tables exist in the schema for future features (EQ sync, insights engine, tags, recovery/meditation tracking). No app code imports or calls Supabase for them.

---

## 2. SQLite (native only) — usage

### Used in app

| Table | Used by |
|-------|--------|
| `journal_entries` | journal-storage (create/get/update/delete on native) |

### Removed as unused (recommended)

The following were defined in `src/services/database.ts` but **never called** by any screen or service:

- **Tables:** `users`, `eq_check_ins`, `insights`, `recovery_sessions`, `meditation_sessions`
- **Functions:** `createEQCheckIn`, `getEQCheckIns`, `createInsight`, `getInsights`

`journal-storage` and `_layout.tsx` only use: `initializeDatabase`, `createJournalEntry`, `getJournalEntries`, `getJournalEntry`, `updateJournalEntry`, `deleteJournalEntry`.  

The `users` table was only referenced by FK from the unused tables; nothing inserts into `users`. Removing the unused tables and functions avoids dead code and broken FKs.

---

## 3. Types (`src/types/index.ts`) — usage

### Legacy / deprecated (tables dropped)

- **`UserGoal`**, **`UserBackground`** — Supabase tables were dropped in 00003; data lives in `user_preferences.goals` and `user_preferences.context`. These types are kept for reference but are deprecated; prefer `UserPreferences.goals` / `context` shapes.

### Used by app or Supabase shape

- **Journal:** `JournalEntry`, `JournalEntrySource`, `EmotionTag`, `EnergyLevel` — used by reflect, journal screens, journal-storage.
- **Auth/Profile:** `User`, `AuthState` — auth-store, profile, onboarding.
- **Onboarding:** `UserPreferences`, `UserOnboarding`, `OnboardingEmotionalCheck`, `CheckInFrequency`, `OnboardingEmotionalValueType` — onboarding and auth-store.
- **Insights (type only):** `Insight`, `InsightType`, `InsightCategory` — used by SQLite insight functions; those functions are unused, but types may be used when you add Supabase insights.
- **Recover/Meditation:** `RecoverySession`, `MeditationSession`, `RecoveryType` — only as type definitions; no Supabase or SQLite read/write in app yet.
- **Wellbeing:** `WellbeingPattern` — not referenced in code; reserved for future pattern detection.

---

## 4. Recommended removals (done in this pass)

1. **SQLite (`database.ts`):** Remove creation and use of `users`, `eq_check_ins`, `insights`, `recovery_sessions`, `meditation_sessions` and remove `createEQCheckIn`, `getEQCheckIns`, `createInsight`, `getInsights`. Keep only journal tables and journal CRUD + `initializeDatabase`.
2. **Types:** Mark `UserGoal` and `UserBackground` as `@deprecated`; keep for compatibility.
3. **Docs:** Update `supabase/README_DATABASE.md` and `supabase/TABLES_OVERVIEW.md` to list “Used in app” vs “Reserved / not yet used” and to remove `user_goals` / `user_background` from current tables (they are dropped in 00003).

---

## 5. Summary

- **Journal** is the only feature that uses both Supabase (web) and SQLite (native) for persistence; everything else that is persisted today uses Supabase only (profiles, onboarding, sessions, learning_progress).
- **EQ, insights, recovery, meditation, metrics, tags, encryption_keys** exist in Supabase schema but have no app read/write yet; SQLite had duplicate unused tables/functions — those are removed so the codebase matches what is actually used.
