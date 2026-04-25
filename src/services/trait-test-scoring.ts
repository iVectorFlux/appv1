/**
 * Trait Test scoring: aggregate keyed Likert per dimension → 0–100 display scores.
 */

import {
  TRAIT_DIMENSIONS,
  TRAIT_QUESTION_POOL,
  type TraitDimensionId,
  responseToTraitSignal,
} from '@/data/trait-test';

export type TraitTestScores = Record<TraitDimensionId, number>;

export interface TraitTestScoreResult {
  byTrait: TraitTestScores;
  /** Mean of dimension 0–100 scores */
  overall0to100: number;
  instrumentVersion: string;
}

const TRAIT_ORDER = TRAIT_DIMENSIONS.map((d) => d.id);

function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** Map keyed mean in [1,5] to [0,100]. */
export function keyedMeanToDisplay100(keyedMean: number): number {
  const clamped = Math.min(5, Math.max(1, keyedMean));
  return Math.round(((clamped - 1) / 4) * 100);
}

/**
 * Score from any subset of answered items (typically 18 or 25 ids).
 * Multiple items per trait are averaged after keying.
 */
export function scoreTraitTest(
  responses: Record<string, number>,
  instrumentVersion: string
): TraitTestScoreResult {
  const byId = new Map(TRAIT_QUESTION_POOL.map((q) => [q.id, q]));

  const keyedByTrait = new Map<TraitDimensionId, number[]>();
  for (const id of TRAIT_ORDER) keyedByTrait.set(id, []);

  for (const [qid, likert] of Object.entries(responses)) {
    const item = byId.get(qid);
    if (!item) continue;
    const keyed = responseToTraitSignal(item, likert);
    keyedByTrait.get(item.traitId)!.push(keyed);
  }

  const byTrait = {} as TraitTestScores;
  for (const id of TRAIT_ORDER) {
    const vals = keyedByTrait.get(id) ?? [];
    byTrait[id] = keyedMeanToDisplay100(mean(vals.length ? vals : [3]));
  }

  const overall0to100 = Math.round(mean(TRAIT_ORDER.map((id) => byTrait[id])));

  return { byTrait, overall0to100, instrumentVersion };
}

export function formatTraitTestSummaryLine(scores: TraitTestScores, topN = 3): string {
  const ranked = [...TRAIT_ORDER]
    .map((id) => ({ id, s: scores[id], label: TRAIT_DIMENSIONS.find((d) => d.id === id)!.label }))
    .sort((a, b) => b.s - a.s);
  const top = ranked.slice(0, topN).map((r) => `${r.label} ${r.s}`);
  return top.join(' · ');
}
