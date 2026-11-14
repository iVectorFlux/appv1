/**
 * GET /api/audio-proxy?url=<encoded media url>
 *
 * Browsers require CORS headers on media responses. Our S3 bucket does not
 * consistently send them, so web audio routes through this same-origin API.
 * Range requests are forwarded so HTMLAudioElement can load metadata, seek,
 * and progressively stream instead of downloading the entire file up front.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as NodeWebReadableStream } from 'node:stream/web';
import { applyCors, handleCorsPreflight } from './_lib/cors';

const ALLOWED_HOSTS = new Set([
  'lumi6eq.s3.us-west-1.amazonaws.com',
]);

const ALLOWED_PATH_PREFIXES = ['/applearningfiles/', '/audios/', '/videos/'];

function getSingleQueryValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function parseAllowedMediaUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return null;
    if (!ALLOWED_HOSTS.has(url.hostname)) return null;
    if (!ALLOWED_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return null;
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

  const controller = new AbortController();
  const abortUpstream = () => {
    if (!res.writableEnded) controller.abort();
  };
  req.on('close', abortUpstream);

  let upstream: Response;
  try {
    const range = req.headers.range;
    upstream = await fetch(targetUrl.toString(), {
      method: req.method === 'HEAD' ? 'HEAD' : 'GET',
      headers: typeof range === 'string' ? { Range: range } : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    req.off('close', abortUpstream);
    if (controller.signal.aborted || res.writableEnded) return;
    res.status(502).json({ error: err instanceof Error ? err.message : 'Upstream media fetch failed.' });
    return;
  }

  if (!upstream.ok && upstream.status !== 206) {
    req.off('close', abortUpstream);
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
  if (req.method === 'HEAD' || !upstream.body) {
    req.off('close', abortUpstream);
    res.end();
    return;
  }

  try {
    const nodeStream = Readable.fromWeb(upstream.body as unknown as NodeWebReadableStream<Uint8Array>);
    await pipeline(nodeStream, res);
  } catch {
    if (!res.writableEnded) res.end();
  } finally {
    req.off('close', abortUpstream);
  }
}
