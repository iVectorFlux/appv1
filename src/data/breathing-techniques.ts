/**
 * Standalone breathing library (recommended set).
 * Used by Grounding hub + GuidedBreathSession; keys are GroundingMode values.
 */

import type { GroundingMode, GroundingModeConfig } from '@/types/grounding';

export type BreathOrbHint = 'expand' | 'contract' | 'holdHigh' | 'holdLow' | 'pulse';

export type BreathPhaseStep = {
  key: string;
  label: string;
  sub: string;
  durationMs: number;
  color: string;
  orb: BreathOrbHint;
};

export type GuidedBreathDefinition = {
  modeId: GroundingMode;
  cycles: number;
  steps: BreathPhaseStep[];
  /** Bellows uses a counter-style UI instead of a slow orb. */
  uiVariant: 'orb' | 'bellows';
};

export const BREATH_TECHNIQUE_MODES: GroundingModeConfig[] = [
  {
    id: 'breath_physiological_sigh',
    label: 'Physiological sigh',
    subtitle: 'Fastest calm-down',
    duration: '~1 min',
    durationMs: 60_000,
    icon: 'pulse-outline',
    description:
      'Inhale, a quick top-up inhale, then a long exhale. Best for acute stress spikes; supports the fastest shift toward parasympathetic tone.',
    mechanism: 'Acute stress spike; sympathetic surge',
  },
  {
    id: 'breath_box',
    label: 'Box breathing',
    subtitle: 'Stabilization',
    duration: '~2.5 min',
    durationMs: 160_000,
    icon: 'cube-outline',
    description:
      'Equal inhale, hold, exhale, hold empty (4-4-4-4). Builds rhythm and perceived control during anxiety or emotional imbalance.',
    mechanism: 'Anxiety; emotional imbalance; cognitive narrowing',
  },
  {
    id: 'breath_478',
    label: '4–7–8 breathing',
    subtitle: 'Deep calm / sleep',
    duration: '~2 min',
    durationMs: 120_000,
    icon: 'moon-outline',
    description:
      'Inhale 4, hold 7, exhale 8. Strong parasympathetic bias—useful when thoughts race or you are winding down for sleep.',
    mechanism: 'Overthinking; sleep onset; rumination',
  },
  {
    id: 'breath_coherent',
    label: 'Coherent breathing',
    subtitle: 'Focus & HRV',
    duration: '~2 min',
    durationMs: 120_000,
    icon: 'analytics-outline',
    description:
      'Smooth 5-second inhale and 5-second exhale (~0.1 Hz). Supports steady attention before cognitive work or meetings.',
    mechanism: 'Cognitive work; meetings; performance focus',
  },
  {
    id: 'breath_extended_exhale',
    label: 'Extended exhale',
    subtitle: 'Anger control',
    duration: '~1.5 min',
    durationMs: 90_000,
    icon: 'water-outline',
    description:
      'Shorter inhale, longer exhale (4 in / 7 out). Emphasizes down-regulation when frustration or anger is hot.',
    mechanism: 'Anger; frustration; mobilized arousal',
  },
  {
    id: 'breath_bellows',
    label: 'Bellows breath',
    subtitle: 'Energy boost',
    duration: '~45 sec',
    durationMs: 45_000,
    icon: 'flash-outline',
    description:
      'Short, brisk cycles to increase alertness when you feel sluggish or low-energy (brief sympathetic activation).',
    mechanism: 'Low energy; sluggishness; afternoon dip',
  },
  {
    id: 'breath_resonant',
    label: 'Resonant breathing',
    subtitle: 'Resilience baseline',
    duration: '~2 min',
    durationMs: 120_000,
    icon: 'infinite-outline',
    description:
      '~5.5 s inhale / ~5.5 s exhale (~6 breaths/min). A gentle daily practice to support HRV and emotional stability over time.',
    mechanism: 'Daily training; baseline regulation',
  },
];

const S = (ms: number) => ms;

const BOX_MS = S(4000);

export const GUIDED_BREATH_BY_MODE: Record<string, GuidedBreathDefinition> = {
  breath_physiological_sigh: {
    modeId: 'breath_physiological_sigh',
    cycles: 6,
    uiVariant: 'orb',
    steps: [
      {
        key: 'in1',
        label: 'Inhale',
        sub: 'Through your nose',
        durationMs: S(2000),
        color: '#6EA8FE',
        orb: 'expand',
      },
      {
        key: 'in2',
        label: 'Top-up inhale',
        sub: 'Small second sip of air',
        durationMs: S(2000),
        color: '#A78BFA',
        orb: 'holdHigh',
      },
      {
        key: 'out',
        label: 'Long exhale',
        sub: 'Slowly through your mouth',
        durationMs: S(6000),
        color: '#F97316',
        orb: 'contract',
      },
    ],
  },
  breath_box: {
    modeId: 'breath_box',
    cycles: 6,
    uiVariant: 'orb',
    steps: [
      { key: 'in', label: 'Inhale', sub: '4 seconds', durationMs: BOX_MS, color: '#6EA8FE', orb: 'expand' },
      { key: 'hold1', label: 'Hold', sub: 'Gentle, no strain', durationMs: BOX_MS, color: '#A78BFA', orb: 'holdHigh' },
      { key: 'out', label: 'Exhale', sub: 'Let it go evenly', durationMs: BOX_MS, color: '#34D399', orb: 'contract' },
      { key: 'hold2', label: 'Hold empty', sub: 'Soft pause', durationMs: BOX_MS, color: '#94A3B8', orb: 'holdLow' },
    ],
  },
  breath_478: {
    modeId: 'breath_478',
    cycles: 4,
    uiVariant: 'orb',
    steps: [
      { key: 'in', label: 'Inhale', sub: '4 seconds', durationMs: S(4000), color: '#818CF8', orb: 'expand' },
      { key: 'hold', label: 'Hold', sub: 'Hold full lungs — 7 seconds', durationMs: S(7000), color: '#A78BFA', orb: 'holdHigh' },
      { key: 'out', label: 'Exhale', sub: '8 seconds, unhurried', durationMs: S(8000), color: '#38BDF8', orb: 'contract' },
    ],
  },
  breath_coherent: {
    modeId: 'breath_coherent',
    cycles: 6,
    uiVariant: 'orb',
    steps: [
      { key: 'in', label: 'Inhale', sub: '5 seconds · smooth', durationMs: S(5000), color: '#2DD4BF', orb: 'expand' },
      { key: 'out', label: 'Exhale', sub: '5 seconds · smooth', durationMs: S(5000), color: '#14B8A6', orb: 'contract' },
    ],
  },
  breath_extended_exhale: {
    modeId: 'breath_extended_exhale',
    cycles: 6,
    uiVariant: 'orb',
    steps: [
      { key: 'in', label: 'Inhale', sub: '4 seconds', durationMs: S(4000), color: '#7DD3FC', orb: 'expand' },
      { key: 'out', label: 'Long exhale', sub: '7 seconds · longer than in', durationMs: S(7000), color: '#FB923C', orb: 'contract' },
    ],
  },
  breath_bellows: {
    modeId: 'breath_bellows',
    cycles: 24,
    uiVariant: 'bellows',
    steps: [
      {
        key: 'ex',
        label: 'Sharp exhale',
        sub: 'Through the nose, belly snaps in',
        durationMs: S(550),
        color: '#F59E0B',
        orb: 'contract',
      },
      {
        key: 'in',
        label: 'Quick inhale',
        sub: 'Passive, natural',
        durationMs: S(750),
        color: '#FBBF24',
        orb: 'expand',
      },
    ],
  },
  breath_resonant: {
    modeId: 'breath_resonant',
    cycles: 7,
    uiVariant: 'orb',
    steps: [
      {
        key: 'in',
        label: 'Inhale',
        sub: '~5.5 s · nasal, easy',
        durationMs: S(5500),
        color: '#C084FC',
        orb: 'expand',
      },
      {
        key: 'out',
        label: 'Exhale',
        sub: '~5.5 s · easy',
        durationMs: S(5500),
        color: '#E879F9',
        orb: 'contract',
      },
    ],
  },
};

export function getGuidedBreathDefinition(mode: GroundingMode): GuidedBreathDefinition | null {
  const def = GUIDED_BREATH_BY_MODE[mode];
  return def ?? null;
}
