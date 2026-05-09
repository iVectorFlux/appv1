/**
 * GET /api/audio-proxy?url=<encoded media url>
 *
 * Browsers require CORS headers on media responses. Our S3 bucket does not
 * consistently send them, so web audio routes through this same-origin API.
 * Range requests are forwarded so HTMLAudioElement can load metadata, seek,
 * and progressively stream instead of downloading the entire file up front.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handleCorsPreflight } from './_lib/cors';

const ALLOWED_HOSTS = new Set([
  'lumi6eq.s3.us-west-1.amazonaws.com',
]);

function getSingleQueryValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function parseAllowedMediaUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return null;
    if (!ALLOWED_HOSTS.has(url.hostname)) return null;
    if (!url.pathname.startsWith('/applearningfiles/')) return null;
    return url;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  applyCors(res);
  if (handleCorsPreflight(req, res)) return;

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const targetUrl = parseAllowedMediaUrl(getSingleQueryValue(req.query.url));
  if (!targetUrl) {
    res.status(400).json({ error: 'Invalid or unsupported media URL.' });
    return;
  }

  const range = req.headers.range;
  const upstream = await fetch(targetUrl.toString(), {
    method: req.method === 'HEAD' ? 'HEAD' : 'GET',
    headers: typeof range === 'string' ? { Range: range } : undefined,
  });

  if (!upstream.ok && upstream.status !== 206) {
    res.status(upstream.status).json({ error: `Media fetch failed (${upstream.status}).` });
    return;
  }

  const passthroughHeaders = [
    'accept-ranges',
    'content-length',
    'content-range',
    'content-type',
    'etag',
    'last-modified',
  ] as const;

  for (const header of passthroughHeaders) {
    const value = upstream.headers.get(header);
    if (value) res.setHeader(header, value);
  }
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800');

  res.status(upstream.status);
  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  const body = Buffer.from(await upstream.arrayBuffer());
  res.send(body);
}
