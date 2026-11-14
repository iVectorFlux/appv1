/**
 * Single guided flow: extended exhale + coherent (5-5) + 4-7-8.
 * Order shifts with emotional tone (e.g. anger → extended first).
 * Physiological sigh and full box program stay on quick_reset / box_breathing.
 */

import type { GroundingMode, GroundingModeConfig, EmotionalTone } from '@/types/grounding';

export type BreathOrbHint = 'expand' | 'contract' | 'holdHigh' | 'holdLow' | 'pulse' | 'expandFurther';

export type BreathPhaseStep = {
  key: string;
  label: string;
  sub: string;
  durationMs: number;
  color: string;
  orb: BreathOrbHint;
};

export type BreathSegment = {
  id: 'extended' | 'coherent' | 'four78';
  label: string;
  /** Shown under the segment title — best-matching feelings */
  emotionGuide: string;
  cycles: number;
  steps: BreathPhaseStep[];
};

const S = (ms: number) => ms;

const SEGMENT_EXTENDED: BreathSegment = {
  id: 'extended',
  label: 'Extended Exhale',
  emotionGuide: 'Anger · frustration · feeling “too fired up”',
  cycles: 5,
  steps: [
    { key: 'in', label: 'Inhale', sub: '4 seconds', durationMs: S(4000), color: '#7DD3FC', orb: 'expand' },
    { key: 'out', label: 'Long exhale', sub: '7 seconds · longer than in', durationMs: S(7000), color: '#FB923C', orb: 'contract' },
  ],
};

const SEGMENT_COHERENT: BreathSegment = {
  id: 'coherent',
  label: 'Coherent Breathing',
  emotionGuide: 'Focus · scattered mind · steady rhythm before work',
  cycles: 5,
  steps: [
    { key: 'in', label: 'Inhale', sub: '5 seconds · smooth', durationMs: S(5000), color: '#2DD4BF', orb: 'expand' },
    { key: 'out', label: 'Exhale', sub: '5 seconds · smooth', durationMs: S(5000), color: '#14B8A6', orb: 'contract' },
  ],
};

const SEGMENT_478: BreathSegment = {
  id: 'four78',
  label: '4 7 8 Breathing',
  emotionGuide: 'Overthinking · winding down · sleep prep',
  cycles: 4,
  steps: [
    { key: 'in', label: 'Inhale', sub: '4 seconds', durationMs: S(4000), color: '#38BDF8', orb: 'expand' },
    { key: 'hold', label: 'Hold', sub: 'Hold full lungs — 7 seconds', durationMs: S(7000), color: '#2DD4BF', orb: 'holdHigh' },
    { key: 'out', label: 'Exhale', sub: '8 seconds, unhurried', durationMs: S(8000), color: '#0EA5E9', orb: 'contract' },
  ],
};

/** Full guided sequence (extended + coherent + 4-7-8, order by mood). */
export const BREATH_REGULATION_MODE_ID: GroundingMode = 'breath_regulation_flow';

export const BREATH_COHERENT_MODE_ID: GroundingMode = 'breath_coherent';

export const BREATH_EXTENDED_EXHALE_MODE_ID: GroundingMode = 'breath_extended_exhale';

export function isGuidedBreathMode(mode: GroundingMode): boolean {
  return (
    mode === BREATH_REGULATION_MODE_ID ||
    mode === BREATH_COHERENT_MODE_ID ||
    mode === BREATH_EXTENDED_EXHALE_MODE_ID
  );
}

/** Segments played for this hub / deep-link mode (tone only affects the full regulation flow). */
export function buildSegmentsForBreathMode(mode: GroundingMode, tone: EmotionalTone | null): BreathSegment[] {
  if (mode === BREATH_REGULATION_MODE_ID) return buildRegulationFlowSegments(tone);
  if (mode === BREATH_COHERENT_MODE_ID) return [SEGMENT_COHERENT];
  if (mode === BREATH_EXTENDED_EXHALE_MODE_ID) return [SEGMENT_EXTENDED];
  return [];
}

export function breathSessionTotalMs(mode: GroundingMode, tone: EmotionalTone | null): number {
  return buildSegmentsForBreathMode(mode, tone).reduce((a, s) => a + segmentMs(s), 0);
}

export type RegulationFlowDefinition = {
  modeId: GroundingMode;
  segments: BreathSegment[];
};

function segmentMs(seg: BreathSegment): number {
  return seg.steps.reduce((a, s) => a + s.durationMs, 0) * seg.cycles;
}

/** Build ordered segments for the combined flow from EmotionalTone (hub chips) or URL tone. */
export function buildRegulationFlowSegments(tone: EmotionalTone | null): BreathSegment[] {
  const extended = SEGMENT_EXTENDED;
  const coherent = SEGMENT_COHERENT;
  const four = SEGMENT_478;

  switch (tone) {
    case 'angry':
    case 'restless':
      return [extended, coherent, four];
    case 'anxious':
    case 'tense':
    case 'scattered':
      return [coherent, extended, four];
    case 'panicked':
    case 'overwhelmed':
      return [coherent, extended, four];
    case 'sad':
    case 'numb':
      return [coherent, extended, four];
    default:
      return [coherent, extended, four];
  }
}

export function regulationFlowTotalMs(tone: EmotionalTone | null): number {
  return buildRegulationFlowSegments(tone).reduce((a, s) => a + segmentMs(s), 0);
}

export const BREATH_TECHNIQUE_MODES: GroundingModeConfig[] = [
  {
    id: BREATH_EXTENDED_EXHALE_MODE_ID,
    label: 'Extended Exhale',
    subtitle: '',
    duration: '~1 min',
    durationMs: segmentMs(SEGMENT_EXTENDED),
    icon: 'flame-outline',
    description: 'Longer exhale than inhale to cue the nervous system to downshift. Common when anger or frustration runs hot.',
    mechanism: 'Anger · frustration · irritability',
  },
  {
    id: BREATH_COHERENT_MODE_ID,
    label: 'Coherent Breathing',
    subtitle: '',
    duration: '~1 min',
    durationMs: segmentMs(SEGMENT_COHERENT),
    icon: 'pulse-outline',
    description: 'Smooth equal inhales and exhales (here 5-5) to steady heart rate variability and attention.',
    mechanism: 'Focus · anxiety · scattered mind',
  },
  {
    id: BREATH_REGULATION_MODE_ID,
    label: 'Calm Breath Sequence',
    subtitle: '',
    duration: '~4 min',
    durationMs: regulationFlowTotalMs(null),
    icon: 'fitness-outline',
    description:
      'Extended exhale, coherent 5-5, then 4-7-8 in one session. Order shifts with how you feel (e.g. anger starts with extended exhale).',
    mechanism: 'Mixed stress, wind-down, or when one pattern is not enough',
  },
];

/** Map Inner Ally / chat emotion strings to a URL `tone=` param (subset of EmotionalTone + aliases). */
export function breathToneParamFromEmotions(emotions?: string[]): string | undefined {
  const list = (emotions ?? []).map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (
    list.some((e) =>
      ['angry', 'anger', 'furious', 'frustrated', 'frustration', 'rage', 'irritated', 'mad'].includes(e)
    )
  ) {
    return 'angry';
  }
  if (list.some((e) => ['panicked', 'panic'].includes(e))) return 'panicked';
  if (list.some((e) => ['anxious', 'anxiety', 'worried', 'nervous'].includes(e))) return 'anxious';
  if (list.some((e) => ['overwhelmed', 'overwhelm'].includes(e))) return 'overwhelmed';
  if (list.some((e) => ['stressed', 'stress', 'tense'].includes(e))) return 'tense';
  if (list.some((e) => ['sad', 'hurt', 'grief', 'depressed'].includes(e))) return 'sad';
  if (list.some((e) => ['scattered', 'distracted', 'can\'t focus', 'cant focus'].includes(e))) return 'scattered';
  if (list.some((e) => ['numb', 'empty', 'flat'].includes(e))) return 'numb';
  if (list.some((e) => ['restless', 'wired', 'agitated'].includes(e))) return 'restless';
  return undefined;
}

/** Parse `tone` query from /grounding into EmotionalTone when valid. */
export function emotionalToneFromBreathToneParam(raw: string | undefined): EmotionalTone | null {
  if (!raw || typeof raw !== 'string') return null;
  const t = raw.trim().toLowerCase();
  const allowed = new Set<EmotionalTone>([
    'anxious',
    'overwhelmed',
    'angry',
    'panicked',
    'scattered',
    'tense',
    'numb',
    'sad',
    'restless',
  ]);
  if (allowed.has(t as EmotionalTone)) return t as EmotionalTone;
  if (t === 'frustrated' || t === 'frustration') return 'angry';
  if (t === 'stress') return 'tense';
  return null;
}

export function getRegulationFlowDefinition(tone: EmotionalTone | null): RegulationFlowDefinition {
  return {
    modeId: BREATH_REGULATION_MODE_ID,
    segments: buildRegulationFlowSegments(tone),
  };
}
