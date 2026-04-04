/**
 * GET /api/health — readiness check
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handleCorsPreflight } from './_lib/cors';

export default function handler(req: VercelRequest, res: VercelResponse): void {
  applyCors(res);
  if (handleCorsPreflight(req, res)) return;

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  res.status(200).json({
    ok: true,
    service: 'eq-app',
    timestamp: new Date().toISOString(),
  });
}
