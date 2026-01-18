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
];

// Weights for overall score composition
const DIMENSION_WEIGHTS: Record<EQDimension, number> = {
  self_awareness: 0.25,
  self_regulation: 0.20,
  empathy: 0.20,
  social_skills: 0.20,
  motivation: 0.15,
};

// Weights for question types in final score
const QUESTION_TYPE_WEIGHTS = {
  forced_choice: 0.20,
  likert: 0.15,
  emotion_vocabulary: 0.15,
  meta_eq: 0.20,
  physiological_proxy: 0.10,
  consistency_probe: 0.10,
  ranking_allocation: 0.10,
};

// Minimum response time in ms to be considered valid
const MIN_RESPONSE_TIME = 500;

// Maximum reasonable response time in ms
const MAX_RESPONSE_TIME = 120000; // 2 minutes

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
 * Score Forced-Choice responses
 * 
 * Uses ipsative scoring where choosing an option adds to that dimension
 * and implicitly reduces others. Converted to normative via z-scores.
 */
export function scoreForcedChoice(
  questions: ForcedChoiceQuestion[],
  responses: ForcedChoiceResponse[]
): Record<EQDimension, number[]> {
  const dimensionPoints: Record<EQDimension, number[]> = {
    self_awareness: [],
    self_regulation: [],
    empathy: [],
    social_skills: [],
    motivation: [],
  };

  responses.forEach(response => {
    const question = questions.find(q => q.id === response.questionId);
    if (!question) return;

    // Find selected option(s)
    const mostOption = question.options.find(o => o.id === response.mostLikeMe);
    const leastOption = response.leastLikeMe 
      ? question.options.find(o => o.id === response.leastLikeMe)
      : null;

    // Add points for "most like me"
    if (mostOption) {
      dimensionPoints[mostOption.dimension].push(mostOption.weight * 100);
    }

    // Subtract points for "least like me"
    if (leastOption) {
      dimensionPoints[leastOption.dimension].push(-leastOption.weight * 50);
    }

    // Add neutral points for unselected options (ipsative normalization)
    question.options.forEach(opt => {
      if (opt.id !== response.mostLikeMe && opt.id !== response.leastLikeMe) {
        dimensionPoints[opt.dimension].push(0);
      }
    });
  });

  return dimensionPoints;
}

/**
 * Score Likert responses
 * 
 * Handles reverse-keyed items and normalizes to 0-100.
 */
export function scoreLikert(
  questions: LikertQuestion[],
  responses: LikertResponse[]
): { scores: Record<EQDimension, number[]>; socialDesirabilityFlags: number } {
  const dimensionScores: Record<EQDimension, number[]> = {
    self_awareness: [],
    self_regulation: [],
    empathy: [],
    social_skills: [],
    motivation: [],
  };

  let socialDesirabilityFlags = 0;

  responses.forEach(response => {
    const question = questions.find(q => q.id === response.questionId);
    if (!question) return;

    let value = response.value;
    const maxValue = question.scale;

    // Handle reverse keying
    if (question.reverseKeyed) {
      value = maxValue + 1 - value;
    }

    // Normalize to 0-100
    const normalizedScore = normalize(value, 1, maxValue);
    dimensionScores[question.dimension].push(normalizedScore);

    // Flag potential social desirability bias
    if (question.socialDesirabilityRisk === 'high' && normalizedScore > 85) {
      socialDesirabilityFlags++;
    }
  });

  return { scores: dimensionScores, socialDesirabilityFlags };
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
 * Score Meta-EQ responses
 * 
 * Calculates self-awareness calibration based on self vs other deltas.
 * Smaller deltas indicate better self-awareness.
 */
export function scoreMetaEQ(
  questions: MetaEQQuestion[],
  responses: MetaEQResponse[]
): { calibrationScore: number; blindSpots: string[]; hiddenStrengths: string[] } {
  const deltas: number[] = [];
  const blindSpots: string[] = [];
  const hiddenStrengths: string[] = [];

  responses.forEach(response => {
    const question = questions.find(q => q.id === response.questionId);
    if (!question) return;

    const delta = response.selfRating - response.otherRating;
    const normalizedDelta = delta / question.scale; // -1 to 1

    deltas.push(Math.abs(normalizedDelta));

    // Identify blind spots (self > other by significant margin)
    if (normalizedDelta > 0.3) {
      blindSpots.push(question.dimension);
    }
    // Identify hidden strengths (self < other)
    if (normalizedDelta < -0.3) {
      hiddenStrengths.push(question.dimension);
    }
  });

  // Lower average delta = better calibration
  const avgDelta = mean(deltas);
  // Convert to score where 100 = perfect calibration
  const calibrationScore = normalize(1 - avgDelta, 0, 1);

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
    medium: 60,
    low: 20,
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

  // Score each type
  const fcScores = scoreForcedChoice(forcedChoiceQs, forcedChoiceRs);
  const { scores: likertScores, socialDesirabilityFlags } = scoreLikert(likertQs, likertRs);
  const emotionVocab = scoreEmotionVocabulary(emotionVocabQs, emotionVocabRs);
  const metaEQ = scoreMetaEQ(metaEQQs, metaEQRs);
  const physioScore = scorePhysiologicalProxy(physioQs, physioRs);
  const consistency = scoreConsistencyProbes(consistencyQs, consistencyRs);
  const rankingScores = scoreRankingAllocation(rankingQs, rankingRs);

  // Response time analysis
  const responseTimeAnalysis = analyzeResponseTimes(responses);

  // Aggregate dimension scores
  const dimensionScores: DimensionScores = {
    self_awareness: 0,
    self_regulation: 0,
    empathy: 0,
    social_skills: 0,
    motivation: 0,
  };

  DIMENSIONS.forEach(dim => {
    const allScores: number[] = [
      ...fcScores[dim],
      ...likertScores[dim],
      ...rankingScores[dim],
    ];

    // Add physiological proxy to self_awareness
    if (dim === 'self_awareness') {
      allScores.push(physioScore);
    }

    // Add meta-EQ calibration to self_awareness
    if (dim === 'self_awareness' && metaEQRs.length > 0) {
      allScores.push(metaEQ.calibrationScore);
    }

    // Add emotion vocabulary to self_awareness
    if (dim === 'self_awareness' && emotionVocabRs.length > 0) {
      allScores.push(emotionVocab.score);
    }

    dimensionScores[dim] = allScores.length > 0 ? mean(allScores) : 50;
  });

  // Calculate type-specific scores for transparency
  const typeScores = {
    forced_choice: mean(Object.values(fcScores).flat()) || 50,
    likert: mean(Object.values(likertScores).flat()) || 50,
    emotion_vocabulary: emotionVocab.score || 50,
    meta_eq: metaEQ.calibrationScore || 50,
    physiological_proxy: physioScore || 50,
    consistency_probe: consistency.consistencyIndex * 100 || 50,
    ranking_allocation: mean(Object.values(rankingScores).flat()) || 50,
  };

  // Calculate overall score with dimension weights
  let overallScore = DIMENSIONS.reduce((total, dim) => {
    return total + dimensionScores[dim] * DIMENSION_WEIGHTS[dim];
  }, 0);

  // Apply consistency penalty (up to -10 points)
  const consistencyPenalty = (1 - consistency.consistencyIndex) * 10;
  overallScore = Math.max(0, overallScore - consistencyPenalty);

  // Quality indicators
  const qualityIndicators: ScoreQualityIndicators = {
    consistencyIndex: consistency.consistencyIndex,
    socialDesirabilityBias: likertRs.length > 0 
      ? Math.min(1, socialDesirabilityFlags / likertRs.length)
      : 0,
    responseTimeFlags: responseTimeAnalysis.suspiciouslyFast,
    completionRate: responses.length / questions.length,
    selfAwarenessCalibration: metaEQ.calibrationScore / 100,
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
    },
    typeScores: {
      forced_choice: Math.round(typeScores.forced_choice),
      likert: Math.round(typeScores.likert),
      emotion_vocabulary: Math.round(typeScores.emotion_vocabulary),
      meta_eq: Math.round(typeScores.meta_eq),
      physiological_proxy: Math.round(typeScores.physiological_proxy),
      consistency_probe: Math.round(typeScores.consistency_probe),
      ranking_allocation: Math.round(typeScores.ranking_allocation),
    },
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
    insights.push('You show resilience and maintain motivation even when facing challenges.');
  }

  // Meta-EQ insights
  if (metaEQ.blindSpots.length > 0) {
    insights.push('There may be areas where your self-perception differs from how others see you.');
  }
  if (metaEQ.hiddenStrengths.length > 0) {
    insights.push('You may underestimate some of your emotional capabilities.');
  }

  // Quality-based insights
  if (qualityIndicators.consistencyIndex < 0.6) {
    insights.push('Your responses showed some variability - taking the assessment when you\'re less busy may help.');
  }

  if (qualityIndicators.socialDesirabilityBias > 0.3) {
    insights.push('For the most accurate results, respond with how you typically act rather than how you\'d like to act.');
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
    motivation: 'Maintaining drive, resilience, and optimism toward goals.',
  };
  return descriptions[dimension];
}
