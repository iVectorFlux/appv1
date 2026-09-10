/**
 * Thinking Mode API — lazy-loaded thinking graph nodes (no pre-filled metadata).
 * POST /api/thinking-mode
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handleCorsPreflight } from './_lib/cors';
import { getGroqEnv } from './_lib/groq-config';
import { callSmartLlm } from './_lib/llm-service';

const MAX_DEPTH = 8;

function buildSystemPrompt(): string {
  return `You are the Thinking Graph engine for Lumi6 Thinking Mode.

Your job: generate ONE learning node at a time — never a full tree upfront.

Rules:
- Plain language. A curious 12-year-old should follow.
- Each node is a mini lesson: question → think → explain → evidence → next branches.
- Mark 0–3 prerequisite concepts in "concepts" ONLY when understanding the current node truly depends on them.
- Do NOT mark every noun as a concept — avoid cognitive overload.
- Offer 3–5 branches max (why, how, what, what_if, example, challenge, connect, simulate — pick what fits).
- Choose "representation" by content: flow for processes, cause_effect for causal chains, timeline for history, comparison for contrasts, concept_tree for hierarchies, text otherwise.
- "processSteps" only when representation is flow or cause_effect (3–6 short steps).
- "visualizationHint" = one sentence describing a mental picture or simple demo.
- "socraticQuestion" = one question that makes the learner think before reading on.
- Stay coherent with rootQuestion and sessionPath — do not repeat nodes already on the path.
- depth is how far from root; if depth >= 6, favor synthesis and challenge over endless drilling.

Return ONLY valid JSON matching this schema:
{
  "node": {
    "id": "unique_snake_case_id",
    "question": "string",
    "whyItMatters": "string optional",
    "explanation": "string — use [concept terms] in brackets for explorable prerequisites",
    "socraticQuestion": "string optional",
    "concepts": [{ "term": "string", "reason": "why explore this now" }],
    "processSteps": ["string"] optional,
    "evidence": "string optional — real-world example or fact",
    "visualizationHint": "string optional",
    "representation": "text|flow|concept_tree|timeline|comparison|cause_effect",
    "branches": [{ "type": "why|how|what|what_if|example|challenge|connect|simulate", "label": "short button label" }],
    "challengePrompt": "string optional — prediction question for the learner"
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

Generate the root node: decompose the question, give a clear first explanation, suggest the most useful branches to explore next.`;
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

Generate the child node for this branch. Go deeper or wider as appropriate.`;
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
  if (typeof raw === 'string') {
    const parsed = JSON.parse(raw);
    return parsed;
  }
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (obj.node) return obj as { node: Record<string, unknown>; challengeFeedback?: string };
    if (obj.text) {
      const inner = JSON.parse(String(obj.text));
      return inner;
    }
  }
  throw new Error('Invalid LLM response shape');
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
        }))
    : [{ type: 'why', label: 'Explore why' }];

  const rep = String(raw.representation ?? 'text');
  const validReps = ['text', 'flow', 'concept_tree', 'timeline', 'comparison', 'cause_effect'];

  return {
    id: String(raw.id ?? fallbackId).trim() || fallbackId,
    question: String(raw.question ?? 'Thinking…').trim(),
    whyItMatters: raw.whyItMatters ? String(raw.whyItMatters).trim() : undefined,
    explanation: String(raw.explanation ?? '').trim(),
    socraticQuestion: raw.socraticQuestion ? String(raw.socraticQuestion).trim() : undefined,
    concepts,
    processSteps: Array.isArray(raw.processSteps)
      ? raw.processSteps.map((s) => String(s)).filter(Boolean).slice(0, 6)
      : undefined,
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

    const raw = await callSmartLlm(messages, 1800);
    const parsed = parseResponse(raw);
    const fallbackId = `node_${Date.now()}`;
    const node = normalizeNode(parsed.node as Record<string, unknown>, fallbackId);

    res.status(200).json({
      node,
      challengeFeedback: parsed.challengeFeedback ? String(parsed.challengeFeedback) : undefined,
    });
  } catch (err) {
    console.error('[thinking-mode]', err);
    res.status(500).json({ error: 'Failed to generate thinking node' });
  }
}
