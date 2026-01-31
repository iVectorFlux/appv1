# Deploying to Vercel

This app is set up to deploy on Vercel for both the **frontend** (Expo web) and **serverless API** routes. It is designed to handle **multiple concurrent users** without a single-server bottleneck.

## Architecture (concurrent users)

| Layer | Where it runs | Concurrency |
|-------|----------------|-------------|
| **Frontend** | Vercel Edge / static | Served from CDN; scales with traffic. |
| **API routes** | Vercel serverless functions | Stateless; each request can run in a new instance. Auto-scales. |
| **Auth & data** | Supabase | Managed PostgreSQL + Auth; built for multi-tenant, concurrent usage. |

There is no long-lived app server. Each user gets the same static frontend; auth and data go to Supabase; any custom API (e.g. `/api/health`) runs as short-lived serverless invocations. This design supports many concurrent users.

## Prerequisites

- Vercel account ([vercel.com](https://vercel.com))
- Supabase project with URL and **anon** key
- Git repo connected to Vercel (recommended)

## Environment variables (required)

Configure these in the Vercel project (**Settings → Environment Variables**). Use the same names so the Expo config can read them at build time.

| Variable | Description | Example |
|----------|-------------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxxxx.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_KEY` | Supabase **anon** (public) key | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` |

- Add them for **Production** (and optionally Preview/Development).
- **Do not** commit real values to the repo; use Vercel’s env UI or CLI.

## Deploy steps

1. **Connect the repo**  
   In Vercel: New Project → Import Git repository → select this repo.

2. **Set env vars**  
   In project **Settings → Environment Variables**, add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY` as above.

3. **Build settings** (usually auto-detected from `vercel.json`)  
   - **Build Command:** `npx expo export --platform web`  
   - **Output Directory:** `dist`  
   - **Framework Preset:** Other (or leave default)

4. **Deploy**  
   Push to the connected branch or trigger a deploy from the Vercel dashboard.

After deploy:

- **Frontend:** `https://<your-project>.vercel.app` (SPA; all non-API routes fall back to `index.html`).
- **Health check:** `https://<your-project>.vercel.app/api/health` (returns JSON; use for uptime checks).

## Optional: CLI deploy

```bash
npm i -g vercel
vercel
# Follow prompts; add env vars when asked or in the dashboard.
```

## Concurrency notes

- **Vercel:** Serverless functions and static assets scale with demand; no fixed “server” to saturate.
- **Supabase:** Handles many concurrent connections; use connection pooling (e.g. Supabase Pooler) if you add server-side DB access later.
- **Expo web:** Client-only; each user’s browser talks to Supabase and your API independently. No shared in-memory state on the server.

For high traffic, ensure Supabase plan and limits (connections, auth, storage) match your expected concurrency; the Vercel side will scale with traffic.
