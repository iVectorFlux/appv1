/**
 * Grounding Module Content
 *
 * Framed by autonomic physiology:
 * - Sympathetic dominance → threat, urgency, mobilization
 * - Parasympathetic activation → safety, regulation, recovery
 * - Cognitive rumination → looping cortical activity
 * - Identity destabilization → panic fragmentation
 * - Performance stress → elevated arousal without danger
 * - Post-event processing → unresolved emotional load
 *
 * Each technique shifts one or more of these mechanisms.
 */

import type { GroundingModeConfig, EmotionalTone } from '@/types/grounding';
import { BREATH_TECHNIQUE_MODES } from '@/data/breathing-techniques';

// ============================================================================
// MODE CONFIGURATIONS
// ============================================================================

export const GROUNDING_MODES: GroundingModeConfig[] = [
  {
    id: 'quick_reset',
    label: 'Physiological Sigh',
    subtitle: 'Fast nervous-system reset',
    duration: '~1 min',
    durationMs: 60_000,
    icon: 'flash-outline',
    description: 'Reduces CO₂ imbalance and drives rapid vagal activation. Best for acute stress spikes. Works in under 60 seconds.',
    mechanism: 'Mild–moderate sympathetic activation; muscular tension',
  },
  {
    id: 'sensory_anchor',
    label: '5 4 3 2 1 Grounding',
    subtitle: 'Rumination → sensory brain',
    duration: '3-4 min',
    durationMs: 210_000,
    icon: 'hand-left-outline',
    description: 'Shifts from narrative brain to sensory brain. Interrupts the rumination loop and pulls attention from internal narrative.',
    mechanism: 'Cognitive rumination',
  },
  {
    id: 'box_breathing',
    label: 'Box Breathing',
    subtitle: 'Steady square rhythm',
    duration: '4-5 min',
    durationMs: 270_000,
    icon: 'shield-outline',
    description: 'Full protocol for high sympathetic surge and identity fragmentation: box breathing stabilizes rhythm, identity anchor restores orientation, tension release discharges muscular load. Physiological sigh alone is insufficient for full panic.',
    mechanism: 'High sympathetic surge; derealization risk; identity fragmentation; shallow breathing; cognitive narrowing',
  },
  {
    id: 'pre_meeting',
    label: 'Pre Meeting Reset',
    subtitle: 'Regulated activation before performance',
    duration: '2-3 min',
    durationMs: 150_000,
    icon: 'briefcase-outline',
    description: 'Downshifts arousal, aligns intention, sets tone and posture. Builds stable calm before high-stakes situations. Calm here means regulated activation, not absence of activation.',
    mechanism: 'Performance stress; elevated arousal without danger',
  },
  {
    id: 'post_conflict',
    label: 'Post Conflict Reset',
    subtitle: 'Emotion → language → reality check',
    duration: '4-6 min',
    durationMs: 300_000,
    icon: 'chatbubbles-outline',
    description: 'Labeling reduces amygdala activation; body localization increases interoceptive awareness; fact vs story breaks cognitive distortion. Converts emotion into structure and reality check.',
    mechanism: 'Post-event processing; unresolved emotional load; anger (mobilization + narrative justification)',
  },
  ...BREATH_TECHNIQUE_MODES,
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
// QUICK RESET STEPS
// ============================================================================

// Physiological sigh pattern (2 short inhales, long exhale)
export const PHYSIOLOGICAL_SIGH_PATTERN = {
  inhale: 4,
  sighInhale: 2,
  exhale: 6,
} as const;

export const QUICK_RESET_STEPS = [
  {
    id: 'breathe',
    title: 'Physiological Sigh',
    instruction: 'Two short inhales, then a long exhale',
    breathPattern: PHYSIOLOGICAL_SIGH_PATTERN,
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
// BOX BREATHING STEPS
// ============================================================================

export const BOX_BREATHING_STEPS = [
  {
    id: 'box_breathe',
    title: 'Box Breathing',
    instruction: 'Follow the square rhythm',
    breathPattern: { inhale: 4, hold: 4, exhale: 4, holdEmpty: 4 },
    cycles: 3,
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
