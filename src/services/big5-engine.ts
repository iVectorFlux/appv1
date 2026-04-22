/**
 * Big Five - extended scoring: population z-scores / percentiles, validity flags,
 * and reliability estimates (reference α × session quality). Norms are placeholders
 * until calibrated from your own user base.
 */

import { BIG5_QUESTIONS, type Big5QuestionTrait } from '@/data/big5-questions';
import big5PopulationNorms from '@/data/big5-population-norms.json';
import { computeBig5Scores, type Big5Scores } from '@/services/big5-scoring';

export const BIG5_ENGINE_VERSION = 'big5_engine_v1';

/** Empirical μ, σ (1–5) from `big-five-data` public sample; regenerate via `npm run compute-big5-norms`. */
export const POPULATION_MEAN: Big5Scores = big5PopulationNorms.population_mean;

export const POPULATION_STD: Big5Scores = big5PopulationNorms.population_std;

/** Typical internal consistency for IPIP-style 10-item facets (reference only). */
export const REFERENCE_ALPHA: Big5Scores = {
  openness: 0.82,
  conscientiousness: 0.81,
  extraversion: 0.86,
  agreeableness: 0.77,
  neuroticism: 0.86,
};

const ALPHA_FLOOR = 0.65;
const REVERSE_PAIR_DIFF_THRESHOLD = 3;
const REVERSE_PAIR_CONFLICTS_GLOBAL = 5;
const STRAIGHT_LINE_SHARE = 0.8;
const TRAIT_VARIANCE_SUSPICIOUS = 0.06;
const TOO_FAST_TOTAL_SEC = 60;
const TOO_FAST_PER_ITEM_SEC = 1;

export type Big5ValidityFlags = {
  inconsistent: boolean;
  straight_lining: boolean;
  too_fast: boolean;
  reverse_pair_conflicts: number;
};

export type Big5ReliabilityResult = {
  /** Effective α-like reliability per trait (reference × session quality; capped). */
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  low_confidence: Record<keyof Big5Scores, boolean>;
};

export type Big5EngineResult = {
  raw: Big5Scores;
  /** Population z-scores (placeholder norms). */
  z_scores: Big5Scores;
  /** Approximate percentiles 0–100 from Φ(z). */
  percentiles: Big5Scores;
  reliability: Big5ReliabilityResult;
  validity: Big5ValidityFlags;
  duration_seconds: number | null;
};

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function sampleVariance(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return mean(values.map((x) => (x - m) ** 2));
}

/** Error function approximation (Abramowitz & Stegun). */
function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  const ax = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * ax);
  const y =
    1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

/** Standard normal CDF Φ(z). */
export function normalCDF(z: number): number {
  return 0.5 * (1 + erf(z / Math.sqrt(2)));
}

function keyedResponse(q: (typeof BIG5_QUESTIONS)[0], responses: Record<string, number>): number {
  const raw = responses[q.id];
  return q.reverse ? 6 - raw : raw;
}

/**
 * Pairs of same-trait items with opposite keying should yield similar keyed scores.
 * Counts pairs with |k1 − k2| > threshold (rough inconsistency signal for one session).
 */
export function countReverseKeyConflicts(responses: Record<string, number>): number {
  let conflicts = 0;
  const byTrait: Record<Big5QuestionTrait, typeof BIG5_QUESTIONS> = {
    O: [],
    C: [],
    E: [],
    A: [],
    ES: [],
  };
  for (const q of BIG5_QUESTIONS) {
    byTrait[q.trait].push(q);
  }
  for (const trait of Object.keys(byTrait) as Big5QuestionTrait[]) {
    const items = byTrait[trait];
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const q1 = items[i];
        const q2 = items[j];
        if (q1.reverse === q2.reverse) continue;
        const r1 = responses[q1.id];
        const r2 = responses[q2.id];
        if (typeof r1 !== 'number' || typeof r2 !== 'number') continue;
        const k1 = keyedResponse(q1, responses);
        const k2 = keyedResponse(q2, responses);
        if (Math.abs(k1 - k2) > REVERSE_PAIR_DIFF_THRESHOLD) conflicts++;
      }
    }
  }
  return conflicts;
}

function traitKeyedScores(trait: Big5QuestionTrait, responses: Record<string, number>): number[] {
  return BIG5_QUESTIONS.filter((q) => q.trait === trait).map((q) => keyedResponse(q, responses));
}

function straightLiningFlag(responses: Record<string, number>): boolean {
  const vals = Object.values(responses);
  if (vals.length === 0) return false;
  const counts = new Map<number, number>();
  for (const v of vals) counts.set(v, (counts.get(v) ?? 0) + 1);
  const max = Math.max(...counts.values());
  return max / vals.length >= STRAIGHT_LINE_SHARE;
}

function tooFastFlag(durationSeconds: number | null | undefined, nQuestions: number): boolean {
  if (durationSeconds == null || !Number.isFinite(durationSeconds) || durationSeconds <= 0) return false;
  if (durationSeconds < TOO_FAST_TOTAL_SEC) return true;
  if (durationSeconds / nQuestions < TOO_FAST_PER_ITEM_SEC) return true;
  return false;
}

function sessionQualityFactor(conflicts: number): number {
  return Math.max(0.5, Math.min(1, 1 - conflicts * 0.07));
}

function buildReliability(responses: Record<string, number>, conflicts: number): Big5ReliabilityResult {
  const sq = sessionQualityFactor(conflicts);
  const keys = Object.keys(REFERENCE_ALPHA) as (keyof Big5Scores)[];
  const low_confidence: Record<keyof Big5Scores, boolean> = {
    openness: false,
    conscientiousness: false,
    extraversion: false,
    agreeableness: false,
    neuroticism: false,
  };

  const traitMap: Record<keyof Big5Scores, Big5QuestionTrait> = {
    openness: 'O',
    conscientiousness: 'C',
    extraversion: 'E',
    agreeableness: 'A',
    neuroticism: 'ES',
  };

  const out: Partial<Big5ReliabilityResult> = {};

  for (const k of keys) {
    const facet = traitMap[k];
    const keyed = traitKeyedScores(facet, responses);
    const varFacet = sampleVariance(keyed);
    let alpha = REFERENCE_ALPHA[k] * sq;
    if (varFacet < TRAIT_VARIANCE_SUSPICIOUS && keyed.length >= 4) {
      alpha *= 0.85;
      low_confidence[k] = true;
    }
    alpha = Math.round(alpha * 1000) / 1000;
    out[k] = alpha;
    if (alpha < ALPHA_FLOOR) low_confidence[k] = true;
  }

  return {
    openness: out.openness!,
    conscientiousness: out.conscientiousness!,
    extraversion: out.extraversion!,
    agreeableness: out.agreeableness!,
    neuroticism: out.neuroticism!,
    low_confidence,
  };
}

/**
 * Full pipeline: raw OCEAN (same as `computeBig5Scores`), z / percentiles, reliability, validity.
 */
/** Average multiple completed raw profiles (e.g. retests) for a stabilized estimate. */
export function averageBig5RawScores(runs: Big5Scores[]): Big5Scores | null {
  if (runs.length === 0) return null;
  const keys = Object.keys(runs[0]) as (keyof Big5Scores)[];
  const out = {} as Big5Scores;
  for (const key of keys) {
    out[key] = runs.reduce((s, r) => s + r[key], 0) / runs.length;
  }
  return out;
}

export function scoreBig5Assessment(
  responses: Record<string, number>,
  options?: { durationSeconds?: number | null }
): Big5EngineResult {
  const raw = computeBig5Scores(responses);
  const conflicts = countReverseKeyConflicts(responses);

  const z_scores = {} as Big5Scores;
  const percentiles = {} as Big5Scores;
  const keys = Object.keys(POPULATION_MEAN) as (keyof Big5Scores)[];
  for (const k of keys) {
    const z = (raw[k] - POPULATION_MEAN[k]) / (POPULATION_STD[k] || 0.001);
    z_scores[k] = Math.round(z * 1000) / 1000;
    percentiles[k] = Math.round(normalCDF(z) * 10000) / 100;
  }

  const reliability = buildReliability(responses, conflicts);

  const inconsistent = conflicts > REVERSE_PAIR_CONFLICTS_GLOBAL;
  const straight_lining = straightLiningFlag(responses);
  const n = BIG5_QUESTIONS.length;
  const too_fast = tooFastFlag(options?.durationSeconds ?? null, n);

  return {
    raw,
    z_scores,
    percentiles,
    reliability,
    validity: {
      inconsistent,
      straight_lining,
      too_fast,
      reverse_pair_conflicts: conflicts,
    },
    duration_seconds:
      options?.durationSeconds != null && Number.isFinite(options.durationSeconds)
        ? Math.round(options.durationSeconds * 100) / 100
        : null,
  };
}
