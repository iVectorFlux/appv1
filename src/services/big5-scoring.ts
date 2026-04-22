/**
 * Big Five scoring - IPIP 50 markers, means on 1–5 per trait.
 * Emotional Stability items are averaged, then Neuroticism = 6 − ES (same 1–5 scale).
 */

import { BIG5_QUESTIONS, type Big5QuestionTrait } from '@/data/big5-questions';

export type Big5Scores = {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
};

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Raw Likert 1–5 per question id (`big5_01` … `big5_50`). All 50 required.
 */
export function computeBig5Scores(responses: Record<string, number>): Big5Scores {
  const buckets: Record<Big5QuestionTrait, number[]> = {
    O: [],
    C: [],
    E: [],
    A: [],
    ES: [],
  };

  for (const q of BIG5_QUESTIONS) {
    const raw = responses[q.id];
    if (typeof raw !== 'number' || raw < 1 || raw > 5) {
      throw new Error(`Invalid or missing response for ${q.id}`);
    }
    const contribution = q.reverse ? 6 - raw : raw;
    buckets[q.trait].push(contribution);
  }

  const emotionalStability = mean(buckets.ES);
  /** Higher = more stress sensitivity / volatility (opposite of Emotional Stability). */
  const neuroticism = 6 - emotionalStability;

  return {
    openness: mean(buckets.O),
    conscientiousness: mean(buckets.C),
    extraversion: mean(buckets.E),
    agreeableness: mean(buckets.A),
    neuroticism,
  };
}

/** Short interpretive label for a single trait mean (1–5). */
export function traitLevel(score: number): 'low' | 'moderate' | 'high' {
  if (score < 2.33) return 'low';
  if (score > 3.67) return 'high';
  return 'moderate';
}

export function formatScore1dp(n: number): string {
  return n.toFixed(1);
}
