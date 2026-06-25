/**
 * POST /api/inner-ally-memory
 *
 * Fire-and-forget memory merge after an Inner Ally turn (client calls in background).
 * Coach mode must not call this route.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handleCorsPreflight } from './_lib/cors';
import { updateInnerAllyMemoryAfterTurn } from './_lib/inner-ally-memory';

function readJsonBody(req: VercelRequest): Record<string, unknown> | null {
  const raw = req.body;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
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

  const body = readJsonBody(req);
  if (!body) {
    res.status(400).json({ error: 'Invalid JSON body.' });
    return;
  }

  const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
  const userMessage = typeof body.userMessage === 'string' ? body.userMessage : '';
  const assistantReply = typeof body.assistantReply === 'string' ? body.assistantReply : '';

  if (!userId || !userMessage.trim() || !assistantReply.trim()) {
    res.status(400).json({ error: 'userId, userMessage, and assistantReply are required.' });
    return;
  }

  const emotions = Array.isArray(body.emotions)
    ? body.emotions.filter((x): x is string => typeof x === 'string')
    : undefined;
  const lifeContexts = Array.isArray(body.lifeContexts)
    ? body.lifeContexts.filter((x): x is string => typeof x === 'string')
    : undefined;
  const markFollowUpsNudged = body.markFollowUpsNudged === true;

  await updateInnerAllyMemoryAfterTurn({
    userId,
    userMessage,
    assistantReply,
    emotions,
    lifeContexts,
    markFollowUpsNudged,
  });

  res.status(200).json({ ok: true });
}
