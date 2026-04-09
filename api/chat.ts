/**
 * AI Chat API — Inner Ally & Coach modes
 *
 * POST /api/chat
 * Default export uses @vercel/node so Vercel always registers this route (Fetch API handlers
 * can be skipped for static + api hybrid projects).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FUTURE_SKILLS } from '../src/data/future-skills';
import { applyCors, handleCorsPreflight } from './_lib/cors';
import { GROQ_CHAT_COMPLETIONS_URL, getGroqEnv } from './_lib/groq-config';

const COACH_SKILL_LAB_IDS = new Set(FUTURE_SKILLS.map((s) => s.id));

/** Map legacy / model ids to real Skill Lab top-level ids (see future-skills.ts). */
const COACH_SKILL_ID_ALIASES: Record<string, string> = {
  digital_collaboration: 'communication_influence',
  digitalcollaboration: 'communication_influence',
  remote_collaboration: 'communication_influence',
  async_collaboration: 'communication_influence',
  data_literacy: 'critical_thinking',
  dataliteracy: 'critical_thinking',
  leadership: 'communication_influence',
  influencing: 'communication_influence',
  influence: 'communication_influence',
  eq: 'emotional_intelligence',
};

function normalizeCoachSkillIdKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/-/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');
}

function resolveCoachSkillId(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const key = normalizeCoachSkillIdKey(raw);
  if (COACH_SKILL_LAB_IDS.has(key)) return key;
  const mapped = COACH_SKILL_ID_ALIASES[key];
  if (mapped && COACH_SKILL_LAB_IDS.has(mapped)) return mapped;
  return null;
}

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

STEP 1 — Your **first** assistant reply in this thread:
- Reflect briefly. Validate without minimising. **One** open question if helpful.
- Set "groundingOptions": [] **unless** the user **explicitly asks** for a calming tool (exercise, breathing, grounding, calm down, relax my body, panic, nervous system, something to do with my body).

STEP 2 — Your **second and later** assistant replies (there is already at least one prior assistant message in this thread):
- **Offer grounding when it fits**: If the conversation includes **distress or tension** (e.g. sad, bad day, anxious, overwhelmed, stressed, frustrated, worried, angry, hopeless, wired, can't sleep, stuck, "idk" after sharing something hard) — set "groundingOptions" to **exactly one** allowed ID and add **one short sentence** in the body inviting them to try it (plus optional one question). Prefer **box_breathing** when unsure; **physiological_sigh** or **quick_reset** when they sound rushed or panicky; **body_scan** when they mention body tension; **release** after conflict or heavy venting.
- **Do not** push grounding on **purely positive or neutral** threads (celebration, small talk, good news only) unless they asked for a technique — use "groundingOptions": [] there.
- **Mandatory**: If you name any technique in the body (box breathing, sigh, scan, etc.), you **must** put the matching ID in "groundingOptions" — never describe a technique with "groundingOptions": [].

STEP 3 — Learning pathway (optional): only when clearly relevant.

GROUNDING TECHNIQUES — only these exact string IDs (snake_case) for "groundingOptions":
- "box_breathing" — structured 4-count breathing (default when unsure)
- "physiological_sigh" / "quick_reset" — fast nervous-system downshift (use one of these, not both in one reply)
- "body_scan" — gentle attention through the body
- "release" — tension / post-stress release

OTHER:
- Infer 0–3 "lifeContexts" from the allowed list only; use [] if unclear.
- Never diagnose or prescribe. Crisis language → compassion + crisis line (e.g. 988 US).

COGNITIVE REFRAME — JSON field "reframe" (critical — quality over filler):
- Purpose: **one** sentence that gives a **specific, plausible** alternative lens tied to **what they actually said** (job, money, relationship detail, etc.). It should feel like insight, not a sticker.
- **Tether to facts**: If they mentioned work, bonus, sales, a person, or a decision — the reframe must **reference that domain** (implicitly or explicitly). **Never** use a generic template that could apply to anyone (e.g. “You’re taking the first step by acknowledging your feelings/concerns”, “Acknowledging this is a sign of strength”, “You’re brave for naming it”) **unless** it is the **first** user message in the whole thread and they only named a vague feeling with no context.
- **No repetition across turns**: Use the **full chat history** you receive. **Do not** ship another reframe with the same **template or moral** as an idea you already voiced in this thread (including in earlier main replies). Rotate **cognitive moves**: e.g. outcome vs identity, what’s inside/outside their control, systems vs self-blame, protecting energy vs avoidance, one tiny experiment, normalizing setback in sales/comp, etc. If nothing **new** fits, set "reframe" to **null** — **better null than a repeat**.
- **Short or deflecting replies** (“nope”, “I didn’t”, “idk”): either **null** or one line that fits **that** reply (e.g. not being ready to act is still information) — **not** another “first step / acknowledging” line.
- **Length**: max ~22 words; one sentence; warm but **concrete**.
- Put the reframe **only** in JSON. Do not paste it verbatim in the main reply body.
- **null** when: positive-only message, pure logistics, no distress, or you would be repeating a prior reframe pattern.

Allowed lifeContexts (exact strings, max 3):
"Work / School", "Family", "Relationships", "Health & Body", "Self", "Money", "Environment", "Life changes", "World", "Other", "Sleep & Rest", "Identity & Purpose", "Conflict & Boundaries", "Loss & Grief", "Creativity & Hobbies", "News & Society"

End every reply with this on its own line (no code fence):
SUGGESTION_JSON: {"emotions":["sad"],"lifeContexts":["Work / School"],"groundingOptions":[],"learningPathway":null,"suggestSaveAsReflection":false,"reframe":null}

JSON rules:
- "emotions": 0–3 short lowercase words; **[]** when not clearly emotional (see above).
- "lifeContexts": 0–3 from list only; [] if unclear.
- "groundingOptions": **at most one** allowed ID, or []. First assistant message: non-empty only if the user explicitly asked for a calming tool (STEP 1). Later messages: non-empty when distress/tension warrants it or they asked (STEP 2); [] on upbeat-only threads unless they asked.
- "learningPathway": null unless genuinely relevant.
- "suggestSaveAsReflection": true for meaningful personal sharing worth capturing.
- "reframe": string (one concrete sentence) or null — see COGNITIVE REFRAME above; null beats generic repetition.`;

export const COACH_SYSTEM_PROMPT = `You are a high-performance AI Coach focused on professional growth, communication, and behavior change.

GOAL:
Help the user improve skills through structured thinking, clear frameworks, and practice.

BEHAVIOR RULES:
- Be direct, structured, and practical (not emotional support).
- Do NOT validate feelings like a therapist.
- Focus on outcomes, not comfort.
- Push thinking slightly (challenge assumptions when needed).
- Keep responses concise and actionable.

RESPONSE STRUCTURE (always follow in the main reply text):
1. CONTEXT UNDERSTANDING
   - Restate the situation briefly in 1 line.

2. DIAGNOSIS
   - Identify the core skill gap (e.g., communication, assertiveness, clarity, decision-making).

3. FRAMEWORK
   - Provide a simple, named framework (2–4 steps max).
   - Make it easy to apply immediately.

4. PRACTICAL EXAMPLE
   - Show how the user should respond / act in their situation.

5. PRACTICE (MANDATORY)
   - Give a short scenario or question for the user to try.

CONSTRAINTS:
- Max 150 words for sections 1–5 combined unless the user explicitly asks for depth.
- No fluff, no long essays.
- No grounding techniques, breathing exercises, or nervous-system tools.
- No emotional labeling or "how does that make you feel" style prompts.
- No generic advice.

LEARNING PATHWAY:
- Only suggest a skill if clearly relevant.
- Put the short title in SUGGESTION_JSON as learningPathway (or null).
- Put skillId in SUGGESTION_JSON when applicable — use only IDs from the list below.

TONE:
- Calm, sharp, slightly challenging.
- Like a great mentor, not a friend.

Skill Lab — these are the only valid skillId values (snake_case). When skillId is set, learningPathway must be one short line naming the same skill:
- emotional_intelligence — Emotional Intelligence (EQ, self-awareness, empathy, regulation)
- ai_literacy — AI Literacy (prompting, evaluating AI output, human–AI workflow)
- critical_thinking — Critical Thinking (evidence, assumptions, reasoning; includes data-literacy style questions)
- problem_solving — Problem Solving (framing problems, options, decisions)
- adaptability — Adaptability (change, ambiguity, learning under pressure)
- creative_thinking — Creative Thinking (ideas, constraints, innovation)
- systems_thinking — Systems Thinking (feedback loops, stakeholders, second-order effects)
- communication_influence — Communication & Influence (async collaboration, stakeholder comms, persuasion)

If nothing fits well, set both learningPathway and skillId to null.

APP WIRE FORMAT (critical):
After your coach reply (sections 1–5), output exactly one more line with no code fence:
SUGGESTION_JSON: {"learningPathway":null,"skillId":null}

Do not put SUGGESTION_JSON inside the numbered sections; it must be the final line only.`;

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

/** Must match INNER_ALLY_SYSTEM_PROMPT and chat-suggestion-navigation AI_TO_MODE. */
const ALLOWED_INNER_ALLY_GROUNDING_IDS = new Set([
  'box_breathing',
  'body_scan',
  'release',
  'physiological_sigh',
  'quick_reset',
]);

const GROUNDING_ID_ALIASES: Record<string, string> = {
  boxbreathing: 'box_breathing',
  'box-breathing': 'box_breathing',
  physiologicalsigh: 'physiological_sigh',
  'physiological-sigh': 'physiological_sigh',
  sigh: 'physiological_sigh',
  bodyscan: 'body_scan',
  'body-scan': 'body_scan',
  quickreset: 'quick_reset',
  'quick-reset': 'quick_reset',
};

function resolveInnerAllyGroundingId(raw: string): string | null {
  const key = raw
    .trim()
    .toLowerCase()
    .replace(/-/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');
  if (ALLOWED_INNER_ALLY_GROUNDING_IDS.has(key)) return key;
  const mapped = GROUNDING_ID_ALIASES[key];
  if (mapped && ALLOWED_INNER_ALLY_GROUNDING_IDS.has(mapped)) return mapped;
  return null;
}

function normalizeInnerAllyPayload(
  suggestion: Record<string, unknown> | null
): Record<string, unknown> {
  if (!suggestion || typeof suggestion !== 'object') return {};
  const out: Record<string, unknown> = { ...suggestion };

  const rawGo = out.groundingOptions;
  const groundingOptions: string[] = [];
  if (Array.isArray(rawGo)) {
    for (const x of rawGo) {
      if (typeof x !== 'string') continue;
      const id = resolveInnerAllyGroundingId(x);
      if (id) {
        groundingOptions.push(id);
        break;
      }
    }
  }
  out.groundingOptions = groundingOptions;

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

function normalizeCoachPayload(suggestion: Record<string, unknown> | null): Record<string, unknown> {
  if (!suggestion || typeof suggestion !== 'object') return {};
  const out: Record<string, unknown> = { ...suggestion };
  out.skillId = resolveCoachSkillId(out.skillId);
  const lp = out.learningPathway;
  if (typeof lp === 'string') {
    const t = lp.trim();
    out.learningPathway = t.length > 0 ? t.slice(0, 280) : null;
  } else {
    out.learningPathway = null;
  }
  return out;
}

function readJsonBody(req: VercelRequest): {
  mode?: string;
  messages?: { role: string; content: string }[];
  userId?: string;
} | null {
  const raw = req.body;
  if (raw == null) return null;
  if (typeof raw === 'object' && !Buffer.isBuffer(raw)) {
    return raw as { mode?: string; messages?: { role: string; content: string }[]; userId?: string };
  }
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as { mode?: string; messages?: { role: string; content: string }[]; userId?: string };
    } catch {
      return null;
    }
  }
  return null;
}

/** Last coach skill card shown per user — avoids repeating the same Skill Lab nudge every turn (warm instance only). */
const lastCoachSuggestedSkillByUser = new Map<string, string | null>();

function detectSkillFromText(text: string): { skillId: string | null; confidence: number } {
  const t = text.toLowerCase();

  if (t.includes('meeting') || t.includes('speak') || t.includes('communicate')) {
    return { skillId: 'communication_influence', confidence: 0.8 };
  }
  if (t.includes('decision') || t.includes('choose') || t.includes('confused')) {
    return { skillId: 'problem_solving', confidence: 0.75 };
  }
  if (t.includes('overthink') || t.includes('analyze') || t.includes('logic')) {
    return { skillId: 'critical_thinking', confidence: 0.7 };
  }
  if (t.includes('change') || t.includes('uncertain')) {
    return { skillId: 'adaptability', confidence: 0.7 };
  }

  return { skillId: null, confidence: 0 };
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

  const lastUserMessage = userMessages[userMessages.length - 1]?.content || '';
  const detected = detectSkillFromText(lastUserMessage);

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
        max_tokens: mode === 'inner_ally' ? 420 : 380,
        temperature: mode === 'inner_ally' ? 0.55 : 0.65,
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
      mode === 'inner_ally' ? normalizeInnerAllyPayload(suggestion) : normalizeCoachPayload(suggestion);

    if (mode === 'coach' && detected.skillId && detected.confidence > 0.7) {
      payload.skillId = detected.skillId;
      payload.learningPathway = detected.skillId.replace(/_/g, ' ');
    }

    if (mode === 'coach') {
      const uid =
        typeof body.userId === 'string' && body.userId.length > 0 ? body.userId : '__anon__';
      let lastSuggestedSkill: string | null = lastCoachSuggestedSkillByUser.get(uid) ?? null;

      if (payload.skillId === lastSuggestedSkill) {
        payload.skillId = null;
        payload.learningPathway = null;
      } else {
        lastSuggestedSkill = typeof payload.skillId === 'string' ? payload.skillId : null;
        lastCoachSuggestedSkillByUser.set(uid, lastSuggestedSkill);
      }
    }

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
