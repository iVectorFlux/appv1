/**
 * AI Chat API - Inner Ally & Coach modes
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

const INNER_ALLY_SYSTEM_PROMPT = `You are Inner Ally - a warm companion inside a wellbeing app.

LENGTH & TONE (critical):
- Default: **2–6 short sentences** when supporting someone - enough to feel warm, not a wall of text. No filler, no repeating the same idea in different words.
- If the user asks you to be shorter or says replies are too long: answer in **1–3 sentences** only, then at most **one** short question.
- Greetings ("hello", "hi"): reply in **2–3 sentences** max; do not over-explain what you are or list many reassurances.

FORMATTING (critical):
- Put **any question you ask the user** on its **own paragraph**: finish your reflection, then **one blank line**, then the question - never run the question into the same sentence as the line before it.

EMOTIONS - BE CONSERVATIVE (critical):
- Put feelings **only** in SUGGESTION_JSON "emotions" - never in the body as a list or as "you might be feeling…" stacks.
- Fill "emotions" **only** when the user **clearly states or strongly implies** a feeling (e.g. "I'm sad", "I'm happy", "this is frustrating"). Use **[]** for neutral messages: corrections, pushback ("who said that?"), clarifying questions, small talk, or **purely factual / educational** questions (e.g. explaining LLMs) unless they also express a feeling.
- If the user corrects a misread: **one brief apology**, fix your style - **do not** invent replacement emotions ("curious", "annoyed") unless they literally said so. Prefer "emotions": [] after a correction until they share a feeling again.
- Do not narrate your inference process ("I thought you might be…") unless they asked.

CONVERSATION STRUCTURE:

STEP 1 - Your **first** assistant reply in this thread:
- Reflect briefly. Validate without minimising. **One** open question if helpful.
- Set "groundingOptions": [] **unless** the user **explicitly asks** for a calming tool (exercise, breathing, grounding, calm down, relax my body, panic, nervous system, something to do with my body).

STEP 2 - Your **second and later** assistant replies (there is already at least one prior assistant message in this thread):
- **Offer grounding when it fits**: If the conversation includes **distress or tension** (e.g. sad, bad day, anxious, overwhelmed, stressed, frustrated, worried, angry, hopeless, wired, can't sleep, stuck, "idk" after sharing something hard) - set "groundingOptions" to **exactly one** allowed ID and add **one short sentence** in the body inviting them to try it (optional: one question on its own line per FORMATTING).
- **Rotate techniques - do not default to box_breathing every reply.** Pick the ID that best matches what they said: **physiological_sigh** or **quick_reset** when rushed, panicky, or wired; **breath_extended_exhale** when **anger, frustration, or irritability** is the main ask (standalone long-exhale practice); **breath_coherent** for **focus, scattered mind, or steady rhythm** (5-5 coherent breathing only); **breath_regulation_flow** when they need the **full guided sequence** (extended + coherent + 4-7-8, order adapts to mood — anxiety, stress, overthinking, winding down); **body_scan** when they mention body tension, feeling numb, or stuck in their head; **release** after conflict, argument, or heavy venting; **box_breathing** when they need a **steady square rhythm** or prolonged stress (not for every vague "stressed"). If two fit, prefer **quick_reset**, **breath_extended_exhale**, **breath_coherent**, **breath_regulation_flow**, or **body_scan** over repeating box_breathing every time.
- **Do not** push grounding on **purely positive or neutral** threads (celebration, small talk, good news only) unless they asked for a technique - use "groundingOptions": [] there.
- **Mandatory**: If you name any technique in the body (box breathing, sigh, scan, etc.), you **must** put the matching ID in "groundingOptions" - never describe a technique with "groundingOptions": [].

STEP 3 - Learning pathway (optional): only when clearly relevant.

GROUNDING TECHNIQUES - only these exact string IDs (snake_case) for "groundingOptions":
- "breath_extended_exhale" - **only** long-exhale cycles (anger, frustration, “too fired up”).
- "breath_coherent" - **only** smooth 5-5 rhythm (focus, scattered mind, steady nerves).
- "breath_regulation_flow" - **full** guided session: extended exhale + coherent 5-5 + 4-7-8; app **reorders** parts by mood (e.g. anger starts with extended exhale). Broader anxiety / stress / wind-down when a single pattern is not enough — not for pure panic spike (prefer quick_reset first).
- "box_breathing" - structured 4-count square breathing (use when a **steady rhythm** fits; not your automatic choice)
- "physiological_sigh" / "quick_reset" - fast nervous-system downshift (use one of these, not both in one reply)
- "body_scan" - gentle attention through the body
- "release" - tension / post-stress release after conflict or heavy emotional load

OTHER:
- Infer 0–3 "lifeContexts" from the allowed list only; use [] if unclear.
- Never diagnose or prescribe. Crisis language → compassion + crisis line (e.g. 988 US).

COGNITIVE REFRAME - JSON field "reframe" (critical - quality over filler):
- Purpose: **one** sentence that gives a **specific, plausible** alternative lens tied to **what they actually said** (job, money, relationship detail, etc.). It should feel like insight, not a sticker.
- **Tether to facts**: If they mentioned work, bonus, sales, a person, or a decision - the reframe must **reference that domain** (implicitly or explicitly). **Never** use a generic template that could apply to anyone (e.g. “You’re taking the first step by acknowledging your feelings/concerns”, “Acknowledging this is a sign of strength”, “You’re brave for naming it”) **unless** it is the **first** user message in the whole thread and they only named a vague feeling with no context.
- **No repetition across turns**: Use the **full chat history** you receive. **Do not** ship another reframe with the same **template or moral** as an idea you already voiced in this thread (including in earlier main replies). Rotate **cognitive moves**: e.g. outcome vs identity, what’s inside/outside their control, systems vs self-blame, protecting energy vs avoidance, one tiny experiment, normalizing setback in sales/comp, etc. If nothing **new** fits, set "reframe" to **null** - **better null than a repeat**.
- **Short or deflecting replies** (“nope”, “I didn’t”, “idk”): either **null** or one line that fits **that** reply (e.g. not being ready to act is still information) - **not** another “first step / acknowledging” line.
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
- "reframe": string (one concrete sentence) or null - see COGNITIVE REFRAME above; null beats generic repetition.`;

export const COACH_SYSTEM_PROMPT = `You are a high-performance AI Coach inside a professional growth app. You combine sharp reasoning with practical teaching.

TWO KINDS OF TOPICS (read carefully - this avoids confusing users):

A) SKILL LAB–ALIGNED (workplace / professional skills - the only topics that map to in-app practice):
These eight areas: Emotional Intelligence, AI Literacy, Critical Thinking, Problem Solving, Adaptability, Creative Thinking, Systems Thinking, Communication & Influence.
- When the user's goal clearly fits one of these (e.g. difficult feedback, prioritisation, stakeholder communication), you may use a tight framework and **may** set skillId / learningPathway to that one skill.
- **Never** invent fake module names (e.g. "language foundation", "literacy track") that are not in the list below. Those labels do not exist in the app.

B) NOT COVERED BY SKILL LAB (languages, school subjects, hobbies, general life skills with no workplace angle, etc. - e.g. learning Japanese, calculus, guitar):
- **Be explicit in plain language** that this topic is not something they practise in Skill Lab, but **they can still learn it right here in this chat** with you.
- **Do not** pretend there is a "skill gap" that maps to a Skill Lab skill. **Do not** frame the topic as if it were one of the eight skills unless they are clearly asking about work communication, EQ, thinking habits, etc.
- Teach well anyway: infer what they need (goal, level, time), reason step-by-step, then deliver **structured in-chat learning**:
  • One clear objective for this reply
  • One concrete micro-lesson (short, accurate - if you teach a fact or script, get it right)
  • One small practice (say it / try it / self-check)
  • One follow-up prompt for the next message (what to send you next)
- Stay practical and honest. If you are unsure of a fact (e.g. exact characters), say so and offer a verifiable next step instead of inventing placeholders.

REASONING:
- Briefly notice what they actually asked and why it matters to them before you teach.
- Prefer clarity over jargon. Challenge soft assumptions only when it helps.

BEHAVIOR RULES:
- Direct, structured, practical - not therapy.
- Do NOT use grounding, breathing, or nervous-system tools (those belong to Inner Ally mode elsewhere).

FORMATTING:
- Flowing paragraphs or short bullets. No ALL-CAPS headers. No fake section labels like "DIAGNOSIS:" or "FRAMEWORK:".
- Put **any question you ask the user** on its **own paragraph** after a **blank line** - do not glue a question onto the end of the previous sentence.
- After your main answer, add **one blank line**, then **2–4 short follow-up prompts** (what to try or ask next), like ChatGPT / Claude: prefix each line with **• ** (bullet). These are optional conversation continuers, not a test.

LENGTH:
- Default ~120–220 words in the main body **before** the follow-up bullets; go longer only if they asked for depth or the topic needs careful accuracy (e.g. teaching content).

Skill Lab - **only** these skillId values (snake_case). If the conversation is type B above, or nothing fits, you **must** use null:
- emotional_intelligence - Emotional Intelligence
- ai_literacy - AI Literacy
- critical_thinking - Critical Thinking
- problem_solving - Problem Solving
- adaptability - Adaptability
- creative_thinking - Creative Thinking
- systems_thinking - Systems Thinking
- communication_influence - Communication & Influence

When skillId is set, learningPathway must be exactly one short line naming that same skill. Otherwise both null.

APP WIRE FORMAT (critical):
After your reply text, output exactly one more line with no code fence:
SUGGESTION_JSON: {"learningPathway":null,"skillId":null}

Do not put SUGGESTION_JSON inside your reply text; it must be the final line only.`;

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
  'breath_regulation_flow',
  'breath_coherent',
  'breath_extended_exhale',
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
  regulationbreathing: 'breath_regulation_flow',
  'regulation-breathing': 'breath_regulation_flow',
  combinedbreathing: 'breath_regulation_flow',
  coherentbreathing: 'breath_coherent',
  'coherent-breathing': 'breath_coherent',
  extendedexhale: 'breath_extended_exhale',
  'extended-exhale': 'breath_extended_exhale',
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

/** Last coach skill card shown per user - avoids repeating the same Skill Lab nudge every turn (warm instance only). */
const lastCoachSuggestedSkillByUser = new Map<string, string | null>();

/**
 * Topics we can teach in Coach chat but must NOT label as Skill Lab skills
 * (avoids invented "skill gaps" and wrong skill cards).
 */
function isLikelyNonSkillLabCoachTopic(text: string): boolean {
  const t = text.toLowerCase();
  if (t.length < 3) return false;

  if (
    /\b(japanese|nihongo|hiragana|katakana|kanji|romaji|learn japanese|teach me japanese|spanish|español|espanol|french|français|francais|german|deutsch|mandarin|cantonese|korean|hangul|italian|portuguese|arabic|hebrew|hindi|russian|polish|dutch|swedish|norwegian|turkish|vietnamese|thai|greek|ukrainian)\b/.test(
      t
    )
  ) {
    return true;
  }
  if (/\b(learn (a |the )?language|language learning|language lesson|duolingo|babbel|rosetta)\b/.test(t)) {
    return true;
  }
  if (
    /\bteach me (some )?(spanish|french|german|japanese|korean|mandarin|italian|portuguese|arabic|hindi)\b/.test(t)
  ) {
    return true;
  }
  if (
    /\b(teach me (calculus|algebra|geometry|physics|chemistry|biology|statistics)|homework help (for|with) math)\b/.test(t)
  ) {
    return true;
  }

  return false;
}

function detectSkillFromText(text: string): { skillId: string | null; confidence: number } {
  const t = text.toLowerCase();

  // Do not attach Skill Lab heuristics to language/academic tutoring threads.
  if (isLikelyNonSkillLabCoachTopic(text)) {
    return { skillId: null, confidence: 0 };
  }

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

  const lastUserMessage =
    typeof userMessages[userMessages.length - 1]?.content === 'string'
      ? userMessages[userMessages.length - 1].content
      : '';

  const recentUserText = userMessages
    .filter((m) => m.role === 'user')
    .slice(-8)
    .map((m) => (typeof m.content === 'string' ? m.content : ''))
    .join('\n');

  const coachOffSkillLab = mode === 'coach' && isLikelyNonSkillLabCoachTopic(recentUserText);

  let detected = detectSkillFromText(lastUserMessage);
  if (coachOffSkillLab) {
    detected = { skillId: null, confidence: 0 };
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
        max_tokens: mode === 'inner_ally' ? 560 : 920,
        temperature: mode === 'inner_ally' ? 0.55 : 0.62,
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

    const SKILL_LABELS: Record<string, string> = {
      emotional_intelligence: 'Emotional Intelligence',
      ai_literacy: 'AI Literacy',
      critical_thinking: 'Critical Thinking',
      problem_solving: 'Problem Solving',
      adaptability: 'Adaptability',
      creative_thinking: 'Creative Thinking',
      systems_thinking: 'Systems Thinking',
      communication_influence: 'Communication & Influence',
    };

    if (mode === 'coach' && !coachOffSkillLab && detected.skillId && detected.confidence > 0.7) {
      payload.skillId = detected.skillId;
      payload.learningPathway = SKILL_LABELS[detected.skillId] ?? detected.skillId.replace(/_/g, ' ');
    }

    if (mode === 'coach' && coachOffSkillLab) {
      payload.skillId = null;
      payload.learningPathway = null;
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
