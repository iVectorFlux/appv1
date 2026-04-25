/**
 * Last Trait Test snapshot (device cache; optional cloud later).
 */

import { readCacheJson, writeCacheJson, cacheSegments } from '@/lib/async-data-cache';
import type { TraitTestScores } from '@/services/trait-test-scoring';

export type TraitTestLatestCache = {
  completedAt: string;
  overall0to100: number;
  summaryLine: string;
  instrumentVersion: string;
  byTrait: TraitTestScores;
};

export async function readTraitTestLatest(userId: string): Promise<TraitTestLatestCache | null> {
  return readCacheJson<TraitTestLatestCache>(cacheSegments.traitTestLatest(userId));
}

export async function writeTraitTestLatest(userId: string, data: TraitTestLatestCache): Promise<void> {
  await writeCacheJson(cacheSegments.traitTestLatest(userId), data);
}
