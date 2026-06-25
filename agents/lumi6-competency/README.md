# Lumi6 Competency Sprint Agent (ADK + Upstash Vector)

Dedicated Google ADK agent for **Difficult Conversations** competency sprint — separate from the Companion agent in `agents/lumi6/`.

## Why a second agent?

ADK deploys one `rootAgent` per directory. Competency Sprint has its own multi-step workflow and **Upstash Vector** memory — ideal for the Google demo.

## Tools

| Tool | Purpose |
|------|---------|
| `search_competency_playbook` | RAG over micro-skills + drills (Upstash Vector) |
| `store_competency_insight` | Save session debrief / user attempts |
| `recommend_micro_skill` | Pick skill + drill for the app |
| `score_sprint_attempt` | Structured telemetry scores |

## Setup

```bash
cd agents/lumi6-competency
cp .env.example .env
# Add GEMINI_API_KEY + Upstash Vector URL/token from console.upstash.com
npm install
npm run seed          # loads playbook into vector index
npx adk web           # http://localhost:8000
```

## Deploy to Cloud Run

```bash
export GOOGLE_CLOUD_PROJECT=your-project
export GOOGLE_CLOUD_LOCATION=us-central1
npx adk deploy cloud_run \
  --service_name=lumi6-competency-agent \
  --with_ui .
```

Set on Vercel: `LUMI6_COMPETENCY_AGENT_URL=https://lumi6-competency-agent-xxx.run.app`

## Wire into the app

Competency Sprint (`app/competency-sprint.tsx`) can call `/api/competency-agent` instead of `/api/competency-sprint` when the Cloud Run URL is configured.
