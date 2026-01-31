# Test Sign Up & Sign In — Links & Database Connection

## 0. If you see "This site can't be reached" or "ERR_CONNECTION_REFUSED"

The dev server is not running. Start it first:

```bash
cd /Users/Lumi6/eqappv1
npm start
```

When you see **"Web is waiting on http://localhost:8081"**, press **w** to open the browser, or open that URL yourself. Keep this terminal open; closing it stops the server.

## 1. Links to test (local)

With the app running (`npm start` then press **w** for web, or open in browser):

| Flow | URL |
|------|-----|
| **Root** (redirects to login or home) | http://localhost:8081 |
| **Sign in (login)** | http://localhost:8081/login |
| **Sign up** | http://localhost:8081/sign-up |

**How to run the app:**
```bash
cd /Users/Lumi6/eqappv1
npm start
```
Then press **w** to open web, or open **http://localhost:8081** in your browser.

---

## 2. Is the database connected?

### Supabase Auth (sign up / sign in) — **Yes, connected**

- Your `.env` has `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY` (anon key).
- The app uses the Supabase client in `src/lib/supabase.ts` and the auth store calls `supabase.auth.signUp()` and `supabase.auth.signInWithPassword()`.
- So **Auth is connected**: sign up and sign in hit your Supabase project. New users are stored in **Supabase Auth** (`auth.users`).

### Supabase PostgreSQL (tables: profiles, journal, etc.) — **Depends on migration**

- **Auth** works even if you never run the SQL migration: users go to `auth.users`.
- **App tables** (e.g. `public.profiles`, `journal_entries`, `eq_scores`) exist only if you ran the migration.
- If you **have run** `supabase/migrations/00001_initial_schema.sql` in the Supabase SQL Editor (or `supabase db push`):
  - **Database is connected** in the sense that the schema exists.
  - On each sign up, the trigger creates a row in **`public.profiles`**.
- If you **have not run** the migration:
  - Auth still works (sign up/sign in).
  - No `profiles` row is created on sign up (trigger is missing), and other tables don’t exist yet.

**How to run the migration (one-time):**
1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Go to **SQL Editor**.
3. Paste the contents of **`supabase/migrations/00001_initial_schema.sql`**.
4. Click **Run**.

After that, new sign-ups will get a row in `public.profiles` automatically.

---

## 3. Quick test flow

1. Open **http://localhost:8081/sign-up**.
2. Enter an **email** and **password** (min 6 chars).
3. Click **Sign Up**.
4. If successful, you’re redirected to onboarding, then Home.
5. Sign out (Profile → Sign out if you have it, or clear session).
6. Open **http://localhost:8081/login**, sign in with the same email/password.

Only real Supabase-authenticated users can sign in; there is no demo account.

---

## 4. Verify in Supabase

After signing up with a real email:

1. **Supabase Dashboard** → **Authentication** → **Users** — you should see the new user.
2. **Supabase Dashboard** → **Table Editor** → **profiles** — you should see a row for that user **if** you ran the migration (trigger creates it on sign up).

If the migration was not run, you’ll see the user in Auth but not in `profiles`.
