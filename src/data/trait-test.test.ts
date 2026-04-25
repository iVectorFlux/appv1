import { describe, it, expect } from 'vitest';
import {
  TRAIT_DIMENSIONS,
  TRAIT_QUESTION_POOL,
  buildInitialTraitQuestionOrder,
  pickAdaptiveFollowUps,
  responseToTraitSignal,
} from '@/data/trait-test';
import { scoreTraitTest } from '@/services/trait-test-scoring';

describe('trait-test adaptive bank', () => {
  it('has 18 dimensions and 72 pool items (4 each)', () => {
    expect(TRAIT_DIMENSIONS).toHaveLength(18);
    expect(TRAIT_QUESTION_POOL).toHaveLength(72);
    const byTrait = new Map<string, number>();
    for (const q of TRAIT_QUESTION_POOL) {
      byTrait.set(q.traitId, (byTrait.get(q.traitId) ?? 0) + 1);
    }
    expect(byTrait.size).toBe(18);
    for (const n of byTrait.values()) {
      expect(n).toBe(4);
    }
  });

  it('buildInitialTraitQuestionOrder returns one item per trait', () => {
    const wave = buildInitialTraitQuestionOrder(42_001);
    expect(wave).toHaveLength(18);
    const ids = new Set(wave.map((q) => q.traitId));
    expect(ids.size).toBe(18);
  });

  it('pickAdaptiveFollowUps returns 7 unused items', () => {
    const wave = buildInitialTraitQuestionOrder(99_001);
    const responses: Record<string, number> = {};
    for (const q of wave) {
      responses[q.id] = 3;
    }
    const extras = pickAdaptiveFollowUps(wave, responses);
    expect(extras).toHaveLength(7);
    const used = new Set(wave.map((q) => q.id));
    for (const e of extras) {
      expect(used.has(e.id)).toBe(false);
    }
    const traitCounts = new Map<string, number>();
    for (const q of [...wave, ...extras]) {
      traitCounts.set(q.traitId, (traitCounts.get(q.traitId) ?? 0) + 1);
    }
    for (const n of traitCounts.values()) {
      expect(n).toBeLessThanOrEqual(2);
    }
  });

  it('responseToTraitSignal: scenario passthrough', () => {
    const a = TRAIT_QUESTION_POOL.find((x) => x.id === 'tt_irr_q1')!;
    expect(responseToTraitSignal(a, 5)).toBe(5);
    const b = TRAIT_QUESTION_POOL.find((x) => x.id === 'tt_rp_q9')!;
    expect(responseToTraitSignal(b, 1)).toBe(1);
  });

  it('scoreTraitTest maps all-neutral to ~50', () => {
    const wave = buildInitialTraitQuestionOrder(7);
    const responses: Record<string, number> = {};
    for (const q of wave) responses[q.id] = 3;
    const extras = pickAdaptiveFollowUps(wave, responses);
    for (const q of extras) responses[q.id] = 3;
    const r = scoreTraitTest(responses, 'trait_patterns_18x72_scenario_v4');
    expect(r.overall0to100).toBeGreaterThanOrEqual(48);
    expect(r.overall0to100).toBeLessThanOrEqual(52);
  });
});
