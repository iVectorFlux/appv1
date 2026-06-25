# Lumi6 EQ Agent (Google ADK)

Native [Agent Development Kit](https://adk.dev) agent for the Lumi6 **Companion** (Inner Ally + Coach) — **not** a Gemini API wrapper.

**Sibling agent:** Competency Sprint with Upstash Vector lives in [`../lumi6-competency/`](../lumi6-competency/README.md).

## Quick start

```bash
cd agents/lumi6
cp .env.example .env
# Add GEMINI_API_KEY from https://aistudio.google.com/apikey
npm install
npx adk web
```

Open http://localhost:8000, select `lumi6_eq_agent`, and test tool calls (grounding, reframe, skill path).

## Deploy to Cloud Run (Google deliverable)

```bash
gcloud auth login
export GOOGLE_CLOUD_PROJECT=your-project-id
export GOOGLE_CLOUD_LOCATION=us-central1

npm install
npx adk deploy cloud_run \
  --project=$GOOGLE_CLOUD_PROJECT \
  --region=$GOOGLE_CLOUD_LOCATION \
  --service_name=lumi6-eq-agent \
  --with_ui \
  .
```

Set the deployed URL in Vercel as `LUMI6_AGENT_SERVICE_URL`.

## Architecture

See [docs/GOOGLE_ADK_INTEGRATION.md](../../docs/GOOGLE_ADK_INTEGRATION.md).
