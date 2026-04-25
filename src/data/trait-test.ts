/**
 * Trait Test — eighteen interpersonal pattern dimensions (self-report).
 *
 * **Scale:** 1 = Strongly disagree … 5 = Strongly agree.  
 * **Reverse-keyed items** (`reverse: true`): agreeing indicates *less* of the pattern (healthier opposite).
 * **Score 0–100 per trait:** Higher = stronger expression of that pattern (as described in `scoreHighMeans`).
 *
 * **Adaptive (72 → 25):** Four items per trait in the bank (72). First pass: one item per trait (18).
 * Follow-ups: seven extra items for traits whose first answer was closest to neutral (3).
 */

export const TRAIT_TEST_INSTRUMENT_VERSION = 'trait_patterns_18x4_adaptive_v2';

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

export interface TraitQuestionItem {
  id: string;
  traitId: TraitDimensionId;
  text: string;
  /** When true, agreement lowers the trait score (healthy opposite). */
  reverse: boolean;
}

/**
 * Four items per dimension (72). Wording from the product spec; `reverse` marks healthy opposites.
 */
export const TRAIT_QUESTION_POOL: TraitQuestionItem[] = [
  // 1 Irrationality
  { id: 'tt_irr_a', traitId: 'irrationality', text: 'I make decisions quickly when I feel strongly.', reverse: false },
  { id: 'tt_irr_b', traitId: 'irrationality', text: 'I later rethink emotionally driven decisions.', reverse: true },
  { id: 'tt_irr_c', traitId: 'irrationality', text: 'My mood affects how I interpret facts.', reverse: false },
  { id: 'tt_irr_d', traitId: 'irrationality', text: 'I seek information that supports my beliefs.', reverse: false },
  // 2 Narcissism
  { id: 'tt_nar_a', traitId: 'narcissism', text: 'I expect recognition for my efforts.', reverse: false },
  { id: 'tt_nar_b', traitId: 'narcissism', text: 'I feel overlooked when not appreciated.', reverse: false },
  { id: 'tt_nar_c', traitId: 'narcissism', text: 'I compare myself with others often.', reverse: false },
  { id: 'tt_nar_d', traitId: 'narcissism', text: 'I seek validation after success.', reverse: false },
  // 3 Role-playing
  { id: 'tt_rp_a', traitId: 'role_playing', text: 'I behave differently across social contexts.', reverse: false },
  { id: 'tt_rp_b', traitId: 'role_playing', text: 'I hide true opinions to maintain harmony.', reverse: false },
  { id: 'tt_rp_c', traitId: 'role_playing', text: 'I adjust personality to expectations.', reverse: false },
  { id: 'tt_rp_d', traitId: 'role_playing', text: "People don't fully know my real self.", reverse: false },
  // 4 Compulsive Behavior
  { id: 'tt_cb_a', traitId: 'compulsive_behavior', text: 'I repeat patterns even when harmful.', reverse: false },
  { id: 'tt_cb_b', traitId: 'compulsive_behavior', text: 'I react similarly under stress.', reverse: false },
  { id: 'tt_cb_c', traitId: 'compulsive_behavior', text: "I notice patterns but don't change them.", reverse: false },
  { id: 'tt_cb_d', traitId: 'compulsive_behavior', text: 'My habits conflict with goals.', reverse: false },
  // 5 Covetousness
  { id: 'tt_cov_a', traitId: 'covetousness', text: 'I want things more when others have them.', reverse: false },
  { id: 'tt_cov_b', traitId: 'covetousness', text: 'I lose interest after achieving goals.', reverse: false },
  { id: 'tt_cov_c', traitId: 'covetousness', text: 'I chase externally impressive goals.', reverse: false },
  { id: 'tt_cov_d', traitId: 'covetousness', text: 'Comparison drives my motivation.', reverse: false },
  // 6 Shortsightedness
  { id: 'tt_sh_a', traitId: 'shortsightedness', text: 'I prioritize short-term rewards.', reverse: false },
  { id: 'tt_sh_b', traitId: 'shortsightedness', text: 'I act quickly on opportunities.', reverse: false },
  { id: 'tt_sh_c', traitId: 'shortsightedness', text: 'I underestimate long-term risks.', reverse: false },
  { id: 'tt_sh_d', traitId: 'shortsightedness', text: 'I struggle to delay gratification.', reverse: false },
  // 7 Defensiveness
  { id: 'tt_def_a', traitId: 'defensiveness', text: 'I feel attacked by criticism.', reverse: false },
  { id: 'tt_def_b', traitId: 'defensiveness', text: 'I justify my actions quickly.', reverse: false },
  { id: 'tt_def_c', traitId: 'defensiveness', text: 'I resist opposing views.', reverse: false },
  { id: 'tt_def_d', traitId: 'defensiveness', text: 'I protect my self-image strongly.', reverse: false },
  // 8 Self-sabotage
  { id: 'tt_ss_a', traitId: 'self_sabotage', text: 'I delay important actions.', reverse: false },
  { id: 'tt_ss_b', traitId: 'self_sabotage', text: 'I avoid opportunities due to fear.', reverse: false },
  { id: 'tt_ss_c', traitId: 'self_sabotage', text: 'I act against my own goals.', reverse: false },
  { id: 'tt_ss_d', traitId: 'self_sabotage', text: 'I doubt myself unnecessarily.', reverse: false },
  // 9 Repression (Shadow)
  { id: 'tt_rs_a', traitId: 'repression_shadow', text: 'I hide parts of myself from others.', reverse: false },
  { id: 'tt_rs_b', traitId: 'repression_shadow', text: 'I sometimes act out of character.', reverse: false },
  { id: 'tt_rs_c', traitId: 'repression_shadow', text: 'I suppress negative emotions.', reverse: false },
  { id: 'tt_rs_d', traitId: 'repression_shadow', text: 'My reactions surprise me later.', reverse: false },
  // 10 Envy
  { id: 'tt_env_a', traitId: 'envy', text: "Others' success makes me uneasy.", reverse: false },
  { id: 'tt_env_b', traitId: 'envy', text: 'I compare progress with peers.', reverse: false },
  { id: 'tt_env_c', traitId: 'envy', text: 'I feel others have unfair advantages.', reverse: false },
  { id: 'tt_env_d', traitId: 'envy', text: "I internally downplay others' success.", reverse: false },
  // 11 Grandiosity
  { id: 'tt_gra_a', traitId: 'grandiosity', text: 'I believe I can handle more than others.', reverse: false },
  { id: 'tt_gra_b', traitId: 'grandiosity', text: 'I underestimate risks in decisions.', reverse: false },
  { id: 'tt_gra_c', traitId: 'grandiosity', text: 'I trust my judgment strongly.', reverse: false },
  { id: 'tt_gra_d', traitId: 'grandiosity', text: 'I feel confident even with limited data.', reverse: false },
  // 12 Gender Rigidity
  { id: 'tt_grg_a', traitId: 'gender_rigidity', text: 'I avoid behaviors seen as "not my type".', reverse: false },
  { id: 'tt_grg_b', traitId: 'gender_rigidity', text: 'I suppress traits that feel socially risky.', reverse: false },
  { id: 'tt_grg_c', traitId: 'gender_rigidity', text: 'I act according to expected roles.', reverse: false },
  { id: 'tt_grg_d', traitId: 'gender_rigidity', text: 'I feel uncomfortable outside norms.', reverse: false },
  // 13 Aimlessness
  { id: 'tt_aim_a', traitId: 'aimlessness', text: 'I lack a clear long-term direction.', reverse: false },
  { id: 'tt_aim_b', traitId: 'aimlessness', text: 'I switch goals frequently.', reverse: false },
  { id: 'tt_aim_c', traitId: 'aimlessness', text: 'My daily actions lack alignment.', reverse: false },
  { id: 'tt_aim_d', traitId: 'aimlessness', text: 'I feel uncertain about purpose.', reverse: false },
  // 14 Conformity
  { id: 'tt_conf_a', traitId: 'conformity', text: 'I adjust opinions to match group.', reverse: false },
  { id: 'tt_conf_b', traitId: 'conformity', text: 'I avoid disagreeing publicly.', reverse: false },
  { id: 'tt_conf_c', traitId: 'conformity', text: 'I follow trends easily.', reverse: false },
  { id: 'tt_conf_d', traitId: 'conformity', text: 'I seek approval before expressing views.', reverse: false },
  // 15 Fickleness
  { id: 'tt_fic_a', traitId: 'fickleness', text: 'My opinions change based on outcomes.', reverse: false },
  { id: 'tt_fic_b', traitId: 'fickleness', text: 'I shift support when results change.', reverse: false },
  { id: 'tt_fic_c', traitId: 'fickleness', text: 'I lose interest quickly.', reverse: false },
  { id: 'tt_fic_d', traitId: 'fickleness', text: 'My commitments fluctuate.', reverse: false },
  // 16 Aggression
  { id: 'tt_agg_a', traitId: 'aggression', text: 'I feel irritation easily.', reverse: false },
  { id: 'tt_agg_b', traitId: 'aggression', text: 'I express frustration indirectly.', reverse: false },
  { id: 'tt_agg_c', traitId: 'aggression', text: 'I hold grudges.', reverse: false },
  { id: 'tt_agg_d', traitId: 'aggression', text: 'I react strongly under stress.', reverse: false },
  // 17 Generational Myopia
  { id: 'tt_gm_a', traitId: 'generational_myopia', text: 'I believe current times are unique.', reverse: false },
  { id: 'tt_gm_b', traitId: 'generational_myopia', text: 'I rarely use historical context.', reverse: false },
  { id: 'tt_gm_c', traitId: 'generational_myopia', text: "I assume past lessons don't apply.", reverse: false },
  { id: 'tt_gm_d', traitId: 'generational_myopia', text: 'I focus on present trends only.', reverse: false },
  // 18 Death Denial
  { id: 'tt_dd_a', traitId: 'death_denial', text: 'I avoid thinking about mortality.', reverse: false },
  { id: 'tt_dd_b', traitId: 'death_denial', text: 'I focus on short-term achievements.', reverse: false },
  { id: 'tt_dd_c', traitId: 'death_denial', text: 'I delay meaningful priorities.', reverse: false },
  { id: 'tt_dd_d', traitId: 'death_denial', text: 'I chase status over purpose.', reverse: false },
];

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
    const v = Math.floor(rand() * bank.length) % bank.length;
    const idx = (v + variantSalt) % bank.length;
    variantSalt += 7;
    out.push(bank[idx]!);
  }
  return out;
}

/** Keyed 1–5: higher = more of the target pattern (after reverse handling). */
export function traitItemKeyedValue(item: TraitQuestionItem, likert1to5: number): number {
  const v = Math.min(5, Math.max(1, likert1to5));
  return item.reverse ? 6 - v : v;
}

export function pickAdaptiveFollowUps(
  wave1Questions: TraitQuestionItem[],
  responses: Record<string, number>
): TraitQuestionItem[] {
  const usedIds = new Set(wave1Questions.map((q) => q.id));
  const rows: { traitId: TraitDimensionId; ambiguity: number; firstQ: TraitQuestionItem }[] = [];

  for (const q of wave1Questions) {
    const raw = responses[q.id];
    if (raw == null) continue;
    const keyed = traitItemKeyedValue(q, raw);
    rows.push({ traitId: q.traitId, ambiguity: Math.abs(keyed - 3), firstQ: q });
  }

  rows.sort((a, b) => {
    if (a.ambiguity !== b.ambiguity) return a.ambiguity - b.ambiguity;
    return a.traitId.localeCompare(b.traitId);
  });

  const followUps: TraitQuestionItem[] = [];

  for (const row of rows.slice(0, 7)) {
    const bank = POOL_BY_TRAIT.get(row.traitId)!;
    const preferred =
      bank.find((q) => !usedIds.has(q.id) && q.id !== row.firstQ.id && q.reverse !== row.firstQ.reverse) ??
      bank.find((q) => !usedIds.has(q.id) && q.id !== row.firstQ.id);
    if (preferred) {
      followUps.push(preferred);
      usedIds.add(preferred.id);
    }
  }

  if (followUps.length < 7) {
    const covered = new Set(followUps.map((f) => f.traitId));
    for (const q of wave1Questions) {
      if (followUps.length >= 7) break;
      if (covered.has(q.traitId)) continue;
      const bank = POOL_BY_TRAIT.get(q.traitId)!;
      const pick = bank.find((item) => !usedIds.has(item.id));
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
