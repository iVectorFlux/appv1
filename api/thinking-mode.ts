/**
 * Thinking Mode API — lazy-loaded thinking graph nodes (no pre-filled metadata).
 * POST /api/thinking-mode
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handleCorsPreflight } from './_lib/cors';
import { parseLlmJson } from './_lib/extract-json';
import { getGroqEnv } from './_lib/groq-config';
import { callSmartLlm } from './_lib/llm-service';

const MAX_DEPTH = 8;

function buildSystemPrompt(): string {
  return `You are the Thinking Graph engine for Lumi6 Thinking Mode.

Your job: generate ONE learning node at a time — never a full tree upfront.

Rules:
- Plain language. A curious 12-year-old should follow.
- BITE-SIZED ONLY: no walls of text. The UI shows one card at a time.
- "tldr" = ONE sentence hook (max 120 chars).
- "firstPrinciples" = REQUIRED 2–4 sentences building from basics (start with what we know → step → step → answer). No jargon without defining it. This is the main teaching moment.
- "explanationBullets" = 2–3 short bullets that extend firstPrinciples (max 2 sentences each).
- "explanation" = same content as bullets joined; use [concept terms] in brackets for explorable prerequisites.
- "emoji" = one fitting emoji for the topic (e.g. 🌤️ for sky, 🌱 for plants).
- Mark 0–3 prerequisite concepts in "concepts" ONLY when understanding truly depends on them.
- Offer 3–5 branches max. Each branch needs "emoji" + short "label" (sentence case, not ALL CAPS).
- Choose "representation" by content: flow for processes, cause_effect for causal chains, timeline for history, comparison for contrasts, concept_tree for hierarchies, text otherwise.
- "processSteps" = 3–5 steps as { "emoji": "1️⃣", "label": "short step" } for visual cards.
- "visualizationHint" = vivid scene to picture (e.g. "Imagine sunlight as a bundle of colored pencils…").
- "socraticQuestion" = one question before the answer is revealed.
- Stay coherent with rootQuestion and sessionPath — do not repeat nodes already on the path.
- depth >= 6: favor synthesis and challenge over endless drilling.

Return ONLY valid JSON matching this schema:
{
  "node": {
    "id": "unique_snake_case_id",
    "emoji": "string — single emoji",
    "question": "string — sentence case",
    "tldr": "string — one sentence hook",
    "firstPrinciples": "string — 2–4 sentences from first principles",
    "whyItMatters": "string optional — one short line",
    "explanationBullets": ["bullet 1", "bullet 2", "bullet 3 optional"],
    "explanation": "string — bullets combined; [bracketed] concept terms",
    "socraticQuestion": "string optional",
    "concepts": [{ "term": "string", "reason": "why explore this now" }],
    "processSteps": [{ "emoji": "string", "label": "string" }],
    "evidence": "string optional — one concrete real-world example",
    "visualizationHint": "string optional",
    "representation": "text|flow|concept_tree|timeline|comparison|cause_effect",
    "branches": [{ "type": "why|how|what|what_if|example|challenge|connect|simulate", "emoji": "string", "label": "short button label" }],
    "challengePrompt": "string optional"
  },
  "challengeFeedback": "string optional — only when action is evaluate_challenge"
}`;
}

function buildUserPrompt(body: Record<string, unknown>): string {
  const action = body.action as string;
  const rootQuestion = String(body.rootQuestion ?? '');
  const depth = typeof body.depth === 'number' ? body.depth : 0;
  const sessionPath = Array.isArray(body.sessionPath) ? body.sessionPath : [];

  const pathSummary =
    sessionPath.length > 0
      ? sessionPath.map((p: { label?: string }) => p.label).filter(Boolean).join(' → ')
      : '(start)';

  if (action === 'root') {
    return `ACTION: root
ROOT QUESTION: ${rootQuestion}
DEPTH: 0

Generate the root node: build firstPrinciples from the ground up (e.g. for "why is the sky blue": sunlight has all colors → air molecules scatter short wavelengths → blue reaches our eyes). Then branches for deeper paths.`;
  }

  if (action === 'expand_branch') {
    return `ACTION: expand_branch
ROOT QUESTION: ${rootQuestion}
PARENT NODE ID: ${body.currentNodeId ?? ''}
BRANCH TYPE: ${body.branchType ?? ''}
BRANCH LABEL: ${body.branchLabel ?? ''}
PARENT CONTEXT: ${body.parentContext ?? ''}
SESSION PATH: ${pathSummary}
DEPTH: ${depth}

Generate the child node for this branch. Answer THIS branch directly with firstPrinciples — do not restart the whole topic from scratch.`;
  }

  if (action === 'explore_concept') {
    return `ACTION: explore_concept
ROOT QUESTION: ${rootQuestion}
CONCEPT TO ZOOM INTO: ${body.conceptTerm ?? ''}
WHY WE ARE HERE: ${body.parentContext ?? ''}
SESSION PATH: ${pathSummary}
DEPTH: ${depth}

This is a temporary prerequisite detour. Explain the concept simply with a visual hint. Keep branches focused on returning understanding to the parent reasoning. Include a branch labeled "Continue" with type "connect" that summarizes how this links back.`;
  }

  if (action === 'evaluate_challenge') {
    return `ACTION: evaluate_challenge
ROOT QUESTION: ${rootQuestion}
CURRENT NODE: ${body.parentContext ?? ''}
CHALLENGE PROMPT: (from prior node)
LEARNER ANSWER: ${body.challengeAnswer ?? ''}
SESSION PATH: ${pathSummary}
DEPTH: ${depth}

Return challengeFeedback (encouraging, specific — what they got right, what to reconsider) AND a follow-up node that builds on their answer.`;
  }

  return `ACTION: root\nROOT QUESTION: ${rootQuestion}`;
}

function parseResponse(raw: unknown): { node: Record<string, unknown>; challengeFeedback?: string } {
  const obj = parseLlmJson(raw);
  if (obj.node && typeof obj.node === 'object') {
    return {
      node: obj.node as Record<string, unknown>,
      challengeFeedback: obj.challengeFeedback ? String(obj.challengeFeedback) : undefined,
    };
  }
  if (typeof obj.question === 'string' && typeof obj.explanation === 'string') {
    return {
      node: obj,
      challengeFeedback: obj.challengeFeedback ? String(obj.challengeFeedback) : undefined,
    };
  }
  throw new Error('Invalid LLM response shape — missing node');
}

function normalizeNode(raw: Record<string, unknown>, fallbackId: string): Record<string, unknown> {
  const concepts = Array.isArray(raw.concepts)
    ? raw.concepts
        .filter((c) => c && typeof c === 'object')
        .slice(0, 3)
        .map((c: Record<string, unknown>) => ({
          term: String(c.term ?? '').trim(),
          reason: String(c.reason ?? 'Explore this to continue').trim(),
        }))
        .filter((c) => c.term.length > 0)
    : [];

  const branches = Array.isArray(raw.branches)
    ? raw.branches
        .filter((b) => b && typeof b === 'object')
        .slice(0, 5)
        .map((b: Record<string, unknown>) => ({
          type: String(b.type ?? 'why').trim(),
          label: String(b.label ?? 'Explore').trim(),
          emoji: b.emoji ? String(b.emoji).trim() : undefined,
        }))
    : [{ type: 'why', label: 'Explore why', emoji: '🤔' }];

  const rep = String(raw.representation ?? 'text');
  const validReps = ['text', 'flow', 'concept_tree', 'timeline', 'comparison', 'cause_effect'];

  const explanationBullets = Array.isArray(raw.explanationBullets)
    ? raw.explanationBullets.map((s) => String(s).trim()).filter(Boolean).slice(0, 3)
    : undefined;

  const processSteps = Array.isArray(raw.processSteps)
    ? raw.processSteps
        .slice(0, 6)
        .map((s) => {
          if (s && typeof s === 'object') {
            const o = s as Record<string, unknown>;
            const label = String(o.label ?? o.step ?? '').trim();
            if (!label) return null;
            return { emoji: o.emoji ? String(o.emoji).trim() : undefined, label };
          }
          const label = String(s).trim();
          return label ? { label } : null;
        })
        .filter(Boolean)
    : undefined;

  const explanation =
    String(raw.explanation ?? '').trim() ||
    (explanationBullets?.length ? explanationBullets.join(' ') : '');

  return {
    id: String(raw.id ?? fallbackId).trim() || fallbackId,
    emoji: raw.emoji ? String(raw.emoji).trim() : undefined,
    question: String(raw.question ?? 'Thinking…').trim(),
    tldr: raw.tldr ? String(raw.tldr).trim() : undefined,
    firstPrinciples: raw.firstPrinciples ? String(raw.firstPrinciples).trim() : undefined,
    whyItMatters: raw.whyItMatters ? String(raw.whyItMatters).trim() : undefined,
    explanation,
    explanationBullets,
    socraticQuestion: raw.socraticQuestion ? String(raw.socraticQuestion).trim() : undefined,
    concepts,
    processSteps: processSteps?.length ? processSteps : undefined,
    evidence: raw.evidence ? String(raw.evidence).trim() : undefined,
    visualizationHint: raw.visualizationHint ? String(raw.visualizationHint).trim() : undefined,
    representation: validReps.includes(rep) ? rep : 'text',
    branches,
    challengePrompt: raw.challengePrompt ? String(raw.challengePrompt).trim() : undefined,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res);
  if (handleCorsPreflight(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const groqEnv = getGroqEnv();
  if (!groqEnv?.apiKey && !process.env.GEMINI_API_KEY?.trim()) {
    res.status(503).json({ error: 'LLM not configured' });
    return;
  }

  const body = req.body ?? {};
  const rootQuestion = String(body.rootQuestion ?? '').trim();
  if (!rootQuestion) {
    res.status(400).json({ error: 'rootQuestion is required' });
    return;
  }

  const depth = typeof body.depth === 'number' ? body.depth : 0;
  if (depth > MAX_DEPTH) {
    res.status(400).json({ error: 'Maximum exploration depth reached' });
    return;
  }

  try {
    const messages = [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildUserPrompt(body as Record<string, unknown>) },
    ];

    const raw = await callSmartLlm(messages, 1400, { preferGroq: true });
    const parsed = parseResponse(raw);
    const fallbackId = `node_${Date.now()}`;
    const node = normalizeNode(parsed.node as Record<string, unknown>, fallbackId);

    res.status(200).json({
      node,
      challengeFeedback: parsed.challengeFeedback ? String(parsed.challengeFeedback) : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[thinking-mode]', message);
    const hint =
      message.includes('Groq') || message.includes('model')
        ? 'LLM error — set GROQ_MODEL=openai/gpt-oss-120b on Vercel and redeploy.'
        : message.includes('Gemini')
          ? 'Gemini error — check GEMINI_API_KEY on Vercel or rely on Groq.'
          : 'Failed to generate thinking node';
    res.status(500).json({ error: hint, detail: message.slice(0, 200) });
  }
}
