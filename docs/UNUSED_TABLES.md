# Unused Tables

This document lists database tables that exist in the schema but are **not currently used** by the app.

## Currently Unused Tables

### 1. **insights** and **insight_actions**
- **Purpose:** Store AI-generated insights derived from journal metadata (never journal text)
- **Status:** Reserved for future feature
- **Schema:** `insights` (id, user_id, type, category, title, description, priority, is_read, is_dismissed, source_data, confidence_score) and `insight_actions` (insight_id, user_id, action_type, metadata)
- **When to use:** When implementing insight generation from EQ scores, journal patterns, emotion trends, etc.

### 2. **recovery_sessions** and **meditation_sessions**
- **Purpose:** Track breathing exercises, grounding exercises, release exercises, and guided meditation sessions
- **Status:** Reserved for future feature
- **Schema:** 
  - `recovery_sessions` (id, user_id, type, started_at, completed_at, duration_ms, technique, intensity, effectiveness, release_text_encrypted)
  - `meditation_sessions` (id, user_id, audio_id, started_at, completed_at, duration_ms, progress_pct, rating, notes_encrypted)
- **When to use:** When implementing the Recovery/Meditation features in the app

### 3. **learning_modules**
- **Purpose:** Store global learning content (audio/video modules for EQ education)
- **Status:** FK target only (referenced by `learning_progress`)
- **Schema:** (id, dimension, title, subtitle, description, audio_url, video_url, audio_duration_sec, video_duration_sec, icon, color, key_takeaways, order_index, is_active)
- **Note:** `learning_progress` is used, but `learning_modules` itself is not populated/read by the app yet
- **When to use:** When implementing the Learning section with actual content

### 4. **user_metrics**
- **Purpose:** Daily aggregates for dashboards (journal count, EQ check-ins, recovery sessions, meditation sessions, avg pleasantness, avg energy level)
- **Status:** Reserved for future feature
- **Schema:** (id, user_id, date, journal_entries_count, eq_check_ins_count, recovery_sessions_count, meditation_sessions_count, avg_pleasantness, avg_energy_level, ...)
- **When to use:** When implementing analytics dashboard or trend visualization

### 5. **encryption_keys**, **journal_tags**, **journal_entry_tags**
- **Purpose:** 
  - `encryption_keys`: Store encryption keys for journal entries (currently keys are in SecureStore/AsyncStorage)
  - `journal_tags`: User-defined tags for journal entries
  - `journal_entry_tags`: Junction table linking entries to tags
- **Status:** Reserved for future feature
- **When to use:** 
  - `encryption_keys`: If migrating from device storage to cloud-stored keys
  - `journal_tags`/`journal_entry_tags`: When implementing tagging/categorization for journal entries

## Currently Used Tables

✅ **profiles** - User profile data (display_name, timezone, locale, last_login_at)  
✅ **user_sessions** - Session tracking for time-on-app audit  
✅ **user_onboarding** - Onboarding completion status  
✅ **user_preferences** - User preferences (goals, check_in_frequency, reminders)  
✅ **onboarding_emotional_check** - Baseline emotional check-in responses  
✅ **journal_entries** - Journal entries (web + native via journal-storage)  
✅ **eq_assessment_sessions** - EQ assessment sessions (check-ins and full tests)  
✅ **eq_check_ins** - Individual question responses  
✅ **eq_scores** - Final EQ scores and insights  
✅ **learning_progress** - User progress on learning modules  

## Notes

- All unused tables have RLS (Row Level Security) enabled and policies set up
- Tables are safe to leave in the schema - they don't impact performance if empty
- When implementing features that use these tables, ensure the app code matches the schema structure
