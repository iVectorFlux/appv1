import { buildVercelApiUrl } from '@/utils/vercel-api';
import type { ThinkingModeRequest, ThinkingModeResponse } from '@/data/thinking-mode-types';

export async function requestThinkingNode(
  payload: ThinkingModeRequest
): Promise<ThinkingModeResponse> {
  const url = buildVercelApiUrl('/api/thinking-mode');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const body = err as { error?: string; detail?: string };
    const msg = [body.error, body.detail].filter(Boolean).join(' — ');
    throw new Error(msg || `Request failed (${res.status})`);
  }

  return res.json() as Promise<ThinkingModeResponse>;
}
