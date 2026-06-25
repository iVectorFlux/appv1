/**
 * Upstash Vector client for competency sprint playbook + session memory.
 * Uses Upstash's built-in embedding on `data` fields (no separate embed step).
 */

import { Index } from '@upstash/vector';

export type CompetencyVectorMetadata = {
  type: 'micro_skill' | 'drill' | 'session_insight' | 'user_attempt';
  skillId?: string;
  competency?: string;
  userId?: string;
  sprintId?: string;
  score?: number;
  createdAt?: string;
};

let index: Index | null = null;

export function getCompetencyIndex(): Index | null {
  const url = process.env.UPSTASH_VECTOR_REST_URL?.trim();
  const token = process.env.UPSTASH_VECTOR_REST_TOKEN?.trim();
  if (!url || !token) return null;
  if (!index) {
    index = new Index({ url, token });
  }
  return index;
}

export function isVectorConfigured(): boolean {
  return getCompetencyIndex() !== null;
}

export async function upsertCompetencyDocument(
  id: string,
  data: string,
  metadata: CompetencyVectorMetadata
): Promise<{ ok: boolean; error?: string }> {
  const idx = getCompetencyIndex();
  if (!idx) {
    return { ok: false, error: 'Upstash Vector not configured.' };
  }
  try {
    await idx.upsert({
      id,
      data,
      metadata: metadata as Record<string, string | number | boolean | undefined>,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'upsert failed' };
  }
}

export async function queryCompetencyPlaybook(
  query: string,
  topK = 3,
  filter?: string
): Promise<
  Array<{
    id: string;
    score: number;
    metadata?: CompetencyVectorMetadata;
    data?: string;
  }>
> {
  const idx = getCompetencyIndex();
  if (!idx) return [];
  try {
    const results = await idx.query({
      data: query,
      topK,
      includeMetadata: true,
      includeData: true,
      ...(filter ? { filter } : {}),
    });
    return (results ?? []).map((r) => ({
      id: String(r.id),
      score: r.score ?? 0,
      metadata: r.metadata as CompetencyVectorMetadata | undefined,
      data: typeof r.data === 'string' ? r.data : undefined,
    }));
  } catch {
    return [];
  }
}
