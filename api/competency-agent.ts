/**
 * Competency Sprint ADK proxy → Cloud Run (agents/lumi6-competency).
 * Set LUMI6_COMPETENCY_AGENT_URL after deploy.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handleCorsPreflight } from './_lib/cors';

const TIMEOUT_MS = 55_000;

function getBaseUrl(): string | null {
  const url = process.env.LUMI6_COMPETENCY_AGENT_URL?.trim();
  if (!url?.startsWith('http')) return null;
  return url.replace(/\/$/, '');
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  applyCors(res);
  if (handleCorsPreflight(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const base = getBaseUrl();
  if (!base) {
    res.status(503).json({
      error:
        'Competency ADK agent not configured. Deploy agents/lumi6-competency and set LUMI6_COMPETENCY_AGENT_URL.',
    });
    return;
  }

  const body = typeof req.body === 'object' && req.body !== null ? req.body : {};
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const upstream = await fetch(`${base}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await upstream.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      res.status(502).json({ error: 'Competency agent returned non-JSON.' });
      return;
    }
    res.status(upstream.status).json(parsed);
  } catch (err: unknown) {
    const message =
      err instanceof Error && err.name === 'AbortError'
        ? 'Competency agent timed out.'
        : 'Could not reach competency agent on Cloud Run.';
    res.status(502).json({ error: message });
  } finally {
    clearTimeout(timeout);
  }
}
