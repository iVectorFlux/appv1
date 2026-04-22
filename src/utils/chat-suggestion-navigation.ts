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
  /** Combined flow (extended + coherent + 4-7-8) */
  breath_regulation_flow: 'breath_regulation_flow',
  regulation_breathing: 'breath_regulation_flow',
  combined_breathing: 'breath_regulation_flow',
  calm_breathing: 'breath_regulation_flow',
  /** Model may still output these — route to the single combined session */
  four_seven_eight: 'breath_regulation_flow',
  breathing_478: 'breath_regulation_flow',
  coherent_breathing: 'breath_coherent',
  extended_exhale: 'breath_extended_exhale',
  bellows_breath: 'breath_regulation_flow',
  resonant_breathing: 'breath_coherent',
  breath_478: 'breath_regulation_flow',
  breath_coherent: 'breath_coherent',
  breath_extended_exhale: 'breath_extended_exhale',
  breath_bellows: 'breath_regulation_flow',
  breath_resonant: 'breath_regulation_flow',
  /** Legacy duplicate ids → original programs */
  breath_physiological_sigh: 'quick_reset',
  breath_box: 'box_breathing',
};

export function aiTechniqueToGroundingMode(technique: string): GroundingMode | null {
  const t = technique.trim();
  if (GROUNDING_MODES.some((m) => m.id === t)) return t as GroundingMode;
  return AI_TO_MODE[t] ?? null;
}

/** Where to return after grounding / learn flows opened from chat */
export type ChatReturnTarget = 'chat' | 'assist';
