/**
 * AI Chat API - Inner Ally & Coach modes
 *
 * POST /api/chat
 * Default export uses @vercel/node so Vercel always registers this route (Fetch API handlers
 * can be skipped for static + api hybrid projects).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handleCorsPreflight } from './_lib/cors';
import { GROQ_CHAT_COMPLETIONS_URL, getGroqEnv } from './_lib/groq-config';
import { buildInnerAllyMemoryBlock } from './_lib/inner-ally-memory';

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
- Reflect briefly. Validate without minimising, and offer **one or two practical, gentle suggestions** they can try right now.
- **Offer breathing/grounding whenever distressed**: If the user shares feeling bad, having a bad or difficult day, stress, anxiety, sadness, anger, overwhelm, or asks for help calming down — you **must** set "groundingOptions" to **exactly one** allowed breathing/grounding ID and add **one short warm sentence** inviting them to try that guided breathing exercise right now. Set "groundingOptions": [] only for purely neutral or positive greetings/topics.

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

PROACTIVE AGENT (when LONG-TERM MEMORY is present):
- You are an agent who **knows them over time**, even when this chat thread is new.
- **Sometimes** follow up on past low moments, goals, or open concerns — like a caring friend checking in days later.
- One warm sentence is enough; never stack multiple follow-ups in one reply.
- Do not mention databases, memory, or "last session".

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
- "groundingOptions": **at most one** allowed ID, or []. Include a fitting breathing/grounding ID on **any** message (including the first reply) when the user shares feeling bad, a difficult day, stress, anxiety, sadness, anger, or overwhelm; [] only on neutral or upbeat-only threads unless they asked.
- "learningPathway": null unless genuinely relevant.
- "suggestSaveAsReflection": true for meaningful personal sharing worth capturing.
- "reframe": string (one concrete sentence) or null - see COGNITIVE REFRAME above; null beats generic repetition.`;

export const COACH_SYSTEM_PROMPT = `You are a high-performance AI Coach inside a personal & professional growth app. You combine sharp reasoning with practical teaching.

HOW TO COACH:
- Infer what they need (goal, level, context), reason step-by-step, and deliver structured, practical guidance right here in this chat:
  • One clear objective for this reply
  • One concrete framework, perspective, or micro-lesson
  • One small practice or next step they can apply today
  • One follow-up prompt for the next message
- Stay practical and honest. If you are unsure of a fact, say so and offer a verifiable next step instead of inventing placeholders.
- Never invent fake in-app module names.

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

const DISTRESS_PATTERN =
  /\b(bad day|hard day|difficult day|tough day|rough day|awful day|terrible day|feeling bad|feel bad|feeling down|stressed|stressful|anxious|anxiety|overwhelmed|panic|panicking|sad|upset|worried|worry|frustrated|frustrating|angry|mad|furious|exhausted|burnout|burned out|hopeless|low|lonely|hurt|crying|can'?t sleep|nervous|calm down)\b/i;

function pickDistressGroundingId(userText: string): string {
  const t = userText.toLowerCase();
  if (/(angry|frustrat|furious|mad|irritat)/.test(t)) return 'breath_extended_exhale';
  if (/(meeting|focus|present|scatter|nervous)/.test(t)) return 'breath_coherent';
  if (/(panic|rush|wired|calm down|overwhelm)/.test(t)) return 'physiological_sigh';
  if (/(conflict|argument|fight|hurt)/.test(t)) return 'release';
  return 'breath_regulation_flow';
}

function stripReasoningArtifacts(raw: string): string {
  return raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

function normalizeInnerAllyPayload(
  suggestion: Record<string, unknown> | null,
  lastUserText: string
): Record<string, unknown> {
  const out: Record<string, unknown> =
    suggestion && typeof suggestion === 'object' ? { ...suggestion } : {};

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
  if (groundingOptions.length === 0 && DISTRESS_PATTERN.test(lastUserText)) {
    groundingOptions.push(pickDistressGroundingId(lastUserText));
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
  out.skillId = null;
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
  isNewSession?: boolean;
} | null {
  const raw = req.body;
  if (raw == null) return null;
  if (typeof raw === 'object' && !Buffer.isBuffer(raw)) {
    return raw as {
      mode?: string;
      messages?: { role: string; content: string }[];
      userId?: string;
      isNewSession?: boolean;
    };
  }
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as {
        mode?: string;
        messages?: { role: string; content: string }[];
        userId?: string;
        isNewSession?: boolean;
      };
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

  let systemPrompt = mode === 'inner_ally' ? INNER_ALLY_SYSTEM_PROMPT : COACH_SYSTEM_PROMPT;

  if (mode === 'inner_ally') {
    const uid =
      typeof body.userId === 'string' && body.userId.length > 0 ? body.userId : null;
    const isNewSession = Boolean(body.isNewSession);
    if (uid) {
      try {
        const memoryBlock = await buildInnerAllyMemoryBlock(uid, { isNewSession });
        if (memoryBlock) {
          systemPrompt = `${systemPrompt}\n\n${memoryBlock}`;
        }
      } catch (e) {
        console.error('[chat] Inner Ally memory load failed:', e);
      }
    }
  }

  const lastUserMessage =
    [...userMessages].reverse().find((m) => m.role === 'user')?.content ?? '';
  const isReasoningModel = /gpt-oss|qwen|deepseek-r1/i.test(model);

  const chatMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...userMessages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const callGroq = async (targetModel: string, withLowReasoning: boolean): Promise<{ ok: boolean; content: string; errorMessage?: string }> => {
    const reqBody: Record<string, unknown> = {
      model: targetModel,
      messages: chatMessages,
      max_tokens: mode === 'inner_ally' ? 1800 : 2400,
      temperature: mode === 'inner_ally' ? 0.55 : 0.62,
    };
    if (withLowReasoning && /gpt-oss/i.test(targetModel)) {
      reqBody.reasoning_effort = 'low';
    }
    const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(reqBody),
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
      return { ok: false, content: '', errorMessage: message };
    }
    const data = (await response.json()) as {
      choices?: { message?: { content?: string | null } }[];
    };
    return {
      ok: true,
      content: stripReasoningArtifacts(data.choices?.[0]?.message?.content ?? ''),
    };
  };

  try {
    let result = await callGroq(model, isReasoningModel);
    let parsed = extractSuggestion(result.content);

    // Retry once without reasoning budget if content returned blank
    if (!result.ok || !parsed.cleanContent) {
      const fallbackModel = process.env.GROQ_FALLBACK_MODEL?.trim() || 'llama-3.1-8b-instant';
      if (fallbackModel !== model) {
        const retry = await callGroq(fallbackModel, false);
        if (retry.ok) {
          const retryParsed = extractSuggestion(retry.content);
          if (retryParsed.cleanContent) {
            result = retry;
            parsed = retryParsed;
          }
        }
      }
    }

    if (!result.ok && !parsed.cleanContent) {
      res.status(502).json({ error: result.errorMessage ?? 'AI request failed.' });
      return;
    }

    let finalReply = parsed.cleanContent;
    if (!finalReply) {
      finalReply =
        mode === 'inner_ally'
          ? DISTRESS_PATTERN.test(lastUserMessage)
            ? "I hear how heavy today feels, and it makes complete sense to need a moment to reset. Try stepping away from what is draining you for two minutes, drop your shoulders, and take a few slow breaths below.\n\nWould you like to share what weighed on you most today?"
            : "I'm here with you. Take a brief pause whenever you need it.\n\nWhat's been on your mind today?"
          : "Let's look at one practical step you can take right now to move forward clearly. Pick the single part within your control and focus on a 5-minute action today.\n\nWhat part of this feels most urgent to untangle?";
    }

    const payload =
      mode === 'inner_ally'
        ? normalizeInnerAllyPayload(parsed.suggestion, lastUserMessage)
        : normalizeCoachPayload(parsed.suggestion);

    if (
      mode === 'inner_ally' &&
      Array.isArray(payload.groundingOptions) &&
      payload.groundingOptions.length > 0 &&
      !/breath|grounding|sigh|pause/i.test(finalReply)
    ) {
      finalReply = `${finalReply}\n\nIf it helps, try a short guided breathing reset using the card below.`;
    }

    res.status(200).json({
      reply: finalReply,
      mode,
      ...payload,
    });
  } catch (err) {
    console.error('[chat] Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}
