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
    throw new Error((err as { error?: string }).error ?? `Request failed (${res.status})`);
  }

  return res.json() as Promise<ThinkingModeResponse>;
}
