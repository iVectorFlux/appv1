/**
 * Grounding Module Content
 *
 * Static content for the 5 grounding modes: configs, step definitions,
 * and recommendation logic that maps user state to a suggested mode.
 */

import type {
  GroundingMode,
  GroundingModeConfig,
  StressLevel,
  EmotionalTone,
} from '@/types/grounding';

// ============================================================================
// MODE CONFIGURATIONS
// ============================================================================

export const GROUNDING_MODES: GroundingModeConfig[] = [
  {
    id: 'quick_reset',
    label: 'Quick Reset',
    subtitle: 'Immediate downshift',
    duration: '~1 min',
    durationMs: 60_000,
    icon: 'flash-outline',
    description: 'A rapid breathing and grounding sequence to calm your nervous system in 60 seconds.',
  },
  {
    id: 'sensory_anchor',
    label: '5-4-3-2-1',
    subtitle: 'Interrupt rumination',
    duration: '3-4 min',
    durationMs: 210_000,
    icon: 'hand-left-outline',
    description: 'Engage all five senses to anchor yourself in the present moment.',
  },
  {
    id: 'panic_interrupt',
    label: 'Panic Interrupt',
    subtitle: 'Acute emotional spike',
    duration: '4-5 min',
    durationMs: 270_000,
    icon: 'shield-outline',
    description: 'Structured box breathing, identity anchoring, and physical release for intense moments.',
  },
  {
    id: 'pre_meeting',
    label: 'Pre-Meeting Reset',
    subtitle: 'Performance stabilization',
    duration: '2-3 min',
    durationMs: 150_000,
    icon: 'briefcase-outline',
    description: 'Center yourself before high-stakes situations with breath, goal framing, and posture.',
  },
  {
    id: 'post_conflict',
    label: 'Post-Conflict Reset',
    subtitle: 'Emotional processing',
    duration: '4-6 min',
    durationMs: 300_000,
    icon: 'chatbubbles-outline',
    description: 'Label, locate, breathe, and separate fact from interpretation after a difficult encounter.',
  },
];

// ============================================================================
// EMOTIONAL TONE OPTIONS
// ============================================================================

export const EMOTIONAL_TONES: { id: EmotionalTone; label: string }[] = [
  { id: 'anxious', label: 'Anxious' },
  { id: 'overwhelmed', label: 'Overwhelmed' },
  { id: 'angry', label: 'Angry' },
  { id: 'panicked', label: 'Panicked' },
  { id: 'scattered', label: 'Scattered' },
  { id: 'tense', label: 'Tense' },
  { id: 'numb', label: 'Numb' },
  { id: 'sad', label: 'Sad' },
  { id: 'restless', label: 'Restless' },
];

// ============================================================================
// MODE RECOMMENDATION
// ============================================================================

/**
 * Recommend a grounding mode based on stress level and emotional tone.
 *
 * Logic:
 * - Panicked or stress 5 → Panic Interrupt (most directive)
 * - Stress 4 + anxious/overwhelmed/restless → 5-4-3-2-1 (sensory interrupt)
 * - Tense/scattered → Pre-Meeting Reset (structured)
 * - Angry/sad/numb → Post-Conflict (processing)
 * - Default / low stress → Quick Reset (fastest)
 */
export function recommendMode(
  stressLevel: StressLevel,
  emotionalTone: EmotionalTone | null
): GroundingMode {
  // Acute spike — directive intervention
  if (emotionalTone === 'panicked' || stressLevel === 5) {
    return 'panic_interrupt';
  }

  // High stress + rumination-type emotions → sensory interrupt
  if (stressLevel >= 4 && (emotionalTone === 'anxious' || emotionalTone === 'overwhelmed' || emotionalTone === 'restless')) {
    return 'sensory_anchor';
  }

  // Performance / cognitive load → structured reset
  if (emotionalTone === 'tense' || emotionalTone === 'scattered') {
    return 'pre_meeting';
  }

  // Aftermath / processing emotions
  if (emotionalTone === 'angry' || emotionalTone === 'sad' || emotionalTone === 'numb') {
    return 'post_conflict';
  }

  // Default: quickest path to calm
  return 'quick_reset';
}

// ============================================================================
// QUICK RESET STEPS
// ============================================================================

export const QUICK_RESET_STEPS = [
  {
    id: 'breathe',
    title: 'Breathe',
    instruction: 'Follow the rhythm',
    breathPattern: { inhale: 4, hold: 2, exhale: 6 },
    cycles: 3,
  },
  {
    id: 'anchor',
    title: 'Visual Anchor',
    instruction: 'Name 3 objects you can see right now',
    durationMs: 15_000,
  },
  {
    id: 'ground',
    title: 'Foot Pressure',
    instruction: 'Press your feet firmly into the floor and hold',
    durationMs: 10_000,
  },
] as const;

// ============================================================================
// SENSORY ANCHOR STEPS (5-4-3-2-1)
// ============================================================================

export const SENSORY_ANCHOR_STEPS = [
  { id: 'see', sense: 'See', count: 5, icon: 'eye-outline', prompt: 'Name 5 things you can see' },
  { id: 'touch', sense: 'Touch', count: 4, icon: 'hand-left-outline', prompt: 'Notice 4 things you can touch' },
  { id: 'hear', sense: 'Hear', count: 3, icon: 'ear-outline', prompt: 'Listen for 3 sounds' },
  { id: 'smell', sense: 'Smell', count: 2, icon: 'flower-outline', prompt: 'Notice 2 things you can smell' },
  { id: 'taste', sense: 'Taste', count: 1, icon: 'water-outline', prompt: 'Notice 1 thing you can taste' },
] as const;

// ============================================================================
// PANIC INTERRUPT STEPS
// ============================================================================

export const PANIC_INTERRUPT_STEPS = [
  {
    id: 'box_breathe',
    title: 'Box Breathing',
    instruction: 'Follow the square rhythm',
    breathPattern: { inhale: 4, hold: 4, exhale: 4, holdEmpty: 4 },
    cycles: 4,
  },
  {
    id: 'identity',
    title: 'Identity Anchor',
    prompts: [
      'Say your name',
      'What is today\'s date?',
      'Where are you right now?',
    ],
  },
  {
    id: 'release',
    title: 'Tension Release',
    instruction: 'Clench your fists tight for 5 seconds, then release',
    durationMs: 20_000,
    cycles: 3,
  },
] as const;

// ============================================================================
// PRE-MEETING STEPS
// ============================================================================

export const PRE_MEETING_STEPS = [
  {
    id: 'breathe',
    title: 'Breath Downshift',
    instruction: 'Three calm breaths',
    breathPattern: { inhale: 4, hold: 2, exhale: 6 },
    cycles: 3,
  },
  {
    id: 'goal',
    title: 'Goal',
    instruction: 'What is your goal for this?',
    inputType: 'text' as const,
  },
  {
    id: 'tone',
    title: 'Tone',
    instruction: 'How do you want to come across?',
    options: ['Calm', 'Confident', 'Open', 'Warm', 'Direct', 'Collaborative'],
  },
  {
    id: 'anchor',
    title: 'Anchor',
    instruction: 'Sit tall. Shoulders back. Feet flat.',
    anchorSentence: 'I am prepared and present.',
  },
] as const;

// ============================================================================
// POST-CONFLICT STEPS
// ============================================================================

export const POST_CONFLICT_EMOTIONS = [
  'Angry', 'Frustrated', 'Hurt', 'Anxious', 'Sad',
  'Disappointed', 'Confused', 'Ashamed', 'Overwhelmed', 'Numb',
] as const;

export const POST_CONFLICT_STEPS = [
  {
    id: 'label',
    title: 'Label It',
    instruction: 'What are you feeling right now?',
  },
  {
    id: 'locate',
    title: 'Locate It',
    instruction: 'Where do you feel this in your body?',
    bodyPrompts: ['Head', 'Chest', 'Stomach', 'Throat', 'Shoulders', 'Hands', 'Whole body'],
  },
  {
    id: 'breathe',
    title: 'Breathe Through It',
    instruction: 'Three slow breaths to release',
    breathPattern: { inhale: 4, hold: 2, exhale: 6 },
    cycles: 3,
  },
  {
    id: 'reframe',
    title: 'Fact vs Story',
    prompts: {
      fact: 'What actually happened? (just the facts)',
      story: 'What story am I telling myself about it?',
    },
  },
] as const;
