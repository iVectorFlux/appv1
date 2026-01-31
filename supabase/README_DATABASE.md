# EQ App — Database Design (First Principles)

PostgreSQL schema for Supabase: **secure**, **scalable**, **fast**.

---

## 1. First principles

### Security
- **Auth:** All app data is scoped to `auth.uid()`. No custom users table; Supabase `auth.users` is the source of truth.
- **RLS:** Row Level Security is enabled on every table. Policies enforce `user_id = auth.uid()` (or ownership via related row). No user can read or write another user’s data.
- **Journal:** Plaintext journal content is **never** stored. Only:
  - **Encrypted body:** `journal_text_encrypted BYTEA` (client-side encryption before insert).
  - **Metadata:** `pleasantness`, `energy_level`, `emotions`, `reasons` (JSONB) for insights only.
- **Sensitive columns:** Release/meditation notes stored as `BYTEA` (encrypted). Encryption keys metadata only; actual keys stay on device (e.g. SecureStore).

### Scalability
- **IDs:** `UUID` primary keys (`gen_random_uuid()`) — no guessability, safe for distributed clients, no single-node sequence bottleneck.
- **Timestamps:** `TIMESTAMPTZ` everywhere — correct for multiple timezones and Supabase defaults.
- **JSON:** `JSONB` for all JSON — indexed, queryable, efficient storage.
- **Indexes:** B-tree on `(user_id, created_at DESC)` for “my recent X” lists; partial indexes where useful (e.g. `WHERE is_deleted = FALSE`). GIN on `emotions` for pattern queries.
- **Partitioning (future):** For very large scale, `journal_entries` and `eq_check_ins` can be range-partitioned by `created_at` (e.g. monthly). Not required for initial launch.

### Performance
- **Indexes:** Every table has at least one index on `user_id` and/or `(user_id, created_at DESC)` so list-by-user queries are index-only or index-backed.
- **Partial indexes:** e.g. `journal_entries(user_id, created_at DESC) WHERE is_deleted = FALSE` to keep index small and fast.
- **GIN on JSONB:** `journal_entries` emotions use GIN for containment/pattern queries without full scan.
- **No N+1:** Design encourages “get session + responses” or “get user’s entries” in one or two queries.
- **Covering indexes:** Where a query only needs `(user_id, created_at, id)`, the index can cover; add `INCLUDE` columns if needed later.

---

## 2. Entity overview

| Layer        | Tables |
|-------------|--------|
| **Identity** | `profiles` (extends `auth.users`) |
| **Onboarding** | `user_onboarding`, `user_goals`, `user_background`, `user_preferences`, `onboarding_emotional_check` |
| **Journal** | `journal_entries`, `encryption_keys`, `journal_tags`, `journal_entry_tags` |
| **EQ**      | `eq_assessment_sessions`, `eq_check_ins`, `eq_scores` |
| **Insights** | `insights`, `insight_actions` |
| **Wellness** | `recovery_sessions`, `meditation_sessions` |
| **Learning** | `learning_modules` (global), `learning_progress` (per user) |
| **Metrics** | `user_metrics` (optional aggregates) |

---

## 3. How to run

**One migration script:** Run **`supabase/migrations/00001_initial_schema.sql`** in the Supabase SQL Editor. It creates all tables (profiles, onboarding, journal, EQ, insights, recovery, learning, metrics), RLS, and triggers. Safe to re-run (uses `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS`, `DROP TRIGGER IF EXISTS`).

### Option A — Supabase Dashboard
1. Open your project → **SQL Editor** → **New query**.
2. In your project folder, open **`supabase/migrations/00001_initial_schema.sql`**, select all, copy, paste into the editor, then **Run**.

### Option B — Supabase CLI
```bash
supabase link --project-ref YOUR_REF
supabase db push
```
(Migrations in `supabase/migrations/` are applied in order.)

### Option C — One-off from shell
```bash
psql "$DATABASE_URL" -f supabase/migrations/00001_initial_schema.sql
```
Use the **connection string** (with password) only from a secure environment (e.g. CI or your machine), never from the client app.

---

## 4. After first run

1. **Profile on signup:** The trigger `on_auth_user_created` creates a row in `public.profiles` when a user is inserted into `auth.users`. No extra app logic required for profile creation.
2. **RLS:** All app tables are protected by RLS. Use the Supabase client with the user’s JWT so `auth.uid()` is set; then the client can only read/write its own rows.
3. **learning_modules:** Insert reference data (e.g. from `src/data/learning-content.ts`) into `learning_modules` so the Learn section has content. This table has no `user_id`; RLS allows `SELECT` for any authenticated user.

---

## 5. Migration order (dependency order)

1. `profiles` (references `auth.users`)
2. Onboarding tables (`user_onboarding`, `user_goals`, `user_background`, `user_preferences`, `onboarding_emotional_check`)
3. Journal (`journal_entries`, `encryption_keys`, `journal_tags`, `journal_entry_tags`)
4. EQ (`eq_assessment_sessions`, `eq_check_ins`, `eq_scores`)
5. Insights (`insights`, `insight_actions`)
6. Wellness (`recovery_sessions`, `meditation_sessions`)
7. Learning (`learning_modules`, then `learning_progress`)
8. Metrics (`user_metrics`)
9. RLS policies and triggers

The single migration file already follows this order.

---

## 6. Schema vs app types

- **IDs:** App uses `string`; DB uses `UUID`. Map in app: `id as string` when reading, `crypto.randomUUID()` or Supabase-generated UUID when inserting.
- **Timestamps:** DB uses `TIMESTAMPTZ` (ISO strings in JSON); app can use `number` (ms) or `Date`. Convert at the boundary.
- **JSON columns:** Map to TypeScript types (e.g. `emotions` → `EmotionTag[]`, `dimension_scores` → `DimensionScores`).
