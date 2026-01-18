/**
 * EQ Assessment Type Definitions
 * 
 * Comprehensive typing for the multi-modal EQ assessment system.
 * Supports 7 question types with distinct scoring mechanisms.
 */

// =============================================================================
// EQ DIMENSIONS
// =============================================================================

/**
 * Core EQ dimensions measured by the assessment.
 * Based on established EQ frameworks (Goleman, Bar-On, Mayer-Salovey).
 */
export type EQDimension = 
  | 'self_awareness'      // Recognizing own emotions, triggers, patterns
  | 'self_regulation'     // Managing emotions, impulse control, adaptability
  | 'empathy'             // Understanding others' emotions, perspective-taking
  | 'social_skills'       // Communication, influence, conflict management
  | 'motivation';         // Drive, resilience, optimism

/**
 * Sub-facets for more granular measurement
 */
export type EQFacet = 
  // Self-Awareness facets
  | 'emotional_recognition'     // Identifying what you feel
  | 'emotional_granularity'     // Distinguishing similar emotions
  | 'trigger_awareness'         // Knowing what sets you off
  | 'self_accuracy'             // How well you know yourself
  | 'interoceptive_awareness'   // Body-emotion connection
  // Self-Regulation facets
  | 'impulse_control'           // Pausing before reacting
  | 'emotional_recovery'        // Bouncing back from setbacks
  | 'adaptability'              // Flexibility in response
  | 'stress_management'         // Handling pressure
  // Empathy facets
  | 'emotional_reading'         // Detecting others' emotions
  | 'perspective_taking'        // Seeing from others' view
  | 'compassionate_concern'     // Caring about others' wellbeing
  // Social Skills facets
  | 'communication_clarity'     // Expressing emotions effectively
  | 'conflict_navigation'       // Handling disagreements
  | 'influence'                 // Positive impact on others
  // Motivation facets
  | 'intrinsic_drive'           // Internal motivation
  | 'optimism'                  // Positive outlook
  | 'resilience';               // Recovery from setbacks

// =============================================================================
// QUESTION TYPES
// =============================================================================

export type QuestionType = 
  | 'forced_choice'             // Choose between equally positive options
  | 'likert'                    // Agreement scale (1-7)
  | 'emotion_vocabulary'        // Identify correct emotion
  | 'meta_eq'                   // Self vs predicted-other rating
  | 'physiological_proxy'       // Body awareness questions
  | 'consistency_probe'         // Paired items for reliability
  | 'ranking_allocation';       // Distribute points

// =============================================================================
// QUESTION STRUCTURES
// =============================================================================

interface BaseQuestion {
  id: string;
  type: QuestionType;
  dimension: EQDimension;
  facet?: EQFacet;
  difficulty: 'easy' | 'medium' | 'hard';
  version: number;  // For A/B testing and updates
}

/**
 * Forced-Choice: User picks most/least like them from options
 */
export interface ForcedChoiceQuestion extends BaseQuestion {
  type: 'forced_choice';
  prompt: string;
  options: {
    id: string;
    text: string;
    dimension: EQDimension;
    weight: number;  // Contribution to dimension score
  }[];
  selectMost: boolean;      // true = "most like you", false = "least like you"
  selectLeast?: boolean;    // If both, user picks most AND least
}

/**
 * Likert: Agreement scale with optional reverse keying
 */
export interface LikertQuestion extends BaseQuestion {
  type: 'likert';
  statement: string;
  scale: 5 | 7;
  reverseKeyed: boolean;    // true = disagreement is positive
  anchorLabels: {
    low: string;            // e.g., "Strongly Disagree"
    high: string;           // e.g., "Strongly Agree"
  };
  socialDesirabilityRisk: 'low' | 'medium' | 'high';
}

/**
 * Emotion Vocabulary: Identify the correct emotion
 */
export interface EmotionVocabularyQuestion extends BaseQuestion {
  type: 'emotion_vocabulary';
  scenario: string;         // Brief situational description
  options: {
    id: string;
    emotion: string;
    isCorrect: boolean;
    partialCredit: number;  // 0-1, for close answers
  }[];
}

/**
 * Meta-EQ: Self rating vs predicted-other rating
 */
export interface MetaEQQuestion extends BaseQuestion {
  type: 'meta_eq';
  selfStatement: string;    // "I stay composed under pressure"
  otherStatement: string;   // "Others would say I stay composed..."
  scale: 5 | 7;
  idealDelta: number;       // Expected difference for high self-awareness
}

/**
 * Physiological Proxy: Body awareness indicators
 */
export interface PhysiologicalProxyQuestion extends BaseQuestion {
  type: 'physiological_proxy';
  prompt: string;
  options: {
    id: string;
    text: string;
    awarenessLevel: 'high' | 'medium' | 'low';
    bodyArea?: string;
  }[];
}

/**
 * Consistency Probe: Paired items to detect reliability
 */
export interface ConsistencyProbeQuestion extends BaseQuestion {
  type: 'consistency_probe';
  statement: string;
  scale: 5 | 7;
  pairedWithId: string;     // ID of the item this is paired with
  expectedCorrelation: 'positive' | 'negative';  // Should match or inverse
}

/**
 * Ranking Allocation: Distribute points across options
 */
export interface RankingAllocationQuestion extends BaseQuestion {
  type: 'ranking_allocation';
  prompt: string;
  totalPoints: number;      // Usually 100
  options: {
    id: string;
    text: string;
    dimension: EQDimension;
  }[];
  minPerOption: number;     // Usually 0
  maxPerOption: number;     // Usually totalPoints
}

export type EQQuestion = 
  | ForcedChoiceQuestion 
  | LikertQuestion 
  | EmotionVocabularyQuestion 
  | MetaEQQuestion 
  | PhysiologicalProxyQuestion 
  | ConsistencyProbeQuestion 
  | RankingAllocationQuestion;

// =============================================================================
// RESPONSE STRUCTURES
// =============================================================================

export interface ForcedChoiceResponse {
  questionId: string;
  type: 'forced_choice';
  mostLikeMe: string;       // Option ID
  leastLikeMe?: string;     // Option ID (if applicable)
  responseTimeMs: number;
}

export interface LikertResponse {
  questionId: string;
  type: 'likert';
  value: number;            // 1-5 or 1-7
  responseTimeMs: number;
}

export interface EmotionVocabularyResponse {
  questionId: string;
  type: 'emotion_vocabulary';
  selectedOptionId: string;
  responseTimeMs: number;
}

export interface MetaEQResponse {
  questionId: string;
  type: 'meta_eq';
  selfRating: number;       // 1-5 or 1-7
  otherRating: number;      // 1-5 or 1-7
  responseTimeMs: number;
}

export interface PhysiologicalProxyResponse {
  questionId: string;
  type: 'physiological_proxy';
  selectedOptionId: string;
  responseTimeMs: number;
}

export interface ConsistencyProbeResponse {
  questionId: string;
  type: 'consistency_probe';
  value: number;            // 1-5 or 1-7
  responseTimeMs: number;
}

export interface RankingAllocationResponse {
  questionId: string;
  type: 'ranking_allocation';
  allocations: Record<string, number>;  // optionId -> points
  responseTimeMs: number;
}

export type EQResponse = 
  | ForcedChoiceResponse 
  | LikertResponse 
  | EmotionVocabularyResponse 
  | MetaEQResponse 
  | PhysiologicalProxyResponse 
  | ConsistencyProbeResponse 
  | RankingAllocationResponse;

// =============================================================================
// SCORING STRUCTURES
// =============================================================================

/**
 * Dimension scores (0-100 scale)
 */
export interface DimensionScores {
  self_awareness: number;
  self_regulation: number;
  empathy: number;
  social_skills: number;
  motivation: number;
}

/**
 * Quality indicators for score validity
 */
export interface ScoreQualityIndicators {
  consistencyIndex: number;           // 0-1, higher = more consistent
  socialDesirabilityBias: number;     // 0-1, higher = more inflation
  responseTimeFlags: number;          // Count of suspiciously fast responses
  completionRate: number;             // 0-1, questions answered / total
  selfAwarenessCalibration: number;   // 0-1, from meta-EQ deltas
}

/**
 * Complete assessment result
 */
export interface EQAssessmentResult {
  id: string;
  userId: string;
  assessmentType: 'check_in' | 'full_test';
  completedAt: string;
  
  // Core scores
  overallScore: number;               // 0-100 composite
  dimensionScores: DimensionScores;
  
  // Question type contributions
  typeScores: {
    forced_choice: number;
    likert: number;
    emotion_vocabulary: number;
    meta_eq: number;
    physiological_proxy: number;
    consistency_probe: number;
    ranking_allocation: number;
  };
  
  // Quality metrics
  qualityIndicators: ScoreQualityIndicators;
  
  // Raw data for research/debugging
  responses: EQResponse[];
  questionIds: string[];
  
  // Interpretation
  strengths: EQDimension[];           // Top 2 dimensions
  growthAreas: EQDimension[];         // Bottom 2 dimensions
  insights: string[];                 // Generated insights
}

// =============================================================================
// ASSESSMENT SESSION
// =============================================================================

export interface EQAssessmentSession {
  id: string;
  userId: string;
  type: 'check_in' | 'full_test';
  startedAt: string;
  questions: EQQuestion[];
  currentIndex: number;
  responses: EQResponse[];
  status: 'in_progress' | 'completed' | 'abandoned';
}

// =============================================================================
// CHECK-IN VS FULL TEST CONFIGURATION
// =============================================================================

export interface AssessmentConfig {
  type: 'check_in' | 'full_test';
  
  // Question counts per type
  questionCounts: {
    forced_choice: number;
    likert: number;
    emotion_vocabulary: number;
    meta_eq: number;
    physiological_proxy: number;
    consistency_probe: number;
    ranking_allocation: number;
  };
  
  // Timing
  estimatedMinutes: number;
  
  // Scoring adjustments
  minQuestionsForValidScore: number;
}

export const CHECK_IN_CONFIG: AssessmentConfig = {
  type: 'check_in',
  questionCounts: {
    forced_choice: 1,
    likert: 2,
    emotion_vocabulary: 1,
    meta_eq: 0,
    physiological_proxy: 1,
    consistency_probe: 0,
    ranking_allocation: 0,
  },
  estimatedMinutes: 2,
  minQuestionsForValidScore: 3,
};

export const FULL_TEST_CONFIG: AssessmentConfig = {
  type: 'full_test',
  questionCounts: {
    forced_choice: 10,
    likert: 15,
    emotion_vocabulary: 10,
    meta_eq: 8,
    physiological_proxy: 6,
    consistency_probe: 8,
    ranking_allocation: 4,
  },
  estimatedMinutes: 25,
  minQuestionsForValidScore: 40,
};
