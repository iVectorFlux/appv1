/**
 * EQ Assessment Scoring Service
 * 
 * Comprehensive scoring system for all question types.
 * Implements psychometric best practices:
 * - Ipsative to normative conversion for forced-choice
 * - Reverse-key handling for Likert
 * - Consistency penalty calculation
 * - Social desirability bias detection
 * - Meta-EQ calibration scoring
 * 
 * All scores normalized to 0-100 scale.
 */

import type {
  EQDimension,
  EQQuestion,
  EQResponse,
  DimensionScores,
  ScoreQualityIndicators,
  EQAssessmentResult,
  ForcedChoiceQuestion,
  ForcedChoiceResponse,
  LikertQuestion,
  LikertResponse,
  EmotionVocabularyQuestion,
  EmotionVocabularyResponse,
  MetaEQQuestion,
  MetaEQResponse,
  PhysiologicalProxyQuestion,
  PhysiologicalProxyResponse,
  ConsistencyProbeQuestion,
  ConsistencyProbeResponse,
  RankingAllocationQuestion,
  RankingAllocationResponse,
  SJTDecisionQuestion,
  SJTDecisionResponse,
  EmotionPerceptionQuestion,
  EmotionPerceptionResponse,
  MetaEQOutput,
  LatentScoreLayers,
  RiskIndicators,
  ScoreWithCI,
} from '@/types/eq-assessment';

// =============================================================================
// CONSTANTS
// =============================================================================

const DIMENSIONS: EQDimension[] = [
  'self_awareness',
  'self_regulation',
  'empathy',
  'social_skills',
  'motivation',
  'resilience',
];

// Weights for overall score composition (sum = 1.0)
const DIMENSION_WEIGHTS: Record<EQDimension, number> = {
  self_awareness: 0.22,
  self_regulation: 0.18,
  empathy: 0.18,
  social_skills: 0.18,
  motivation: 0.14,
  resilience: 0.10,
};

// Weights for question types in dimension aggregation
const QUESTION_TYPE_WEIGHTS = {
  forced_choice: 0.18,
  likert: 0.14,
  emotion_vocabulary: 0.12,
  meta_eq: 0.18,
  physiological_proxy: 0.08,
  consistency_probe: 0.08,
  ranking_allocation: 0.08,
  sjt_decision: 0.10,
  emotion_perception: 0.08,
};

// Minimum response time in ms to be considered valid
const MIN_RESPONSE_TIME = 500;

// Likert: desirability bias attenuation (score *= 1 - bias*α)
const DESIRABILITY_ATTENUATION_ALPHA = 0.4;

// Meta-EQ: reward slight self-underrating (deltaScore = 1 - |δ| + β*max(0,-δ))
const META_EQ_UNDERRATING_BETA = 0.1;

// Emotion vocabulary split: 70% self-awareness, 15% self-regulation, 15% empathy
const EMOTION_VOCAB_SPLIT = { self_awareness: 0.7, self_regulation: 0.15, empathy: 0.15 } as const;

// Ranking: use reduced weight when merging into dimensions (profile shape, not raw magnitude)
const RANKING_DIMENSION_WEIGHT = 0.5;

// FC variance equalization: fcAdjusted = 50 + (fc - 50) * 0.85 (prevents FC over-asserting)
const FC_VARIANCE_EQUALIZATION = 0.85;

// Likert entropy: variance thresholds for random/straight-line detection (1-7 scale)
const LIKERT_VARIANCE_STRAIGHT_LINE = 0.5;   // too uniform
const LIKERT_VARIANCE_CHAOTIC = 3.5;          // too chaotic (max ~4 for 1-7)

// Self-awareness cap: cap SA score at 1.15 × mean(other dimensions)
const SELF_AWARENESS_CAP_MULTIPLIER = 1.15;

// =============================================================================
// CONSISTENCY PENALTY CONFIGURATION
// =============================================================================

/**
 * Consistency penalty settings
 * 
 * The consistency index measures how well paired questions match.
 * Low consistency can indicate:
 * - Rushed/careless responding
 * - Low self-insight
 * - Distraction during test
 * - Genuine confusion about self
 */
const CONSISTENCY_CONFIG = {
  // Maximum penalty that can be applied (in points, 0-100 scale)
  maxPenalty: 15,
  
  // Minimum consistency index below which results are flagged as unreliable
  unreliableThreshold: 0.40,
  
  // Consistency index above which no penalty is applied
  noPenaltyThreshold: 0.70,
  
  // Penalty calculation: penalty ∝ (1 - consistencyIndex)² (nonlinear: mild tolerance, punish collapse)
  penaltyMultiplier: 20,
};

/**
 * Calculate consistency penalty
 *
 * Squared deficit: penalty ∝ (1 - consistencyIndex)²
 * Small inconsistency ≈ noise; large inconsistency ≈ invalid data.
 */
function calculateConsistencyPenalty(consistencyIndex: number): {
  penalty: number;
  isUnreliable: boolean;
  penaltyLevel: 'none' | 'mild' | 'moderate' | 'severe';
} {
  const { maxPenalty, unreliableThreshold, noPenaltyThreshold, penaltyMultiplier } = CONSISTENCY_CONFIG;

  // No penalty for high consistency
  if (consistencyIndex >= noPenaltyThreshold) {
    return { penalty: 0, isUnreliable: false, penaltyLevel: 'none' };
  }

  // Squared deficit: penalty ∝ (deficit)²
  const consistencyDeficit = noPenaltyThreshold - consistencyIndex;
  const squaredDeficit = consistencyDeficit * consistencyDeficit;
  const rawPenalty = squaredDeficit * penaltyMultiplier;
  const penalty = Math.min(maxPenalty, rawPenalty);
  
  // Determine penalty level
  let penaltyLevel: 'none' | 'mild' | 'moderate' | 'severe';
  if (consistencyIndex >= 0.60) {
    penaltyLevel = 'mild';
  } else if (consistencyIndex >= unreliableThreshold) {
    penaltyLevel = 'moderate';
  } else {
    penaltyLevel = 'severe';
  }
  
  const isUnreliable = consistencyIndex < unreliableThreshold;
  
  return { penalty, isUnreliable, penaltyLevel };
}

// =============================================================================
// SCORING UTILITIES
// =============================================================================

/**
 * Normalize a value to 0-100 scale
 */
function normalize(value: number, min: number, max: number): number {
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

/**
 * Calculate mean of an array
 */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculate standard deviation
 */
function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
  return Math.sqrt(mean(squaredDiffs));
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `eq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// =============================================================================
// INDIVIDUAL QUESTION TYPE SCORING
// =============================================================================

/**
 * Compute min/max possible raw FC score per dimension from the form.
 * Max: sum over questions of (100 * weight) when dimension is chosen as "most".
 * Min: sum over questions of (-50 * weight) when dimension is chosen as "least".
 */
function forcedChoiceFormRange(questions: ForcedChoiceQuestion[]): Record<EQDimension, { min: number; max: number }> {
  const range: Record<EQDimension, { min: number; max: number }> = {
    self_awareness: { min: 0, max: 0 },
    self_regulation: { min: 0, max: 0 },
    empathy: { min: 0, max: 0 },
    social_skills: { min: 0, max: 0 },
    motivation: { min: 0, max: 0 },
    resilience: { min: 0, max: 0 },
  };
  questions.forEach(q => {
    q.options.forEach(opt => {
      range[opt.dimension].max += opt.weight * 100;
      range[opt.dimension].min -= opt.weight * 50;
    });
  });
  return range;
}

/**
 * Score Forced-Choice responses.
 *
 * Ipsative tradeoffs (most/least) are aggregated per dimension, then converted
 * to normative via form-range normalization: raw total → percentile within form
 * → rescale to 0–100. Returns one normalized score per dimension (not arrays).
 */
export function scoreForcedChoice(
  questions: ForcedChoiceQuestion[],
  responses: ForcedChoiceResponse[]
): Record<EQDimension, number[]> {
  const rawTotals: Record<EQDimension, number> = {
    self_awareness: 0,
    self_regulation: 0,
    empathy: 0,
    social_skills: 0,
    motivation: 0,
    resilience: 0,
  };

  responses.forEach(response => {
    const question = questions.find(q => q.id === response.questionId);
    if (!question) return;

    const mostOption = question.options.find(o => o.id === response.mostLikeMe);
    const leastOption = response.leastLikeMe
      ? question.options.find(o => o.id === response.leastLikeMe)
      : null;

    if (mostOption) rawTotals[mostOption.dimension] += mostOption.weight * 100;
    if (leastOption) rawTotals[leastOption.dimension] -= leastOption.weight * 50;
  });

  const formRange = forcedChoiceFormRange(questions);
  const dimensionPoints: Record<EQDimension, number[]> = {
    self_awareness: [],
    self_regulation: [],
    empathy: [],
    social_skills: [],
    motivation: [],
    resilience: [],
  };

  DIMENSIONS.forEach(dim => {
    const { min, max } = formRange[dim];
    const raw = rawTotals[dim];
    const span = max - min;
    const normative = span > 0 ? normalize(raw, min, max) : 50;
    dimensionPoints[dim].push(normative);
  });

  return dimensionPoints;
}

/**
 * Score Likert responses.
 *
 * Handles reverse-keyed items, normalizes to 0-100, and applies desirability
 * attenuation: adjustedScore = rawScore × (1 − desirabilityBias × α).
 */
export function scoreLikert(
  questions: LikertQuestion[],
  responses: LikertResponse[]
): { scores: Record<EQDimension, number[]>; socialDesirabilityFlags: number; impressionManagementIndex: number } {
  const dimensionScores: Record<EQDimension, number[]> = {
    self_awareness: [],
    self_regulation: [],
    empathy: [],
    social_skills: [],
    motivation: [],
    resilience: [],
  };

  const flagsPerDimension: Record<EQDimension, number> = {
    self_awareness: 0,
    self_regulation: 0,
    empathy: 0,
    social_skills: 0,
    motivation: 0,
    resilience: 0,
  };
  let socialDesirabilityFlags = 0;
  let impressionManagementEndorsements = 0;
  let impressionManagementItemCount = 0;

  responses.forEach(response => {
    const question = questions.find(q => q.id === response.questionId);
    if (!question) return;

    let value = response.value;
    const maxValue = question.scale;

    if (question.reverseKeyed) {
      value = maxValue + 1 - value;
    }

    const normalizedScore = normalize(value, 1, maxValue);
    if (question.socialDesirabilityRisk === 'high' && normalizedScore > 85) {
      socialDesirabilityFlags++;
      flagsPerDimension[question.dimension]++;
    }
    if (question.impressionManagementItem) {
      impressionManagementItemCount++;
      if (normalizedScore > 80) impressionManagementEndorsements++;
    }
    dimensionScores[question.dimension].push(normalizedScore);
  });

  // Apply desirability attenuation per dimension: score *= (1 - bias_dim * α)
  DIMENSIONS.forEach(dim => {
    const nDim = dimensionScores[dim].length;
    const biasDim = nDim > 0 ? Math.min(1, flagsPerDimension[dim] / nDim) : 0;
    const factor = 1 - biasDim * DESIRABILITY_ATTENUATION_ALPHA;
    dimensionScores[dim] = dimensionScores[dim].map(s => s * factor);
  });

  const impressionManagementIndex = impressionManagementItemCount > 0
    ? Math.min(1, impressionManagementEndorsements / impressionManagementItemCount)
    : 0;

  return { scores: dimensionScores, socialDesirabilityFlags, impressionManagementIndex };
}

/**
 * Score Emotion Vocabulary responses
 * 
 * Uses partial credit scoring for close answers.
 */
export function scoreEmotionVocabulary(
  questions: EmotionVocabularyQuestion[],
  responses: EmotionVocabularyResponse[]
): { score: number; correctCount: number; totalCount: number } {
  let totalCredit = 0;
  let correctCount = 0;

  responses.forEach(response => {
    const question = questions.find(q => q.id === response.questionId);
    if (!question) return;

    const selectedOption = question.options.find(o => o.id === response.selectedOptionId);
    if (selectedOption) {
      totalCredit += selectedOption.partialCredit;
      if (selectedOption.isCorrect) {
        correctCount++;
      }
    }
  });

  const maxCredit = responses.length; // Each question worth 1.0
  const score = responses.length > 0 ? normalize(totalCredit, 0, maxCredit) : 0;

  return { score, correctCount, totalCount: responses.length };
}

/**
 * Score Meta-EQ responses.
 *
 * Calibration: deltaScore = 1 - |δ| + β×max(0, -δ). Slight self-underrating
 * is rewarded (β ≈ 0.1); idealDelta ≠ 0.
 */
export function scoreMetaEQ(
  questions: MetaEQQuestion[],
  responses: MetaEQResponse[]
): { calibrationScore: number; blindSpots: string[]; hiddenStrengths: string[] } {
  const calibrationScores: number[] = [];
  const blindSpots: string[] = [];
  const hiddenStrengths: string[] = [];

  responses.forEach(response => {
    const question = questions.find(q => q.id === response.questionId);
    if (!question) return;

    const delta = response.selfRating - response.otherRating;
    const normalizedDelta = delta / question.scale; // -1 to 1

    const deltaScore = Math.min(1, 1 - Math.abs(normalizedDelta) + META_EQ_UNDERRATING_BETA * Math.max(0, -normalizedDelta));
    calibrationScores.push(deltaScore);

    if (normalizedDelta > 0.3) blindSpots.push(question.dimension);
    if (normalizedDelta < -0.3) hiddenStrengths.push(question.dimension);
  });

  const calibrationScore = calibrationScores.length > 0 ? mean(calibrationScores) * 100 : 50;
  return { calibrationScore, blindSpots, hiddenStrengths };
}

/**
 * Score Physiological Proxy responses
 * 
 * Higher interoceptive awareness = higher score.
 */
export function scorePhysiologicalProxy(
  questions: PhysiologicalProxyQuestion[],
  responses: PhysiologicalProxyResponse[]
): number {
  const awarenessLevels = {
    high: 100,
    medium: 70,
    low: 30,
  };

  let totalScore = 0;

  responses.forEach(response => {
    const question = questions.find(q => q.id === response.questionId);
    if (!question) return;

    const selectedOption = question.options.find(o => o.id === response.selectedOptionId);
    if (selectedOption) {
      totalScore += awarenessLevels[selectedOption.awarenessLevel];
    }
  });

  return responses.length > 0 ? totalScore / responses.length : 0;
}

/**
 * Score Consistency Probe responses
 * 
 * Calculates consistency index from paired items.
 */
export function scoreConsistencyProbes(
  questions: ConsistencyProbeQuestion[],
  responses: ConsistencyProbeResponse[]
): { consistencyIndex: number; inconsistentPairs: string[] } {
  const responseMap = new Map<string, number>();
  responses.forEach(r => responseMap.set(r.questionId, r.value));

  const inconsistentPairs: string[] = [];
  const consistencyScores: number[] = [];

  questions.forEach(question => {
    const thisValue = responseMap.get(question.id);
    const pairedValue = responseMap.get(question.pairedWithId);

    if (thisValue === undefined || pairedValue === undefined) return;

    // Skip if we've already processed this pair
    if (question.id > question.pairedWithId) return;

    const pairedQuestion = questions.find(q => q.id === question.pairedWithId);
    if (!pairedQuestion) return;

    // Calculate expected relationship
    const maxScale = question.scale;
    let expectedConsistency: number;

    if (question.expectedCorrelation === 'negative') {
      // Values should sum to approximately maxScale + 1
      const expectedSum = maxScale + 1;
      const actualSum = thisValue + pairedValue;
      const deviation = Math.abs(actualSum - expectedSum) / maxScale;
      expectedConsistency = 1 - deviation;
    } else {
      // Values should be similar
      const difference = Math.abs(thisValue - pairedValue) / maxScale;
      expectedConsistency = 1 - difference;
    }

    consistencyScores.push(expectedConsistency);

    // Flag inconsistent pairs (deviation > 0.5)
    if (expectedConsistency < 0.5) {
      inconsistentPairs.push(question.id);
    }
  });

  const consistencyIndex = mean(consistencyScores);

  return { consistencyIndex, inconsistentPairs };
}

/**
 * Score Ranking Allocation responses
 * 
 * Uses ipsative scoring - allocation reflects relative priority.
 */
export function scoreRankingAllocation(
  questions: RankingAllocationQuestion[],
  responses: RankingAllocationResponse[]
): Record<EQDimension, number[]> {
  const dimensionScores: Record<EQDimension, number[]> = {
    self_awareness: [],
    self_regulation: [],
    empathy: [],
    social_skills: [],
    motivation: [],
    resilience: [],
  };

  responses.forEach(response => {
    const question = questions.find(q => q.id === response.questionId);
    if (!question) return;

    question.options.forEach(option => {
      const allocation = response.allocations[option.id] || 0;
      // Normalize allocation to 0-100 based on total points
      const normalizedScore = (allocation / question.totalPoints) * 100;
      dimensionScores[option.dimension].push(normalizedScore);
    });
  });

  return dimensionScores;
}

/**
 * Score SJT Decision responses.
 * Weighted mean effectiveness per dimension (0–1 → 0–100).
 */
export function scoreSJTDecision(
  questions: SJTDecisionQuestion[],
  responses: SJTDecisionResponse[]
): { scoresByDimension: Record<EQDimension, number[]>; meanEffectiveness: number } {
  const scoresByDimension: Record<EQDimension, number[]> = {
    self_awareness: [],
    self_regulation: [],
    empathy: [],
    social_skills: [],
    motivation: [],
    resilience: [],
  };
  let totalEffectiveness = 0;

  responses.forEach(response => {
    const question = questions.find(q => q.id === response.questionId);
    if (!question) return;

    const selectedOption = question.options.find(o => o.id === response.selectedOptionId);
    if (selectedOption) {
      const effectiveness100 = selectedOption.effectiveness * 100;
      scoresByDimension[selectedOption.dimension].push(effectiveness100);
      totalEffectiveness += effectiveness100;
    }
  });

  const meanEffectiveness = responses.length > 0 ? totalEffectiveness / responses.length : 50;
  return { scoresByDimension, meanEffectiveness };
}

/**
 * Score Emotion Perception responses.
 * Partial credit; primary load on empathy, secondary on self_awareness.
 */
const EMOTION_PERCEPTION_SPLIT = { empathy: 0.70, self_awareness: 0.30 } as const;

export function scoreEmotionPerception(
  questions: EmotionPerceptionQuestion[],
  responses: EmotionPerceptionResponse[]
): { score: number; scoresByDimension: Partial<Record<EQDimension, number>> } {
  let totalCredit = 0;
  responses.forEach(response => {
    const question = questions.find(q => q.id === response.questionId);
    if (!question) return;
    const selectedOption = question.options.find(o => o.id === response.selectedOptionId);
    if (selectedOption) {
      const credit = selectedOption.partialCredit ?? (selectedOption.isCorrect ? 1 : 0);
      totalCredit += credit;
    }
  });
  const maxCredit = responses.length;
  const score = maxCredit > 0 ? normalize(totalCredit, 0, maxCredit) : 50;
  const scoresByDimension: Partial<Record<EQDimension, number>> = {};
  if (responses.length > 0) {
    scoresByDimension.empathy = score * EMOTION_PERCEPTION_SPLIT.empathy;
    scoresByDimension.self_awareness = score * EMOTION_PERCEPTION_SPLIT.self_awareness;
  }
  return { score, scoresByDimension };
}

// =============================================================================
// RESPONSE TIME ANALYSIS
// =============================================================================

/**
 * Analyze response times for quality indicators
 */
export function analyzeResponseTimes(responses: EQResponse[]): {
  suspiciouslyFast: number;
  averageTime: number;
  medianTime: number;
} {
  const times = responses.map(r => r.responseTimeMs);
  const suspiciouslyFast = times.filter(t => t < MIN_RESPONSE_TIME).length;
  const averageTime = mean(times);
  const sortedTimes = [...times].sort((a, b) => a - b);
  const medianTime = sortedTimes[Math.floor(sortedTimes.length / 2)] || 0;

  return { suspiciouslyFast, averageTime, medianTime };
}

// =============================================================================
// MAIN SCORING ENGINE
// =============================================================================

/**
 * Calculate complete EQ assessment result
 */
export function calculateEQScore(
  questions: EQQuestion[],
  responses: EQResponse[],
  userId: string,
  assessmentType: 'check_in' | 'full_test'
): EQAssessmentResult {
  // Separate questions and responses by type
  const forcedChoiceQs = questions.filter(q => q.type === 'forced_choice') as ForcedChoiceQuestion[];
  const forcedChoiceRs = responses.filter(r => r.type === 'forced_choice') as ForcedChoiceResponse[];

  const likertQs = questions.filter(q => q.type === 'likert') as LikertQuestion[];
  const likertRs = responses.filter(r => r.type === 'likert') as LikertResponse[];

  const emotionVocabQs = questions.filter(q => q.type === 'emotion_vocabulary') as EmotionVocabularyQuestion[];
  const emotionVocabRs = responses.filter(r => r.type === 'emotion_vocabulary') as EmotionVocabularyResponse[];

  const metaEQQs = questions.filter(q => q.type === 'meta_eq') as MetaEQQuestion[];
  const metaEQRs = responses.filter(r => r.type === 'meta_eq') as MetaEQResponse[];

  const physioQs = questions.filter(q => q.type === 'physiological_proxy') as PhysiologicalProxyQuestion[];
  const physioRs = responses.filter(r => r.type === 'physiological_proxy') as PhysiologicalProxyResponse[];

  const consistencyQs = questions.filter(q => q.type === 'consistency_probe') as ConsistencyProbeQuestion[];
  const consistencyRs = responses.filter(r => r.type === 'consistency_probe') as ConsistencyProbeResponse[];

  const rankingQs = questions.filter(q => q.type === 'ranking_allocation') as RankingAllocationQuestion[];
  const rankingRs = responses.filter(r => r.type === 'ranking_allocation') as RankingAllocationResponse[];

  const sjtQs = questions.filter(q => q.type === 'sjt_decision') as SJTDecisionQuestion[];
  const sjtRs = responses.filter(r => r.type === 'sjt_decision') as SJTDecisionResponse[];

  const emotionPerceptionQs = questions.filter(q => q.type === 'emotion_perception') as EmotionPerceptionQuestion[];
  const emotionPerceptionRs = responses.filter(r => r.type === 'emotion_perception') as EmotionPerceptionResponse[];

  // Exclude gate-only item (pp_gate) from physio score; use it only to gate contribution
  const physioQsScored = physioQs.filter(q => q.id !== 'pp_gate');
  const physioRsScored = physioRs.filter(r => r.questionId !== 'pp_gate');

  // Score each type
  const fcScores = scoreForcedChoice(forcedChoiceQs, forcedChoiceRs);
  const { scores: likertScores, socialDesirabilityFlags, impressionManagementIndex } = scoreLikert(likertQs, likertRs);
  const emotionVocab = scoreEmotionVocabulary(emotionVocabQs, emotionVocabRs);
  const metaEQ = scoreMetaEQ(metaEQQs, metaEQRs);
  const physioScore = scorePhysiologicalProxy(physioQsScored, physioRsScored);
  const consistency = scoreConsistencyProbes(consistencyQs, consistencyRs);
  const rankingScores = scoreRankingAllocation(rankingQs, rankingRs);
  const sjtResult = scoreSJTDecision(sjtQs, sjtRs);
  const emotionPerceptionResult = scoreEmotionPerception(emotionPerceptionQs, emotionPerceptionRs);

  // Response time analysis
  const responseTimeAnalysis = analyzeResponseTimes(responses);

  // Physio gated by emotion vocabulary (interpretive competence) and by regulation gate (pp_gate)
  const physioGateFromVocab = emotionVocabRs.length > 0 ? emotionVocab.score / 100 : 1;
  const ppGateResponse = physioRs.find(r => r.questionId === 'pp_gate');
  const physioGateFromRegulation = ppGateResponse
    ? (() => {
        const q = physioQs.find(qq => qq.id === 'pp_gate');
        const opt = q?.options.find(o => o.id === ppGateResponse.selectedOptionId);
        if (!opt) return 1;
        if (opt.awarenessLevel === 'high') return 1;
        if (opt.awarenessLevel === 'medium') return 0.7;
        return 0.3;
      })()
    : 1;
  const physioGate = physioGateFromVocab * physioGateFromRegulation;
  const gatedPhysioScore = physioScore * physioGate;

  // Emotion vocabulary split: 70% self_awareness, 15% self_regulation, 15% empathy
  const emotionVocabByDim: Partial<Record<EQDimension, number>> = {};
  if (emotionVocabRs.length > 0) {
    emotionVocabByDim.self_awareness = emotionVocab.score * EMOTION_VOCAB_SPLIT.self_awareness;
    emotionVocabByDim.self_regulation = emotionVocab.score * EMOTION_VOCAB_SPLIT.self_regulation;
    emotionVocabByDim.empathy = emotionVocab.score * EMOTION_VOCAB_SPLIT.empathy;
  }

  // Aggregate dimension scores with QUESTION_TYPE_WEIGHTS (type-weighted inputs)
  const dimensionScores: DimensionScores = {
    self_awareness: 0,
    self_regulation: 0,
    empathy: 0,
    social_skills: 0,
    motivation: 0,
    resilience: 0,
  };

  DIMENSIONS.forEach(dim => {
    const weightedSum: number[] = [];
    let weightSum = 0;

    if (fcScores[dim].length > 0) {
      fcScores[dim].forEach(s => {
        const fcAdjusted = 50 + (s - 50) * FC_VARIANCE_EQUALIZATION;
        weightedSum.push(fcAdjusted * QUESTION_TYPE_WEIGHTS.forced_choice);
        weightSum += QUESTION_TYPE_WEIGHTS.forced_choice;
      });
    }
    if (likertScores[dim].length > 0) {
      likertScores[dim].forEach(s => {
        weightedSum.push(s * QUESTION_TYPE_WEIGHTS.likert);
        weightSum += QUESTION_TYPE_WEIGHTS.likert;
      });
    }
    if (rankingScores[dim].length > 0) {
      rankingScores[dim].forEach(s => {
        weightedSum.push(s * QUESTION_TYPE_WEIGHTS.ranking_allocation * RANKING_DIMENSION_WEIGHT);
        weightSum += QUESTION_TYPE_WEIGHTS.ranking_allocation * RANKING_DIMENSION_WEIGHT;
      });
    }
    if (sjtResult.scoresByDimension[dim].length > 0) {
      sjtResult.scoresByDimension[dim].forEach(s => {
        weightedSum.push(s * QUESTION_TYPE_WEIGHTS.sjt_decision);
        weightSum += QUESTION_TYPE_WEIGHTS.sjt_decision;
      });
    }

    if (dim === 'self_awareness') {
      if (physioRs.length > 0) {
        weightedSum.push(gatedPhysioScore * QUESTION_TYPE_WEIGHTS.physiological_proxy);
        weightSum += QUESTION_TYPE_WEIGHTS.physiological_proxy;
      }
      if (metaEQRs.length > 0) {
        weightedSum.push(metaEQ.calibrationScore * QUESTION_TYPE_WEIGHTS.meta_eq);
        weightSum += QUESTION_TYPE_WEIGHTS.meta_eq;
      }
      if (emotionPerceptionResult.scoresByDimension.self_awareness !== undefined) {
        weightedSum.push(emotionPerceptionResult.scoresByDimension.self_awareness * QUESTION_TYPE_WEIGHTS.emotion_perception);
        weightSum += QUESTION_TYPE_WEIGHTS.emotion_perception;
      }
    }
    if (dim === 'empathy' && emotionPerceptionResult.scoresByDimension.empathy !== undefined) {
      weightedSum.push(emotionPerceptionResult.scoresByDimension.empathy * QUESTION_TYPE_WEIGHTS.emotion_perception);
      weightSum += QUESTION_TYPE_WEIGHTS.emotion_perception;
    }
    if (emotionVocabByDim[dim] !== undefined) {
      weightedSum.push(emotionVocabByDim[dim]! * QUESTION_TYPE_WEIGHTS.emotion_vocabulary);
      weightSum += QUESTION_TYPE_WEIGHTS.emotion_vocabulary;
    }

    dimensionScores[dim] = weightSum > 0
      ? weightedSum.reduce((a, b) => a + b, 0) / weightSum
      : 50;
  });

  // Cap self-awareness so it does not dominate (1.15 × mean of other dimensions)
  const otherDims: EQDimension[] = ['self_regulation', 'empathy', 'social_skills', 'motivation', 'resilience'];
  const otherMean = otherDims.reduce((s, d) => s + dimensionScores[d], 0) / 5;
  const saCap = otherMean * SELF_AWARENESS_CAP_MULTIPLIER;
  dimensionScores.self_awareness = Math.min(dimensionScores.self_awareness, saCap);

  // Type-specific scores for transparency
  const typeScores = {
    forced_choice: mean(Object.values(fcScores).flat()) || 50,
    likert: mean(Object.values(likertScores).flat()) || 50,
    emotion_vocabulary: emotionVocab.score || 50,
    meta_eq: metaEQ.calibrationScore || 50,
    physiological_proxy: physioScore || 50,
    consistency_probe: consistency.consistencyIndex * 100 || 50,
    ranking_allocation: mean(Object.values(rankingScores).flat()) || 50,
    sjt_decision: sjtResult.meanEffectiveness || 50,
    emotion_perception: emotionPerceptionResult.score || 50,
  };

  // Calculate overall score with dimension weights
  let overallScore = DIMENSIONS.reduce((total, dim) => {
    return total + dimensionScores[dim] * DIMENSION_WEIGHTS[dim];
  }, 0);

  // Apply consistency penalty with graduated system
  const consistencyResult = calculateConsistencyPenalty(consistency.consistencyIndex);
  overallScore = Math.max(0, overallScore - consistencyResult.penalty);

  // Likert entropy: detect straight-lining (too uniform) or random (too chaotic)
  let likertVarianceFlag: 'uniform' | 'chaotic' | null = null;
  if (likertRs.length >= 3) {
    const likertValues = likertRs.map(r => r.value);
    const likertVar = standardDeviation(likertValues) ** 2;
    if (likertVar < LIKERT_VARIANCE_STRAIGHT_LINE) likertVarianceFlag = 'uniform';
    else if (likertVar > LIKERT_VARIANCE_CHAOTIC) likertVarianceFlag = 'chaotic';
  }

  // Meta-EQ as parallel index (calibrationType from mean self-other delta)
  const meanSelfOtherDelta = metaEQRs.length > 0
    ? mean(metaEQRs.map(r => {
        const q = metaEQQs.find(qq => qq.id === r.questionId);
        if (!q) return 0;
        return (r.selfRating - r.otherRating) / q.scale;
      }))
    : 0;
  const calibrationType: 'over' | 'under' | 'accurate' =
    meanSelfOtherDelta > 0.15 ? 'over' : meanSelfOtherDelta < -0.15 ? 'under' : 'accurate';
  const metaEQOutput: MetaEQOutput = {
    metaEQScore: metaEQ.calibrationScore,
    calibrationType,
    blindSpots: metaEQ.blindSpots,
    hiddenStrengths: metaEQ.hiddenStrengths,
  };

  // Confidence intervals (approximate SEM: 100 * 5 / sqrt(n) for n items per dimension; 95% CI)
  const CONFIDENCE_LEVEL = 0.95;
  const approxSEM = (dimScore: number, n: number) => (n < 2 ? 8 : Math.min(10, 100 * 5 / Math.sqrt(n)));
  const dimensionScoresCI: Record<EQDimension, ScoreWithCI> = {} as Record<EQDimension, ScoreWithCI>;
  DIMENSIONS.forEach(dim => {
    const s = dimensionScores[dim];
    const n = [fcScores[dim], likertScores[dim], rankingScores[dim], sjtResult.scoresByDimension[dim]].reduce((sum, arr) => sum + arr.length, 0) || 1;
    const sem = approxSEM(s, n);
    const margin = 1.96 * sem; // 95% CI
    dimensionScoresCI[dim] = {
      score: s,
      lowerBound: Math.max(0, s - margin),
      upperBound: Math.min(100, s + margin),
      confidenceLevel: CONFIDENCE_LEVEL,
    };
  });

  // Latent score layers: trait (Likert+FC), ability (SJT+perception+vocab), behavioral (meta+consistency+time)
  const traitEQIndex = 0.5 * (typeScores.likert / 100) + 0.5 * (typeScores.forced_choice / 100);
  const abilityScores = [typeScores.sjt_decision, typeScores.emotion_perception, typeScores.emotion_vocabulary].filter(Boolean);
  const abilityEQIndex = abilityScores.length > 0 ? mean(abilityScores) / 100 : 0.5;
  const behavioralReadinessIndex = (
    (metaEQ.calibrationScore / 100) * 0.5 +
    (consistency.consistencyIndex) * 0.3 +
    (responseTimeAnalysis.suspiciouslyFast === 0 ? 1 : Math.max(0, 1 - responseTimeAnalysis.suspiciouslyFast / 10)) * 0.2
  );
  const latentLayers: LatentScoreLayers = {
    traitEQIndex: Math.round(traitEQIndex * 100),
    abilityEQIndex: Math.round(abilityEQIndex * 100),
    behavioralReadinessIndex: Math.round(behavioralReadinessIndex * 100),
  };

  // Development potential: meta-EQ + consistency + motivation + response effort (0-100)
  const developmentPotentialScore = Math.round(
    ((metaEQOutput.metaEQScore / 100) * 0.35 +
    consistency.consistencyIndex * 0.25 +
    (dimensionScores.motivation / 100) * 0.25 +
    (1 - Math.min(1, responseTimeAnalysis.suspiciouslyFast / 5)) * 0.15) * 100
  );

  // Risk indicators: burnout (low resilience + high interoception + low regulation), conflict (low regulation + low empathy)
  const burnoutRisk: 'low' | 'elevated' | 'high' =
    dimensionScores.resilience < 40 && gatedPhysioScore > 60 && dimensionScores.self_regulation < 45 ? 'high'
    : dimensionScores.resilience < 50 && dimensionScores.self_regulation < 50 ? 'elevated'
    : 'low';
  const conflictRisk: 'low' | 'elevated' | 'high' =
    dimensionScores.self_regulation < 40 && dimensionScores.empathy < 40 ? 'high'
    : dimensionScores.self_regulation < 50 && dimensionScores.empathy < 50 ? 'elevated'
    : 'low';
  const riskIndicators: RiskIndicators = { burnoutRisk, conflictRisk };

  // Quality indicators
  const qualityIndicators: ScoreQualityIndicators = {
    consistencyIndex: consistency.consistencyIndex,
    consistencyPenalty: consistencyResult.penalty,
    consistencyPenaltyLevel: consistencyResult.penaltyLevel,
    isUnreliable: consistencyResult.isUnreliable,
    socialDesirabilityBias: likertRs.length > 0
      ? Math.min(1, socialDesirabilityFlags / likertRs.length)
      : 0,
    responseTimeFlags: responseTimeAnalysis.suspiciouslyFast,
    completionRate: Math.min(1, responses.length / questions.length),
    selfAwarenessCalibration: metaEQ.calibrationScore / 100,
    likertVarianceFlag,
    impressionManagementIndex,
  };

  // Determine strengths and growth areas
  const sortedDimensions = DIMENSIONS.slice().sort(
    (a, b) => dimensionScores[b] - dimensionScores[a]
  );
  const strengths = sortedDimensions.slice(0, 2);
  const growthAreas = sortedDimensions.slice(-2).reverse();

  // Generate insights
  const insights = generateInsights(dimensionScores, qualityIndicators, metaEQ);

  return {
    id: generateId(),
    userId,
    assessmentType,
    completedAt: new Date().toISOString(),
    overallScore: Math.round(overallScore),
    dimensionScores: {
      self_awareness: Math.round(dimensionScores.self_awareness),
      self_regulation: Math.round(dimensionScores.self_regulation),
      empathy: Math.round(dimensionScores.empathy),
      social_skills: Math.round(dimensionScores.social_skills),
      motivation: Math.round(dimensionScores.motivation),
      resilience: Math.round(dimensionScores.resilience),
    },
    dimensionScoresCI,
    typeScores: {
      forced_choice: Math.round(typeScores.forced_choice),
      likert: Math.round(typeScores.likert),
      emotion_vocabulary: Math.round(typeScores.emotion_vocabulary),
      meta_eq: Math.round(typeScores.meta_eq),
      physiological_proxy: Math.round(typeScores.physiological_proxy),
      consistency_probe: Math.round(typeScores.consistency_probe),
      ranking_allocation: Math.round(typeScores.ranking_allocation),
      sjt_decision: Math.round(typeScores.sjt_decision),
      emotion_perception: Math.round(typeScores.emotion_perception),
    },
    metaEQOutput,
    latentLayers,
    developmentPotentialScore,
    riskIndicators,
    qualityIndicators,
    responses,
    questionIds: questions.map(q => q.id),
    strengths,
    growthAreas,
    insights,
  };
}

// =============================================================================
// INSIGHT GENERATION
// =============================================================================

/**
 * Generate human-readable insights from scores
 */
function generateInsights(
  dimensionScores: DimensionScores,
  qualityIndicators: ScoreQualityIndicators,
  metaEQ: { calibrationScore: number; blindSpots: string[]; hiddenStrengths: string[] }
): string[] {
  const insights: string[] = [];

  // Dimension-based insights
  if (dimensionScores.self_awareness >= 70) {
    insights.push('You demonstrate strong emotional self-awareness, recognizing your feelings as they arise.');
  } else if (dimensionScores.self_awareness < 40) {
    insights.push('Building awareness of your emotional states could help you respond more intentionally.');
  }

  if (dimensionScores.self_regulation >= 70) {
    insights.push('You show good ability to manage your emotional reactions and stay composed.');
  } else if (dimensionScores.self_regulation < 40) {
    insights.push('Practicing pause techniques could help you respond rather than react to emotions.');
  }

  if (dimensionScores.empathy >= 70) {
    insights.push('You have strong ability to understand and connect with others\' emotional experiences.');
  }

  if (dimensionScores.motivation >= 70) {
    insights.push('You maintain motivation and drive even when facing challenges.');
  }
  if (dimensionScores.resilience >= 70) {
    insights.push('You show strong resilience and recover well from setbacks and stress.');
  } else if (dimensionScores.resilience < 40) {
    insights.push('Building resilience can help you manage stress and bounce back from difficulties.');
  }

  // Meta-EQ insights
  if (metaEQ.blindSpots.length > 0) {
    insights.push('There may be areas where your self-perception differs from how others see you.');
  }
  if (metaEQ.hiddenStrengths.length > 0) {
    insights.push('You may underestimate some of your emotional capabilities.');
  }

  // Quality-based insights
  if (qualityIndicators.isUnreliable) {
    insights.push('⚠️ Your consistency score was very low (below 40%). These results may not accurately reflect your EQ. Consider retaking when you have more time to focus.');
  } else if (qualityIndicators.consistencyPenaltyLevel === 'moderate') {
    insights.push('Your responses showed moderate variability. Taking the assessment in a quieter setting may provide more accurate results.');
  } else if (qualityIndicators.consistencyPenaltyLevel === 'mild') {
    insights.push('Your responses showed some variability - taking the assessment when you\'re less busy may help.');
  }

  if (qualityIndicators.socialDesirabilityBias > 0.3) {
    insights.push('For the most accurate results, respond with how you typically act rather than how you\'d like to act.');
  }

  if (qualityIndicators.likertVarianceFlag === 'uniform') {
    insights.push('Your scale responses were very similar across items. Consider retaking and varying your answers to reflect real differences between situations.');
  } else if (qualityIndicators.likertVarianceFlag === 'chaotic') {
    insights.push('Your scale responses varied a lot. If you were unsure, consider retaking when you can focus and answer consistently.');
  }

  // Add penalty explanation if significant
  if (qualityIndicators.consistencyPenalty > 5) {
    insights.push(`Note: Your overall score was reduced by ${Math.round(qualityIndicators.consistencyPenalty)} points due to response inconsistency.`);
  }

  return insights;
}

// =============================================================================
// SCORE INTERPRETATION
// =============================================================================

export type ScoreLevel = 'developing' | 'emerging' | 'proficient' | 'strong' | 'exemplary';

export function getScoreLevel(score: number): ScoreLevel {
  if (score >= 80) return 'exemplary';
  if (score >= 65) return 'strong';
  if (score >= 50) return 'proficient';
  if (score >= 35) return 'emerging';
  return 'developing';
}

export function getScoreLevelDescription(level: ScoreLevel): string {
  const descriptions: Record<ScoreLevel, string> = {
    developing: 'This is an area with significant room for growth. Focus here first.',
    emerging: 'You\'re building foundational skills in this area.',
    proficient: 'You have solid capabilities here, with room for refinement.',
    strong: 'This is one of your stronger areas. Keep developing it.',
    exemplary: 'This is a core strength. Consider how to leverage it more.',
  };
  return descriptions[level];
}

export function getDimensionDescription(dimension: EQDimension): string {
  const descriptions: Record<EQDimension, string> = {
    self_awareness: 'Recognizing and understanding your own emotions, triggers, and patterns.',
    self_regulation: 'Managing emotions, controlling impulses, and adapting to situations.',
    empathy: 'Understanding others\' emotions and perspectives with compassion.',
    social_skills: 'Communicating effectively, resolving conflicts, and influencing positively.',
    motivation: 'Maintaining drive and optimism toward goals.',
    resilience: 'Recovering from setbacks, managing stress, and sustaining performance under pressure.',
  };
  return descriptions[dimension];
}
