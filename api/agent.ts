/**
 * ADK agent proxy — forwards to Cloud Run ADK service.
 *
 * No LLM logic here. Google ADK agent runs on Cloud Run (agents/lumi6).
 * Set LUMI6_AGENT_SERVICE_URL in Vercel env after `adk deploy cloud_run`.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handleCorsPreflight } from './_lib/cors';

const AGENT_TIMEOUT_MS = 55_000;

function getAgentBaseUrl(): string | null {
  const url = process.env.LUMI6_AGENT_SERVICE_URL?.trim();
  if (!url || !url.startsWith('http')) return null;
  return url.replace(/\/$/, '');
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  applyCors(res);
  if (handleCorsPreflight(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const base = getAgentBaseUrl();
  if (!base) {
    res.status(503).json({
      error:
        'ADK agent service not configured. Deploy agents/lumi6 to Cloud Run and set LUMI6_AGENT_SERVICE_URL.',
    });
    return;
  }

  const body = typeof req.body === 'object' && req.body !== null ? req.body : {};
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AGENT_TIMEOUT_MS);

  try {
    // ADK Cloud Run exposes session/run endpoints; path may vary by ADK version — adjust after first deploy.
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
      res.status(502).json({ error: 'ADK agent returned non-JSON response.' });
      return;
    }

    res.status(upstream.status).json(parsed);
  } catch (err: unknown) {
    const message =
      err instanceof Error && err.name === 'AbortError'
        ? 'Agent request timed out.'
        : 'Could not reach ADK agent on Cloud Run.';
    res.status(502).json({ error: message });
  } finally {
    clearTimeout(timeout);
  }
}
