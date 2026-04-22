/**
 * Maps AI chat grounding option IDs (from /api/chat) to in-app GroundingMode values.
 */
import type { GroundingMode } from '@/types/grounding';
import { GROUNDING_MODES } from '@/data/grounding-content';

const AI_TO_MODE: Record<string, GroundingMode> = {
  physiological_sigh: 'quick_reset',
  quick_reset: 'quick_reset',
  box_breathing: 'box_breathing',
  body_scan: 'sensory_anchor',
  release: 'post_conflict',
  four_seven_eight: 'breath_478',
  breathing_478: 'breath_478',
  coherent_breathing: 'breath_coherent',
  extended_exhale: 'breath_extended_exhale',
  bellows_breath: 'breath_bellows',
  resonant_breathing: 'breath_resonant',
  breath_physiological_sigh: 'breath_physiological_sigh',
  breath_box: 'breath_box',
};

export function aiTechniqueToGroundingMode(technique: string): GroundingMode | null {
  const t = technique.trim();
  if (GROUNDING_MODES.some((m) => m.id === t)) return t as GroundingMode;
  return AI_TO_MODE[t] ?? null;
}

/** Where to return after grounding / learn flows opened from chat */
export type ChatReturnTarget = 'chat' | 'assist';
