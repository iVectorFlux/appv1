/**
 * Grounding Module Types
 *
 * Types for the 5 grounding modes, state detection,
 * and session tracking. Used by grounding components,
 * the entry screen, and recovery storage.
 */

// ============================================================================
// GROUNDING MODES
// ============================================================================

export type GroundingMode =
  | 'quick_reset'      // ~60s
  | 'sensory_anchor'   // 3-4 min
  | 'box_breathing'    // 4-5 min
  | 'pre_meeting'      // 2-3 min
  | 'post_conflict';   // 4-6 min

// ============================================================================
// STATE DETECTION
// ============================================================================

export type StressLevel = 1 | 2 | 3 | 4 | 5;

export type EmotionalTone =
  | 'anxious'
  | 'overwhelmed'
  | 'angry'
  | 'panicked'
  | 'scattered'
  | 'tense'
  | 'numb'
  | 'sad'
  | 'restless';

export interface GroundingState {
  stressLevel: StressLevel;
  emotionalTone: EmotionalTone | null;
}

// ============================================================================
// SESSION TRACKING
// ============================================================================

export interface GroundingSession {
  mode: GroundingMode;
  stressBefore: StressLevel;
  stressAfter: StressLevel | null;
  emotionalTone: EmotionalTone | null;
  completionPct: number;   // 0-100
  durationMs: number;
  startedAt: string;       // ISO string
  completedAt: string | null;
  /** User answered "Did it help?" — Yes (true) or Not really (false). Null if skipped. */
  helpful: boolean | null;
}

// ============================================================================
// MODE COMPONENT INTERFACE
// ============================================================================

export interface GroundingModeProps {
  stressLevel: StressLevel;
  emotionalTone: EmotionalTone | null;
  onComplete: (completionPct: number) => void;
  onExit: () => void;
}

// ============================================================================
// MODE CONFIG (used by grounding-content.ts)
// ============================================================================

export interface GroundingModeConfig {
  id: GroundingMode;
  label: string;
  subtitle: string;
  duration: string;        // human-readable e.g. "~1 min"
  durationMs: number;      // approximate ms for tracking
  icon: string;            // Ionicons name
  description: string;
  /** What it shifts: sympathetic dominance, rumination, identity, etc. */
  mechanism?: string;
}
