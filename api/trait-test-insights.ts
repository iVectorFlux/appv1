/**
 * POST /api/trait-test-insights
 *
 * Accepts aggregate Trait Test scores (0–100 per dimension, no item-level responses)
 * and returns a reflective narrative about interpersonal patterns and growth edges.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handleCorsPreflight } from './_lib/cors';
import { GROQ_CHAT_COMPLETIONS_URL, getGroqEnv } from './_lib/groq-config';

const SYSTEM_PROMPT = `You are a reflective coach writing inside a self-insight app.

The user completed a Trait Test: eighteen self-report dimensions. Each score is 0–100 where **higher means a stronger expression of that pattern** (as described in the brief for each trait—not “good” or “bad,” but how much that style shows up for them right now).

You receive ONLY:
- instrument version
- overall average (0–100)
- per-trait label, score, what a high score tends to mean, and a short improvement hint

Your job:
1. Write a structured report (markdown ## and ### where helpful; no code fences).
2. Integrate the **whole profile**: how patterns may combine (e.g. defensiveness + conformity, envy + shortsightedness)—stay grounded in their actual highs and lows, not generic advice.
3. Include sections: **Overall read**, **Likely interpersonal style**, **Growth edges** (highest scores—framed as developmental), **Strengths or counterweights** (lower scores or balanced areas—without shaming high scores), **Practical next steps** (tie to the improve hints).
4. End with **limitations**: self-report, context and culture, not for clinical diagnosis, hiring, or legal decisions; encourage dialogue with trusted people.

Tone: warm, precise, non-pathologizing. Do not invent scores. Do not quote item-level questions.

Length: roughly 500–850 words.`;

function parseBody(req: VercelRequest): unknown {
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  return req.body;
}

export type TraitInsightPayloadTrait = {
  id: string;
  label: string;
  score0to100: number;
  scoreHighMeans: string;
  improveHint: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  applyCors(res);
  if (handleCorsPreflight(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const env = getGroqEnv();
  if (!env) {
    res.status(503).json({ error: 'AI service is not configured.' });
    return;
  }

  const body = parseBody(req);
  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'Invalid JSON body.' });
    return;
  }

  const b = body as Record<string, unknown>;
  const instrumentVersion = typeof b.instrumentVersion === 'string' ? b.instrumentVersion : 'unknown';
  const overall =
    typeof b.overall0to100 === 'number' && Number.isFinite(b.overall0to100)
      ? b.overall0to100
      : null;

  if (!Array.isArray(b.traits)) {
    res.status(400).json({ error: 'Missing traits array.' });
    return;
  }

  const traits = b.traits as TraitInsightPayloadTrait[];
  if (traits.length === 0 || traits.length > 24) {
    res.status(400).json({ error: 'Invalid traits array.' });
    return;
  }

  for (const t of traits) {
    if (!t || typeof t !== 'object') {
      res.status(400).json({ error: 'Invalid trait entry.' });
      return;
    }
    if (typeof t.label !== 'string' || typeof t.score0to100 !== 'number') {
      res.status(400).json({ error: 'Each trait needs label and score0to100.' });
      return;
    }
  }

  const userBlock = `
INSTRUMENT_VERSION: ${instrumentVersion}
OVERALL_0_100: ${overall === null ? 'n/a' : overall}

TRAITS (JSON):
${JSON.stringify(traits, null, 2)}
`.trim();

  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    {
      role: 'user' as const,
      content: `Write the Trait Test insights report from the following aggregates only.\n\n${userBlock}`,
    },
  ];

  try {
    const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.apiKey}`,
      },
      body: JSON.stringify({
        model: env.model,
        messages,
        max_tokens: 2600,
        temperature: 0.55,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[trait-test-insights] Groq error:', errText);
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
      choices?: { message?: { content?: string } }[];
    };

    const report = data.choices?.[0]?.message?.content?.trim() ?? '';
    if (!report) {
      res.status(502).json({ error: 'The model returned an empty report.' });
      return;
    }

    res.status(200).json({ report });
  } catch (err) {
    console.error('[trait-test-insights]', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}
