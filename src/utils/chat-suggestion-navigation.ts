/**
 * Maps AI chat grounding option IDs (from /api/chat) to in-app GroundingMode values.
 */
import type { GroundingMode } from '@/types/grounding';

const AI_TO_MODE: Record<string, GroundingMode> = {
  physiological_sigh: 'quick_reset',
  quick_reset: 'quick_reset',
  box_breathing: 'box_breathing',
  body_scan: 'sensory_anchor',
  release: 'post_conflict',
};

export function aiTechniqueToGroundingMode(technique: string): GroundingMode | null {
  return AI_TO_MODE[technique] ?? null;
}

/** Where to return after grounding / learn flows opened from chat */
export type ChatReturnTarget = 'chat' | 'assist';
