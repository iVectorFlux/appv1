/**
 * POST /api/big5-leadership-insights
 *
 * Accepts aggregated Big Five results (raw, z-scores, percentiles, validity, reliability)
 * and returns a longer workplace / leadership-oriented narrative. Does not require item-level responses.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handleCorsPreflight } from './_lib/cors';
import { GROQ_CHAT_COMPLETIONS_URL, getGroqEnv } from './_lib/groq-config';

const SYSTEM_PROMPT = `You are an organizational psychologist and leadership development coach writing inside a self-insight app.

The user completed a Big Five (OCEAN) self-report questionnaire. You receive ONLY aggregate scores and quality flags — not individual item answers.

Your job:
1. Write a clear, structured report (use markdown headings ## and ### only where helpful; no code fences).
2. Connect their profile to **corporate leadership and teamwork**: communication, trust-building, decision-making under stress, handling conflict, driving change, delegation, developing others, psychological safety, and stakeholder influence. Be specific to their pattern (highs/lows), not generic platitudes.
3. Include a short section on **likely strengths in leadership contexts** and **watch-outs / blind spots** (framed as developmental, not pathologizing).
4. Mention **how** validity flags (if any are true) might temper interpretation — briefly, without alarmism.
5. End with **limitations**: self-report bias, culture/context, not for hiring or clinical use; encourage reflection and feedback from others.

Tone: professional, respectful, concise paragraphs. Avoid clinical diagnosis. Do not invent scores not provided.

Length: roughly 550–900 words unless the profile is very simple.`;

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
  const headline = typeof b.ruleBasedHeadline === 'string' ? b.ruleBasedHeadline : '';
  const execSummary = typeof b.ruleBasedExecutiveSummary === 'string' ? b.ruleBasedExecutiveSummary : '';
  const engine = b.engine;

  if (!engine || typeof engine !== 'object') {
    res.status(400).json({ error: 'Missing engine payload.' });
    return;
  }

  const userBlock = `
INSTRUMENT_VERSION: ${instrumentVersion}

RULE-BASED HEADLINE (from app): ${headline}

RULE-BASED SUMMARY (from app): ${execSummary}

FULL ENGINE PAYLOAD (JSON):
${JSON.stringify(engine, null, 2)}
`.trim();

  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    {
      role: 'user' as const,
      content: `Produce the leadership and workplace insights report based on the following data.\n\n${userBlock}`,
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
        max_tokens: 2800,
        temperature: 0.55,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[big5-leadership-insights] Groq error:', errText);
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
    console.error('[big5-leadership-insights]', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}
