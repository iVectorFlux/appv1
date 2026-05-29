import { TRAIT_QUESTION_POOL_RAW } from '@/data/trait-test-pool';

/**
 * Trait Test — eighteen interpersonal pattern dimensions (self-report).
 *
 * **Question types**
 * - `likert`: agreement 1–5; `reverse` flips so healthier answers lower the trait signal.
 * - `scenario`: “Think about the last time … What did you do first?” plus four options (`healthy_pattern` → 1,
 *   `neutral_pattern` → 3, `risk_pattern` → 4, `dominant_pattern` → 5). Stored value is the chosen `traitSignal`.
 *
 * **Score 0–100 per trait:** Higher = stronger expression of that pattern (`scoreHighMeans`).
 *
 * **Adaptive bank (72):** Four scenarios per trait. First wave: two per trait (36). Then seven follow-up items:
 * if many answers are neutral (midpoint), those seven are spread by a seeded shuffle; otherwise traits rank by
 * ambiguity (flat mid responses and inconsistent pairs between the two items) and get a third unused scenario each.
 */

export const TRAIT_TEST_INSTRUMENT_VERSION = 'trait_patterns_18x72_scenario_v6';

/** First wave length (two scenarios per pattern, order randomized by trait block). */
export const TRAIT_FIRST_WAVE_LEN = 36;

export type TraitDimensionId =
  | 'irrationality'
  | 'narcissism'
  | 'role_playing'
  | 'compulsive_behavior'
  | 'covetousness'
  | 'shortsightedness'
  | 'defensiveness'
  | 'self_sabotage'
  | 'repression_shadow'
  | 'envy'
  | 'grandiosity'
  | 'gender_rigidity'
  | 'aimlessness'
  | 'conformity'
  | 'fickleness'
  | 'aggression'
  | 'generational_myopia'
  | 'death_denial';

export interface TraitDimensionMeta {
  id: TraitDimensionId;
  /** Display name (matches product spec) */
  label: string;
  /** What a *higher* score suggests */
  scoreHighMeans: string;
  /** Development direction */
  improveHint: string;
}

/** Order matches spec 1–18. */
export const TRAIT_DIMENSIONS: TraitDimensionMeta[] = [
  {
    id: 'irrationality',
    label: 'Irrationality',
    scoreHighMeans: 'More emotion-driven bias in decisions and interpretation.',
    improveHint: 'Delay decisions; write reasoning first.',
  },
  {
    id: 'narcissism',
    label: 'Narcissism',
    scoreHighMeans: 'More validation-driven self-view and social comparison.',
    improveHint: 'Perspective-taking; empathy training.',
  },
  {
    id: 'role_playing',
    label: 'Role-playing',
    scoreHighMeans: 'More identity masking across contexts.',
    improveHint: 'Align internal and external self gradually.',
  },
  {
    id: 'compulsive_behavior',
    label: 'Compulsive Behavior',
    scoreHighMeans: 'More unconscious loops and stuck patterns.',
    improveHint: 'Trigger awareness; interrupt the pattern.',
  },
  {
    id: 'covetousness',
    label: 'Covetousness',
    scoreHighMeans: 'More externally driven desire and comparison-based motivation.',
    improveHint: 'Define intrinsic goals.',
  },
  {
    id: 'shortsightedness',
    label: 'Shortsightedness',
    scoreHighMeans: 'More impulsive short-term bias vs long-term trade-offs.',
    improveHint: 'Simulate long-term outcomes.',
  },
  {
    id: 'defensiveness',
    label: 'Defensiveness',
    scoreHighMeans: 'More ego protection around ideas and self-image.',
    improveHint: 'Separate identity from ideas.',
  },
  {
    id: 'self_sabotage',
    label: 'Self-sabotage',
    scoreHighMeans: 'More fear-driven avoidance of own goals.',
    improveHint: 'Small action loops.',
  },
  {
    id: 'repression_shadow',
    label: 'Repression (Shadow)',
    scoreHighMeans: 'More hidden or suppressed parts leaking into behaviour.',
    improveHint: 'Acknowledge suppressed traits.',
  },
  {
    id: 'envy',
    label: 'Envy',
    scoreHighMeans: 'More comparison stress around others’ success.',
    improveHint: 'Convert envy into learning.',
  },
  {
    id: 'grandiosity',
    label: 'Grandiosity',
    scoreHighMeans: 'More overconfidence with limited data or feedback.',
    improveHint: 'Seek external feedback.',
  },
  {
    id: 'gender_rigidity',
    label: 'Gender Rigidity',
    scoreHighMeans: 'More restricted identity along expected roles or “types”.',
    improveHint: 'Expand behavioural range.',
  },
  {
    id: 'aimlessness',
    label: 'Aimlessness',
    scoreHighMeans: 'More lack of clear direction and purpose alignment.',
    improveHint: 'Define mission and priorities.',
  },
  {
    id: 'conformity',
    label: 'Conformity',
    scoreHighMeans: 'More social dependence in opinions and expression.',
    improveHint: 'Independent thinking practice.',
  },
  {
    id: 'fickleness',
    label: 'Fickleness',
    scoreHighMeans: 'More unstable alignment and fluctuating commitments.',
    improveHint: 'Anchor values.',
  },
  {
    id: 'aggression',
    label: 'Aggression',
    scoreHighMeans: 'More unmanaged hostility, irritation, or indirect frustration.',
    improveHint: 'Pause; label emotion.',
  },
  {
    id: 'generational_myopia',
    label: 'Generational Myopia',
    scoreHighMeans: 'More present-only focus with weak historical perspective.',
    improveHint: 'Study patterns and history.',
  },
  {
    id: 'death_denial',
    label: 'Death Denial',
    scoreHighMeans: 'More avoidance of mortality awareness and meaning trade-offs.',
    improveHint: 'Connect short-term choices to deeper priorities.',
  },
];

export type LikertTraitQuestion = {
  type: 'likert';
  id: string;
  traitId: TraitDimensionId;
  text: string;
  /** When true, agreement lowers the trait score (healthier opposite). */
  reverse: boolean;
};

/** Option role for analytics / consistency (four slots per scenario). */
export type TraitOptionPatternSub =
  | 'healthy_pattern'
  | 'neutral_pattern'
  | 'risk_pattern'
  | 'dominant_pattern';

export type ScenarioTraitOption = {
  label: string;
  /** 1 / 3 / 4 / 5 aligned to healthy → dominant pattern expression for this dimension. */
  traitSignal: number;
  sub: TraitOptionPatternSub;
};

export type ScenarioTraitQuestion = {
  type: 'scenario';
  id: string;
  traitId: TraitDimensionId;
  prompt: string;
  options: ScenarioTraitOption[];
};

export type TraitQuestionItem = LikertTraitQuestion | ScenarioTraitQuestion;

/** Four scenario items per dimension (72); see `trait-test-pool.ts`. */
export const TRAIT_QUESTION_POOL = TRAIT_QUESTION_POOL_RAW as TraitQuestionItem[];

export function getQuestionPrompt(q: TraitQuestionItem): string {
  return q.type === 'scenario' ? q.prompt : q.text;
}

/** 1–5 trait signal: likert applies reverse; scenario treats stored value as chosen option’s traitSignal. */
export function responseToTraitSignal(item: TraitQuestionItem, stored1to5: number): number {
  const v = Math.min(5, Math.max(1, Math.round(stored1to5)));
  if (item.type === 'scenario') return v;
  return item.reverse ? 6 - v : v;
}

/** @deprecated alias for `responseToTraitSignal` */
export function traitItemKeyedValue(item: TraitQuestionItem, raw: number): number {
  return responseToTraitSignal(item, raw);
}

/** Likert anchors (agreement). */
export const TRAIT_LIKERT_LABELS: Record<number, string> = {
  1: 'Strongly disagree',
  2: 'Disagree',
  3: 'Neither agree nor disagree',
  4: 'Agree',
  5: 'Strongly agree',
};

const POOL_BY_TRAIT: Map<TraitDimensionId, TraitQuestionItem[]> = (() => {
  const m = new Map<TraitDimensionId, TraitQuestionItem[]>();
  for (const t of TRAIT_DIMENSIONS) m.set(t.id, []);
  for (const q of TRAIT_QUESTION_POOL) {
    m.get(q.traitId)!.push(q);
  }
  return m;
})();

/** Deterministic PRNG (Mulberry32). */
export function traitTestMulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(arr: T[], rand: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export function buildInitialTraitQuestionOrder(sessionSeed: number): TraitQuestionItem[] {
  const rand = traitTestMulberry32(sessionSeed);
  const traits = [...TRAIT_DIMENSIONS.map((d) => d.id)];
  shuffleInPlace(traits, rand);

  const out: TraitQuestionItem[] = [];
  let variantSalt = 0;
  for (const traitId of traits) {
    const bank = POOL_BY_TRAIT.get(traitId)!;
    const len = bank.length;
    const v = Math.floor(rand() * len) % len;
    const idx0 = (v + variantSalt) % len;
    variantSalt += 7;
    let idx1 = Math.floor(rand() * len) % len;
    let guard = 0;
    while (idx1 === idx0 && len > 1 && guard++ < 32) {
      idx1 = Math.floor(rand() * len) % len;
    }
    if (idx1 === idx0 && len > 1) {
      idx1 = (idx0 + 1) % len;
    }
    out.push(bank[idx0]!, bank[idx1]!);
  }
  return out;
}

function hashQuestionIds(questions: TraitQuestionItem[]): number {
  let h = 2166136261 >>> 0;
  for (const q of questions) {
    for (let i = 0; i < q.id.length; i++) {
      h = Math.imul(h ^ q.id.charCodeAt(i), 16777619) >>> 0;
    }
  }
  return h >>> 0;
}

function pickUnusedPoolItem(traitId: TraitDimensionId, usedIds: Set<string>): TraitQuestionItem | undefined {
  const bank = POOL_BY_TRAIT.get(traitId)!;
  return bank.find((q) => !usedIds.has(q.id));
}

export function pickAdaptiveFollowUps(
  wave1Questions: TraitQuestionItem[],
  responses: Record<string, number>
): TraitQuestionItem[] {
  const usedIds = new Set(wave1Questions.map((q) => q.id));

  let neutralCount = 0;
  for (const q of wave1Questions) {
    const raw = responses[q.id];
    if (raw == null) continue;
    if (responseToTraitSignal(q, raw) === 3) neutralCount++;
  }

  const appendNeutralShuffleFollowUps = (): TraitQuestionItem[] => {
    const traitOrder = [...new Set(wave1Questions.map((q) => q.traitId))];
    const rand = traitTestMulberry32(hashQuestionIds(wave1Questions) ^ 0x9e3779b9);
    shuffleInPlace(traitOrder, rand);
    const out: TraitQuestionItem[] = [];
    for (const tid of traitOrder) {
      if (out.length >= 7) break;
      const nextQ = pickUnusedPoolItem(tid, usedIds);
      if (nextQ) {
        out.push(nextQ);
        usedIds.add(nextQ.id);
      }
    }
    return out;
  };

  // ~55% habitual midpoint → treat as low-information; spread follow-ups.
  if (neutralCount >= 20) {
    return appendNeutralShuffleFollowUps().slice(0, 7);
  }

  const signalsByTrait = new Map<TraitDimensionId, number[]>();
  for (const q of wave1Questions) {
    const raw = responses[q.id];
    if (raw == null) continue;
    const s = responseToTraitSignal(q, raw);
    const arr = signalsByTrait.get(q.traitId) ?? [];
    arr.push(s);
    signalsByTrait.set(q.traitId, arr);
  }

  const rows: { traitId: TraitDimensionId; ambiguity: number }[] = [];
  for (const [traitId, sigs] of signalsByTrait) {
    if (sigs.length < 2) continue;
    const s1 = sigs[0]!;
    const s2 = sigs[1]!;
    const mean = (s1 + s2) / 2;
    const spread = Math.abs(s1 - s2);
    const ambiguity = Math.abs(mean - 3) * 0.85 + spread * 0.45;
    rows.push({ traitId, ambiguity });
  }

  rows.sort((a, b) => {
    if (a.ambiguity !== b.ambiguity) return b.ambiguity - a.ambiguity;
    return a.traitId.localeCompare(b.traitId);
  });

  const followUps: TraitQuestionItem[] = [];
  for (const row of rows.slice(0, 7)) {
    const nextQ = pickUnusedPoolItem(row.traitId, usedIds);
    if (nextQ) {
      followUps.push(nextQ);
      usedIds.add(nextQ.id);
    }
  }

  if (followUps.length < 7) {
    const covered = new Set(followUps.map((f) => f.traitId));
    for (const q of wave1Questions) {
      if (followUps.length >= 7) break;
      if (covered.has(q.traitId)) continue;
      const pick = pickUnusedPoolItem(q.traitId, usedIds);
      if (pick) {
        followUps.push(pick);
        usedIds.add(pick.id);
        covered.add(q.traitId);
      }
    }
  }

  return followUps.slice(0, 7);
}

export function newTraitTestSessionSeed(): number {
  const a = Date.now() & 0xfffffff;
  const b = Math.floor(Math.random() * 0xfffffff);
  return (a ^ b) >>> 0;
}
