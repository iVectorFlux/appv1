/**
 * AI Chat API — Inner Ally & Coach modes
 *
 * POST /api/chat
 * Default export uses @vercel/node so Vercel always registers this route (Fetch API handlers
 * can be skipped for static + api hybrid projects).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handleCorsPreflight } from './_lib/cors';
import { GROQ_CHAT_COMPLETIONS_URL, getGroqEnv } from './_lib/groq-config';

const INNER_ALLY_SYSTEM_PROMPT = `You are Inner Ally — a warm companion inside a wellbeing app.

LENGTH & TONE (critical):
- Default: **2–5 short sentences total** — not multiple long paragraphs. No filler, no repeating the same idea in different words.
- If the user asks you to be shorter or says replies are too long: answer in **1–3 sentences** only, then at most **one** short question.
- Greetings ("hello", "hi"): reply in **2–3 sentences** max; do not over-explain what you are or list many reassurances.

EMOTIONS — BE CONSERVATIVE (critical):
- Put feelings **only** in SUGGESTION_JSON "emotions" — never in the body as a list or as "you might be feeling…" stacks.
- Fill "emotions" **only** when the user **clearly states or strongly implies** a feeling (e.g. "I'm sad", "I'm happy", "this is frustrating"). Use **[]** for neutral messages: corrections, pushback ("who said that?"), clarifying questions, small talk, or **purely factual / educational** questions (e.g. explaining LLMs) unless they also express a feeling.
- If the user corrects a misread: **one brief apology**, fix your style — **do not** invent replacement emotions ("curious", "annoyed") unless they literally said so. Prefer "emotions": [] after a correction until they share a feeling again.
- Do not narrate your inference process ("I thought you might be…") unless they asked.

CONVERSATION STRUCTURE:

STEP 1 — First substantive exchange (and until you understand what's going on):
- Reflect briefly. Validate without minimising. **One** open question if helpful.
- Do NOT suggest grounding yet. Do NOT offer tools on the first assistant message.

STEP 2 — After 2+ user turns when the situation is clearer:
- Brief acknowledgement. If they seem tense or overwhelmed, suggest **exactly one** grounding technique.

STEP 3 — Learning pathway (optional): only when clearly relevant.

GROUNDING TECHNIQUES — only these IDs:
- "box_breathing", "body_scan", "release", "physiological_sigh", "quick_reset"

OTHER:
- Infer 0–3 "lifeContexts" from the allowed list only; use [] if unclear.
- Never diagnose or prescribe. Crisis language → compassion + crisis line (e.g. 988 US).

POSITIVE REFRAME — "reframe" field (critical):
- When the user’s **latest message** carries **negative framing** — not only named “bad” emotions, but also hopelessness, stuckness, harsh self-judgment, “nothing works”, “life isn’t going the right way”, overwhelm, regret, fear things won’t improve — set "reframe" to **one short sentence** (max ~28 words): a **gentle, realistic** alternative angle, strength, or possibility they might overlook. **Not** toxic positivity; it’s OK that things are hard.
- Put that sentence **only** in JSON "reframe". Do **not** repeat the same sentence verbatim in the main reply (you may empathize differently in the body).
- If the message is **clearly positive-only**, purely factual/educational, neutral small talk, or a correction with no distress, set "reframe" to **null**.

Allowed lifeContexts (exact strings, max 3):
"Work / School", "Family", "Relationships", "Health & Body", "Self", "Money", "Environment", "Life changes", "World", "Other", "Sleep & Rest", "Identity & Purpose", "Conflict & Boundaries", "Loss & Grief", "Creativity & Hobbies", "News & Society"

End every reply with this on its own line (no code fence):
SUGGESTION_JSON: {"emotions":["sad"],"lifeContexts":["Work / School"],"groundingOptions":[],"learningPathway":null,"suggestSaveAsReflection":false,"reframe":null}

JSON rules:
- "emotions": 0–3 short lowercase words; **[]** when not clearly emotional (see above).
- "lifeContexts": 0–3 from list only; [] if unclear.
- "groundingOptions": at most one ID, or []. Never on the first assistant message in a thread.
- "learningPathway": null unless genuinely relevant.
- "suggestSaveAsReflection": true for meaningful personal sharing worth capturing.
- "reframe": string (one sentence) or null — see POSITIVE REFRAME above.`;

const COACH_SYSTEM_PROMPT = `You are an expert leadership and professional growth coach inside a learning app.

Your role:
- Answer leadership, career, communication, and professional development questions with structured insight.
- Give 2-3 concrete, actionable points or frameworks the user can apply immediately.
- Use real examples and scenarios where helpful.
- When the user's question connects to one of these Skill Lab / practice skills, suggest exploring it:
  AI Literacy, Critical Thinking, Problem Solving, Emotional Intelligence, Adaptability,
  Digital Collaboration, Data Literacy, Creative Thinking, Systems Thinking, Communication & Influence.
- Keep responses focused and practical. 3-5 paragraphs maximum.
- Avoid generic motivational content — be specific, nuanced, and direct.

At the end of each response, include a JSON block on its own line in this exact format (do not include it in a code fence):
SUGGESTION_JSON: {"learningPathway":null,"skillId":null}

learningPathway: a brief description of a topic to explore, or null.
skillId: one of the top-level skill IDs if relevant (e.g. "systems_thinking", "critical_thinking", "communication_influence", "adaptability", "problem_solving", "emotional_intelligence", "ai_literacy", "digital_collaboration", "data_literacy", "creative_thinking"), or null.`;

function parseMode(mode: string): 'inner_ally' | 'coach' {
  return mode === 'coach' ? 'coach' : 'inner_ally';
}

function extractSuggestion(content: string): {
  cleanContent: string;
  suggestion: Record<string, unknown> | null;
} {
  const marker = 'SUGGESTION_JSON:';
  const idx = content.lastIndexOf(marker);
  if (idx === -1) return { cleanContent: content.trim(), suggestion: null };

  const jsonPart = content.slice(idx + marker.length).trim();
  const cleanContent = content.slice(0, idx).trim();

  try {
    const suggestion = JSON.parse(jsonPart);
    return { cleanContent, suggestion };
  } catch {
    return { cleanContent, suggestion: null };
  }
}

/** Must match Reflect check-in reason strings for consistent analytics. */
const ALLOWED_LIFE_CONTEXTS = new Set([
  'Work / School',
  'Family',
  'Relationships',
  'Health & Body',
  'Self',
  'Money',
  'Environment',
  'Life changes',
  'World',
  'Other',
  'Sleep & Rest',
  'Identity & Purpose',
  'Conflict & Boundaries',
  'Loss & Grief',
  'Creativity & Hobbies',
  'News & Society',
]);

function normalizeInnerAllyPayload(
  suggestion: Record<string, unknown> | null
): Record<string, unknown> {
  if (!suggestion || typeof suggestion !== 'object') return {};
  const out: Record<string, unknown> = { ...suggestion };

  const rawEmotions = out.emotions;
  const emotions = Array.isArray(rawEmotions)
    ? rawEmotions.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((s) => s.trim()).slice(0, 4)
    : [];
  out.emotions = emotions;

  const rawLc = out.lifeContexts ?? out.contexts;
  const lifeContexts = Array.isArray(rawLc)
    ? rawLc
        .filter((x): x is string => typeof x === 'string' && ALLOWED_LIFE_CONTEXTS.has(x.trim()))
        .map((s) => s.trim())
        .slice(0, 3)
    : [];
  out.lifeContexts = lifeContexts;
  delete out.contexts;

  const rawReframe = out.reframe;
  if (typeof rawReframe === 'string' && rawReframe.trim().length > 0) {
    out.reframe = rawReframe.trim().slice(0, 320);
  } else {
    out.reframe = null;
  }

  return out;
}

function readJsonBody(req: VercelRequest): { mode?: string; messages?: { role: string; content: string }[] } | null {
  const raw = req.body;
  if (raw == null) return null;
  if (typeof raw === 'object' && !Buffer.isBuffer(raw)) {
    return raw as { mode?: string; messages?: { role: string; content: string }[] };
  }
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as { mode?: string; messages?: { role: string; content: string }[] };
    } catch {
      return null;
    }
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  applyCors(res);
  if (handleCorsPreflight(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const groq = getGroqEnv();
  if (!groq) {
    res.status(500).json({ error: 'Groq API key not configured.' });
    return;
  }
  const { apiKey, model } = groq;

  const body = readJsonBody(req);
  if (!body) {
    res.status(400).json({ error: 'Invalid JSON body.' });
    return;
  }

  const mode = parseMode(body.mode ?? 'inner_ally');
  const userMessages = Array.isArray(body.messages) ? body.messages : [];

  if (userMessages.length === 0) {
    res.status(400).json({ error: 'No messages provided.' });
    return;
  }

  const systemPrompt = mode === 'inner_ally' ? INNER_ALLY_SYSTEM_PROMPT : COACH_SYSTEM_PROMPT;
  const chatMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...userMessages.map((m) => ({ role: m.role, content: m.content })),
  ];

  try {
    const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: chatMessages,
        max_tokens: mode === 'inner_ally' ? 420 : 600,
        temperature: mode === 'inner_ally' ? 0.55 : 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[chat] Groq error:', errText);
      let message = 'AI request failed.';
      try {
        const j = JSON.parse(errText) as { error?: { message?: string } };
        if (typeof j?.error?.message === 'string') message = j.error.message;
      } catch {
        if (errText.length > 0 && errText.length < 400) message = errText;
      }
      res.status(502).json({ error: message });
      return;
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
    };

    const rawContent = data.choices?.[0]?.message?.content ?? '';
    const { cleanContent, suggestion } = extractSuggestion(rawContent);

    const payload =
      mode === 'inner_ally' ? normalizeInnerAllyPayload(suggestion) : suggestion ?? {};

    res.status(200).json({
      reply: cleanContent,
      mode,
      ...payload,
    });
  } catch (err) {
    console.error('[chat] Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}
