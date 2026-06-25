# Google ADK integration — Lumi6 EQ platform

## What Google is asking for (vs what you have today)

| Today (wrapper) | Google ADK (agentic) |
|-----------------|----------------------|
| `fetch(gemini.../generateContent)` with a long system prompt | `LlmAgent` + `FunctionTool` — model **chooses** tools in a loop |
| `SUGGESTION_JSON` parsed from free text | Tool returns structured JSON; ADK handles tool rounds |
| Groq/Gemini called directly from Vercel handlers | Agent runtime on **Cloud Run** (`adk deploy cloud_run`) |
| One-shot completion | Multi-step: reason → tool → observe → reply |

Your `api/_lib/llm-service.ts` and `api/chat.ts` are **wrappers**. Google’s task is to expose a **first-class ADK agent** that Lumi6 calls as a service.

## Target architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Lumi6 app (Expo)                                           │
│  Companion · Skill Lab · Learn                              │
└───────────────────────────┬─────────────────────────────────┘
                            │ POST /api/agent (session + message)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Vercel — thin proxy only (auth, CORS, user context)        │
│  api/agent.ts  →  forwards to Cloud Run ADK API             │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Cloud Run — ADK agent service (agents/lumi6)               │
│  rootAgent (Gemini via ADK)                                 │
│    ├── inner_ally tools (grounding, reframe, emotions)      │
│    ├── coach tools (skill routing, micro-lessons)           │
│    └── eq_context tools (profile, assessments — Supabase)   │
└───────────────────────────┬─────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
     Gemini API / Vertex AI          Supabase (user data)
```

**Vercel stays a proxy** — not an LLM wrapper. All agent logic lives in `agents/lumi6/`.

## Agent design (deliverable for Google)

### Root agent

- **Name:** `lumi6_eq_agent`
- **Model:** `gemini-2.5-flash` (or Vertex `gemini-2.5-flash` in production)
- **Modes:** `inner_ally` | `coach` (passed in session state from the app)

### Tools (FunctionTool — not prompt hacks)

| Tool | Purpose |
|------|---------|
| `record_emotional_state` | Structured emotions + life contexts |
| `recommend_grounding` | Returns one grounding technique ID the app can open |
| `recommend_learning_path` | Returns Skill Lab `skillId` + label |
| `propose_reframe` | One-sentence cognitive reframe (stored separately from reply) |
| `fetch_eq_context` | Pulls user EQ/Big5 summary from Supabase (server-side) |

The model **decides when** to call tools; the app **executes** navigation (grounding screen, skill lab) from tool results in the API response.

### Sub-agents (phase 2)

Split into `inner_ally_agent` and `coach_agent` with ADK workflow/orchestration when the single agent grows too large.

## Repo layout

```
agents/
  lumi6/                    # Companion: Inner Ally + Coach
    agent.ts
    tools/eq-tools.ts

api/agent.ts                # Proxy → lumi6-eq-agent (Cloud Run)
```

## Environment variables

### Cloud Run (agent service)

```bash
GEMINI_API_KEY=...                    # Google AI Studio (dev)
# Production:
GOOGLE_GENAI_USE_VERTEXAI=TRUE
GOOGLE_CLOUD_PROJECT=your-gcp-project
GOOGLE_CLOUD_LOCATION=us-central1

SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...         # for fetch_eq_context tool only
```

### Vercel (proxy)

```bash
LUMI6_AGENT_SERVICE_URL=https://lumi6-eq-agent-xxxxx.run.app
```

## Deploy to Cloud Run (Google deliverable)

```bash
cd agents/lumi6
npm install
gcloud auth login
export GOOGLE_CLOUD_PROJECT=your-project
export GOOGLE_CLOUD_LOCATION=us-central1

npx adk deploy cloud_run \
  --project=$GOOGLE_CLOUD_PROJECT \
  --region=$GOOGLE_CLOUD_LOCATION \
  --service_name=lumi6-eq-agent \
  --with_ui \
  .
```

Reviewers can open the ADK dev UI on the deployed service to test tools interactively.

## Local dev

```bash
cd agents/lumi6
cp .env.example .env   # add GEMINI_API_KEY
npm install
npx adk web            # http://localhost:8000
```

## Migration path (keep app shipping)

1. **Ship ADK agent** on Cloud Run with tools + ADK UI demo (Google milestone 1).
2. **Add `api/agent.ts` proxy**; feature-flag Companion to call `/api/agent` instead of `/api/chat`.
3. **Retire wrapper** in `api/chat.ts` once parity is verified.

## What to show Google

- ADK `rootAgent` source with `FunctionTool` definitions
- Cloud Run URL + `adk deploy` command used
- Screen recording: user distress → agent calls `recommend_grounding` → app opens grounding flow
- No raw `generateContent` in the product path (only inside ADK runtime)
