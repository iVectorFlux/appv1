/**
 * EQ Assessment Question Bank
 * 
 * Comprehensive question collection for the EQ assessment system.
 * 10-20 questions per type, covering all EQ dimensions.
 * 
 * IMPORTANT: Questions are designed with psychometric principles:
 * - Forced-choice removes social desirability bias
 * - Likert includes reverse-keyed items
 * - Consistency probes detect unreliable responding
 * - Meta-EQ measures self-awareness calibration
 */

import type {
  ForcedChoiceQuestion,
  LikertQuestion,
  EmotionVocabularyQuestion,
  MetaEQQuestion,
  PhysiologicalProxyQuestion,
  ConsistencyProbeQuestion,
  RankingAllocationQuestion,
  SJTDecisionQuestion,
  EmotionPerceptionQuestion,
  EQQuestion,
} from '@/types/eq-assessment';

// =============================================================================
// 1. FORCED-CHOICE TRAIT TRADEOFFS (15 questions)
// =============================================================================

export const FORCED_CHOICE_QUESTIONS: ForcedChoiceQuestion[] = [
  {
    id: 'fc_001',
    type: 'forced_choice',
    dimension: 'self_awareness',
    difficulty: 'medium',
    version: 1,
    prompt: 'Which statement describes you better?',
    selectMost: true,
    options: [
      { id: 'a', text: 'I notice subtle emotional shifts in others before they say anything', dimension: 'empathy', weight: 1 },
      { id: 'b', text: 'I notice when tension is rising and slow my response', dimension: 'self_regulation', weight: 1 },
    ],
  },
  {
    id: 'fc_002',
    type: 'forced_choice',
    dimension: 'self_regulation',
    difficulty: 'medium',
    version: 1,
    prompt: 'Which is more characteristic of you?',
    selectMost: true,
    options: [
      { id: 'a', text: 'I can precisely name the emotions I\'m experiencing', dimension: 'self_awareness', weight: 1 },
      { id: 'b', text: 'I can adjust my approach based on how others are feeling', dimension: 'social_skills', weight: 1 },
    ],
  },
  {
    id: 'fc_003',
    type: 'forced_choice',
    dimension: 'empathy',
    difficulty: 'medium',
    version: 1,
    prompt: 'When facing a challenge, which applies more to you?',
    selectMost: true,
    options: [
      { id: 'a', text: 'I bounce back quickly from setbacks', dimension: 'motivation', weight: 1 },
      { id: 'b', text: 'I understand exactly what triggered my emotional response', dimension: 'self_awareness', weight: 1 },
    ],
  },
  {
    id: 'fc_004',
    type: 'forced_choice',
    dimension: 'social_skills',
    difficulty: 'hard',
    version: 1,
    prompt: 'In group settings, which describes you better?',
    selectMost: true,
    selectLeast: true,
    options: [
      { id: 'a', text: 'I pick up on tension between people even when it\'s unspoken', dimension: 'empathy', weight: 1 },
      { id: 'b', text: 'I name my emotions and check in with the other person before reacting', dimension: 'social_skills', weight: 1 },
      { id: 'c', text: 'I notice others\' frustration and adjust my tone and pace', dimension: 'self_regulation', weight: 1 },
      { id: 'd', text: 'I recognize when my mood is affecting my judgment', dimension: 'self_awareness', weight: 1 },
    ],
  },
  {
    id: 'fc_005',
    type: 'forced_choice',
    dimension: 'motivation',
    difficulty: 'medium',
    version: 1,
    prompt: 'Which sounds more like you?',
    selectMost: true,
    options: [
      { id: 'a', text: 'I find meaning and purpose even in routine tasks', dimension: 'motivation', weight: 1 },
      { id: 'b', text: 'I sense when someone needs space or support', dimension: 'empathy', weight: 1 },
    ],
  },
  {
    id: 'fc_006',
    type: 'forced_choice',
    dimension: 'self_awareness',
    difficulty: 'hard',
    version: 1,
    prompt: 'Choose the option that best fits you:',
    selectMost: true,
    selectLeast: true,
    options: [
      { id: 'a', text: 'I can describe my emotional state with nuance and precision', dimension: 'self_awareness', weight: 1 },
      { id: 'b', text: 'I maintain optimism even during difficult periods', dimension: 'motivation', weight: 1 },
      { id: 'c', text: 'I help others find common ground by clarifying what each person needs', dimension: 'social_skills', weight: 1 },
      { id: 'd', text: 'I pause and reflect before reacting emotionally', dimension: 'self_regulation', weight: 1 },
    ],
  },
  {
    id: 'fc_007',
    type: 'forced_choice',
    dimension: 'empathy',
    difficulty: 'medium',
    version: 1,
    prompt: 'Which ability is stronger in you?',
    selectMost: true,
    options: [
      { id: 'a', text: 'Seeing situations from others\' perspectives', dimension: 'empathy', weight: 1 },
      { id: 'b', text: 'Staying focused and driven toward my goals', dimension: 'motivation', weight: 1 },
    ],
  },
  {
    id: 'fc_008',
    type: 'forced_choice',
    dimension: 'self_regulation',
    difficulty: 'medium',
    version: 1,
    prompt: 'When stressed, which is more true of you?',
    selectMost: true,
    options: [
      { id: 'a', text: 'I quickly identify what\'s causing my stress', dimension: 'self_awareness', weight: 1 },
      { id: 'b', text: 'I use specific techniques to slow my reaction when stressed', dimension: 'self_regulation', weight: 1 },
    ],
  },
  {
    id: 'fc_009',
    type: 'forced_choice',
    dimension: 'social_skills',
    difficulty: 'hard',
    version: 1,
    prompt: 'In conversations, which best describes you?',
    selectMost: true,
    selectLeast: true,
    options: [
      { id: 'a', text: 'I notice micro-expressions that reveal how someone really feels', dimension: 'empathy', weight: 1 },
      { id: 'b', text: 'I state my needs and ask for what I need without blaming', dimension: 'social_skills', weight: 1 },
      { id: 'c', text: 'I recognize when I\'m projecting my feelings onto a situation', dimension: 'self_awareness', weight: 1 },
      { id: 'd', text: 'I notice when I\'m getting impatient and pause before responding', dimension: 'self_regulation', weight: 1 },
    ],
  },
  {
    id: 'fc_010',
    type: 'forced_choice',
    dimension: 'motivation',
    difficulty: 'medium',
    version: 1,
    prompt: 'Which describes you more accurately?',
    selectMost: true,
    options: [
      { id: 'a', text: 'I recover from disappointments faster than most people', dimension: 'motivation', weight: 1 },
      { id: 'b', text: 'I easily detect when someone is masking their true feelings', dimension: 'empathy', weight: 1 },
    ],
  },
  {
    id: 'fc_011',
    type: 'forced_choice',
    dimension: 'self_awareness',
    difficulty: 'medium',
    version: 1,
    prompt: 'Which statement resonates more with you?',
    selectMost: true,
    options: [
      { id: 'a', text: 'I know my emotional triggers and can prepare for them', dimension: 'self_awareness', weight: 1 },
      { id: 'b', text: 'I adjust how I communicate based on what motivates different people', dimension: 'social_skills', weight: 1 },
    ],
  },
  {
    id: 'fc_012',
    type: 'forced_choice',
    dimension: 'self_regulation',
    difficulty: 'hard',
    version: 1,
    prompt: 'Choose what fits you best and least:',
    selectMost: true,
    selectLeast: true,
    options: [
      { id: 'a', text: 'I adapt my emotional expression to different contexts', dimension: 'self_regulation', weight: 1 },
      { id: 'b', text: 'I understand the underlying reasons for my emotions', dimension: 'self_awareness', weight: 1 },
      { id: 'c', text: 'I adjust how I connect based on what the other person seems to need', dimension: 'social_skills', weight: 1 },
      { id: 'd', text: 'I genuinely feel what others are going through', dimension: 'empathy', weight: 1 },
    ],
  },
  {
    id: 'fc_013',
    type: 'forced_choice',
    dimension: 'empathy',
    difficulty: 'medium',
    version: 1,
    prompt: 'Which comes more naturally to you?',
    selectMost: true,
    options: [
      { id: 'a', text: 'Feeling compassion for people in difficult situations', dimension: 'empathy', weight: 1 },
      { id: 'b', text: 'Managing my emotions so they don\'t control my behavior', dimension: 'self_regulation', weight: 1 },
    ],
  },
  {
    id: 'fc_014',
    type: 'forced_choice',
    dimension: 'social_skills',
    difficulty: 'medium',
    version: 1,
    prompt: 'Which is a greater strength for you?',
    selectMost: true,
    options: [
      { id: 'a', text: 'Navigating complex social dynamics smoothly', dimension: 'social_skills', weight: 1 },
      { id: 'b', text: 'Maintaining enthusiasm and drive over long periods', dimension: 'motivation', weight: 1 },
    ],
  },
  {
    id: 'fc_015',
    type: 'forced_choice',
    dimension: 'motivation',
    difficulty: 'hard',
    version: 1,
    prompt: 'Select what describes you most and least:',
    selectMost: true,
    selectLeast: true,
    options: [
      { id: 'a', text: 'I persist toward goals despite obstacles and setbacks', dimension: 'motivation', weight: 1 },
      { id: 'b', text: 'I help others de-escalate by listening and reflecting back what they say', dimension: 'social_skills', weight: 1 },
      { id: 'c', text: 'I notice when my emotions are shifting before they peak', dimension: 'self_awareness', weight: 1 },
      { id: 'd', text: 'I can delay gratification for longer-term rewards', dimension: 'self_regulation', weight: 1 },
    ],
  },
];

// =============================================================================
// 2. LIKERT TRAIT STATEMENTS (20 questions)
// =============================================================================

export const LIKERT_QUESTIONS: LikertQuestion[] = [
  // Self-Awareness (4 items)
  {
    id: 'lk_001',
    type: 'likert',
    dimension: 'self_awareness',
    facet: 'emotional_recognition',
    difficulty: 'easy',
    version: 1,
    statement: 'I can accurately name what I\'m feeling in difficult moments.',
    scale: 7,
    reverseKeyed: false,
    anchorLabels: { low: 'Strongly Disagree', high: 'Strongly Agree' },
    socialDesirabilityRisk: 'medium',
  },
  {
    id: 'lk_002',
    type: 'likert',
    dimension: 'self_awareness',
    facet: 'trigger_awareness',
    difficulty: 'medium',
    version: 1,
    statement: 'I rarely understand what triggers my emotional reactions.',
    scale: 7,
    reverseKeyed: true,  // Reverse keyed
    anchorLabels: { low: 'Strongly Disagree', high: 'Strongly Agree' },
    socialDesirabilityRisk: 'low',
  },
  {
    id: 'lk_003',
    type: 'likert',
    dimension: 'self_awareness',
    facet: 'self_accuracy',
    difficulty: 'medium',
    version: 1,
    statement: 'I understand how my emotions tend to work over time.',
    scale: 7,
    reverseKeyed: false,
    anchorLabels: { low: 'Strongly Disagree', high: 'Strongly Agree' },
    socialDesirabilityRisk: 'medium',
  },
  {
    id: 'lk_004',
    type: 'likert',
    dimension: 'self_awareness',
    facet: 'interoceptive_awareness',
    difficulty: 'hard',
    version: 1,
    statement: 'I notice feelings in my body before I can name the emotion.',
    scale: 7,
    reverseKeyed: false,
    anchorLabels: { low: 'Strongly Disagree', high: 'Strongly Agree' },
    socialDesirabilityRisk: 'low',
  },
  // Self-Regulation (4 items)
  {
    id: 'lk_005',
    type: 'likert',
    dimension: 'self_regulation',
    facet: 'impulse_control',
    difficulty: 'easy',
    version: 1,
    statement: 'In heated moments, I usually pause before reacting.',
    scale: 7,
    reverseKeyed: false,
    anchorLabels: { low: 'Strongly Disagree', high: 'Strongly Agree' },
    socialDesirabilityRisk: 'high',
  },
  {
    id: 'lk_006',
    type: 'likert',
    dimension: 'self_regulation',
    facet: 'impulse_control',
    difficulty: 'medium',
    version: 1,
    statement: 'I often say things I later regret when I\'m upset.',
    scale: 7,
    reverseKeyed: true,  // Reverse keyed
    anchorLabels: { low: 'Strongly Disagree', high: 'Strongly Agree' },
    socialDesirabilityRisk: 'low',
  },
  {
    id: 'lk_007',
    type: 'likert',
    dimension: 'self_regulation',
    facet: 'emotional_recovery',
    difficulty: 'medium',
    version: 1,
    statement: 'I recover emotionally faster than I used to.',
    scale: 7,
    reverseKeyed: false,
    anchorLabels: { low: 'Strongly Disagree', high: 'Strongly Agree' },
    socialDesirabilityRisk: 'medium',
  },
  {
    id: 'lk_008',
    type: 'likert',
    dimension: 'self_regulation',
    facet: 'stress_management',
    difficulty: 'hard',
    version: 1,
    statement: 'When under pressure, I can change how I feel on purpose.',
    scale: 7,
    reverseKeyed: false,
    anchorLabels: { low: 'Strongly Disagree', high: 'Strongly Agree' },
    socialDesirabilityRisk: 'medium',
  },
  // Empathy (4 items)
  {
    id: 'lk_009',
    type: 'likert',
    dimension: 'empathy',
    facet: 'emotional_reading',
    difficulty: 'easy',
    version: 1,
    statement: 'I notice when others\' feelings change, even when they hide it.',
    scale: 7,
    reverseKeyed: false,
    anchorLabels: { low: 'Strongly Disagree', high: 'Strongly Agree' },
    socialDesirabilityRisk: 'medium',
  },
  {
    id: 'lk_010',
    type: 'likert',
    dimension: 'empathy',
    facet: 'perspective_taking',
    difficulty: 'medium',
    version: 1,
    statement: 'I find it hard to see things the way others see them.',
    scale: 7,
    reverseKeyed: true,  // Reverse keyed
    anchorLabels: { low: 'Strongly Disagree', high: 'Strongly Agree' },
    socialDesirabilityRisk: 'low',
  },
  {
    id: 'lk_011',
    type: 'likert',
    dimension: 'empathy',
    facet: 'compassionate_concern',
    difficulty: 'medium',
    version: 1,
    statement: 'When others struggle, I feel for them and want to help.',
    scale: 7,
    reverseKeyed: false,
    anchorLabels: { low: 'Strongly Disagree', high: 'Strongly Agree' },
    socialDesirabilityRisk: 'high',
  },
  {
    id: 'lk_012',
    type: 'likert',
    dimension: 'empathy',
    facet: 'emotional_reading',
    difficulty: 'hard',
    version: 1,
    statement: 'I can tell how people in a room feel as soon as I walk in.',
    scale: 7,
    reverseKeyed: false,
    anchorLabels: { low: 'Strongly Disagree', high: 'Strongly Agree' },
    socialDesirabilityRisk: 'medium',
  },
  // Social Skills (4 items)
  {
    id: 'lk_013',
    type: 'likert',
    dimension: 'social_skills',
    facet: 'communication_clarity',
    difficulty: 'easy',
    version: 1,
    statement: 'In difficult talks, I say how I feel clearly without making things worse.',
    scale: 7,
    reverseKeyed: false,
    anchorLabels: { low: 'Strongly Disagree', high: 'Strongly Agree' },
    socialDesirabilityRisk: 'high',
  },
  {
    id: 'lk_014',
    type: 'likert',
    dimension: 'social_skills',
    facet: 'conflict_navigation',
    difficulty: 'medium',
    version: 1,
    statement: 'I often avoid talking about feelings when it is hard.',
    scale: 7,
    reverseKeyed: true,  // Reverse keyed
    anchorLabels: { low: 'Strongly Disagree', high: 'Strongly Agree' },
    socialDesirabilityRisk: 'low',
  },
  {
    id: 'lk_015',
    type: 'likert',
    dimension: 'social_skills',
    facet: 'influence',
    difficulty: 'medium',
    version: 1,
    statement: 'In tense talks, I often help turn the mood in a better direction.',
    scale: 7,
    reverseKeyed: false,
    anchorLabels: { low: 'Strongly Disagree', high: 'Strongly Agree' },
    socialDesirabilityRisk: 'high',
  },
  {
    id: 'lk_016',
    type: 'likert',
    dimension: 'social_skills',
    facet: 'conflict_navigation',
    difficulty: 'hard',
    version: 1,
    statement: 'In tense talks, I usually help people find something they agree on.',
    scale: 7,
    reverseKeyed: false,
    anchorLabels: { low: 'Strongly Disagree', high: 'Strongly Agree' },
    socialDesirabilityRisk: 'high',
  },
  // Motivation (4 items)
  {
    id: 'lk_017',
    type: 'likert',
    dimension: 'motivation',
    facet: 'resilience',
    difficulty: 'easy',
    version: 1,
    statement: 'I bounce back quickly from disappointments.',
    scale: 7,
    reverseKeyed: false,
    anchorLabels: { low: 'Strongly Disagree', high: 'Strongly Agree' },
    socialDesirabilityRisk: 'medium',
  },
  {
    id: 'lk_018',
    type: 'likert',
    dimension: 'motivation',
    facet: 'optimism',
    difficulty: 'medium',
    version: 1,
    statement: 'I tend to focus on what could go wrong rather than what could go right.',
    scale: 7,
    reverseKeyed: true,  // Reverse keyed
    anchorLabels: { low: 'Strongly Disagree', high: 'Strongly Agree' },
    socialDesirabilityRisk: 'low',
  },
  {
    id: 'lk_019',
    type: 'likert',
    dimension: 'motivation',
    facet: 'intrinsic_drive',
    difficulty: 'medium',
    version: 1,
    statement: 'I find meaning and purpose in my daily activities.',
    scale: 7,
    reverseKeyed: false,
    anchorLabels: { low: 'Strongly Disagree', high: 'Strongly Agree' },
    socialDesirabilityRisk: 'medium',
  },
  {
    id: 'lk_020',
    type: 'likert',
    dimension: 'motivation',
    facet: 'resilience',
    difficulty: 'hard',
    version: 1,
    statement: 'Setbacks motivate me to try harder rather than give up.',
    scale: 7,
    reverseKeyed: false,
    anchorLabels: { low: 'Strongly Disagree', high: 'Strongly Agree' },
    socialDesirabilityRisk: 'high',
  },
  // Impression management items (improbable endorsements; used for validity index only)
  {
    id: 'lk_im_01',
    type: 'likert',
    dimension: 'self_awareness',
    difficulty: 'medium',
    version: 1,
    statement: 'I never feel jealous of others.',
    scale: 7,
    reverseKeyed: false,
    anchorLabels: { low: 'Strongly Disagree', high: 'Strongly Agree' },
    socialDesirabilityRisk: 'high',
    impressionManagementItem: true,
  },
  {
    id: 'lk_im_02',
    type: 'likert',
    dimension: 'self_regulation',
    difficulty: 'medium',
    version: 1,
    statement: 'I always stay calm in every situation.',
    scale: 7,
    reverseKeyed: false,
    anchorLabels: { low: 'Strongly Disagree', high: 'Strongly Agree' },
    socialDesirabilityRisk: 'high',
    impressionManagementItem: true,
  },
  {
    id: 'lk_im_03',
    type: 'likert',
    dimension: 'empathy',
    difficulty: 'medium',
    version: 1,
    statement: 'I have never misunderstood how someone else felt.',
    scale: 7,
    reverseKeyed: false,
    anchorLabels: { low: 'Strongly Disagree', high: 'Strongly Agree' },
    socialDesirabilityRisk: 'high',
    impressionManagementItem: true,
  },
  // Frequency-anchored items (~30% of Likert can use this for behavioral validity)
  {
    id: 'lk_021',
    type: 'likert',
    dimension: 'self_regulation',
    difficulty: 'medium',
    version: 1,
    statement: 'In the past 2 weeks, I have paused before reacting when I was upset.',
    scale: 7,
    reverseKeyed: false,
    anchorLabels: { low: 'Strongly Disagree', high: 'Strongly Agree' },
    socialDesirabilityRisk: 'medium',
    frequencyAnchor: 'past_2_weeks',
  },
  {
    id: 'lk_022',
    type: 'likert',
    dimension: 'empathy',
    difficulty: 'medium',
    version: 1,
    statement: 'In the past 2 weeks, I noticed when someone seemed stressed or down.',
    scale: 7,
    reverseKeyed: false,
    anchorLabels: { low: 'Strongly Disagree', high: 'Strongly Agree' },
    socialDesirabilityRisk: 'low',
    frequencyAnchor: 'past_2_weeks',
  },
];

// =============================================================================
// 3. EMOTION VOCABULARY & DIFFERENTIATION (15 questions)
// =============================================================================

export const EMOTION_VOCABULARY_QUESTIONS: EmotionVocabularyQuestion[] = [
  {
    id: 'ev_001',
    type: 'emotion_vocabulary',
    dimension: 'self_awareness',
    facet: 'emotional_granularity',
    difficulty: 'easy',
    version: 1,
    scenario: 'You are waiting for a test or review. You feel tense and worried.',
    options: [
      { id: 'a', emotion: 'Fear', isCorrect: false, partialCredit: 0.5 },
      { id: 'b', emotion: 'Anxiety', isCorrect: true, partialCredit: 1 },
      { id: 'c', emotion: 'Stress', isCorrect: false, partialCredit: 0.7 },
      { id: 'd', emotion: 'Excitement', isCorrect: false, partialCredit: 0.3 },
    ],
  },
  {
    id: 'ev_002',
    type: 'emotion_vocabulary',
    dimension: 'self_awareness',
    facet: 'emotional_granularity',
    difficulty: 'medium',
    version: 1,
    scenario: 'You want something that another person has.',
    options: [
      { id: 'a', emotion: 'Jealousy', isCorrect: false, partialCredit: 0.6 },
      { id: 'b', emotion: 'Envy', isCorrect: true, partialCredit: 1 },
      { id: 'c', emotion: 'Resentment', isCorrect: false, partialCredit: 0.4 },
      { id: 'd', emotion: 'Greed', isCorrect: false, partialCredit: 0.3 },
    ],
  },
  {
    id: 'ev_003',
    type: 'emotion_vocabulary',
    dimension: 'self_awareness',
    facet: 'emotional_granularity',
    difficulty: 'medium',
    version: 1,
    scenario: 'You did something that goes against your values. You feel bad about it.',
    options: [
      { id: 'a', emotion: 'Shame', isCorrect: false, partialCredit: 0.6 },
      { id: 'b', emotion: 'Guilt', isCorrect: true, partialCredit: 1 },
      { id: 'c', emotion: 'Regret', isCorrect: false, partialCredit: 0.7 },
      { id: 'd', emotion: 'Embarrassment', isCorrect: false, partialCredit: 0.3 },
    ],
  },
  {
    id: 'ev_004',
    type: 'emotion_vocabulary',
    dimension: 'self_awareness',
    facet: 'emotional_granularity',
    difficulty: 'hard',
    version: 1,
    scenario: 'You feel you are not good enough compared to what others expect of you.',
    options: [
      { id: 'a', emotion: 'Guilt', isCorrect: false, partialCredit: 0.4 },
      { id: 'b', emotion: 'Shame', isCorrect: true, partialCredit: 1 },
      { id: 'c', emotion: 'Not good enough', isCorrect: false, partialCredit: 0.8 },
      { id: 'd', emotion: 'Disappointment', isCorrect: false, partialCredit: 0.5 },
    ],
  },
  {
    id: 'ev_005',
    type: 'emotion_vocabulary',
    dimension: 'self_awareness',
    facet: 'emotional_granularity',
    difficulty: 'easy',
    version: 1,
    scenario: 'Someone is kind to you and you did not expect it. You feel a warm thankfulness.',
    options: [
      { id: 'a', emotion: 'Happiness', isCorrect: false, partialCredit: 0.5 },
      { id: 'b', emotion: 'Gratitude', isCorrect: true, partialCredit: 1 },
      { id: 'c', emotion: 'Relief', isCorrect: false, partialCredit: 0.3 },
      { id: 'd', emotion: 'Surprise', isCorrect: false, partialCredit: 0.4 },
    ],
  },
  {
    id: 'ev_006',
    type: 'emotion_vocabulary',
    dimension: 'self_awareness',
    facet: 'emotional_granularity',
    difficulty: 'medium',
    version: 1,
    scenario: 'Something unfair happened to you in the past. You still feel bitter about it.',
    options: [
      { id: 'a', emotion: 'Anger', isCorrect: false, partialCredit: 0.5 },
      { id: 'b', emotion: 'Resentment', isCorrect: true, partialCredit: 1 },
      { id: 'c', emotion: 'Frustration', isCorrect: false, partialCredit: 0.4 },
      { id: 'd', emotion: 'Upset that it was unfair', isCorrect: false, partialCredit: 0.7 },
    ],
  },
  {
    id: 'ev_007',
    type: 'emotion_vocabulary',
    dimension: 'self_awareness',
    facet: 'emotional_granularity',
    difficulty: 'hard',
    version: 1,
    scenario: 'Someone praises you in front of others. You feel good and awkward at the same time.',
    options: [
      { id: 'a', emotion: 'Pride', isCorrect: false, partialCredit: 0.5 },
      { id: 'b', emotion: 'Self-conscious', isCorrect: true, partialCredit: 1 },
      { id: 'c', emotion: 'Embarrassment', isCorrect: false, partialCredit: 0.7 },
      { id: 'd', emotion: 'Humble', isCorrect: false, partialCredit: 0.4 },
    ],
  },
  {
    id: 'ev_008',
    type: 'emotion_vocabulary',
    dimension: 'self_awareness',
    facet: 'emotional_granularity',
    difficulty: 'easy',
    version: 1,
    scenario: 'You are in a situation you dislike. You really want to leave.',
    options: [
      { id: 'a', emotion: 'Fear', isCorrect: false, partialCredit: 0.6 },
      { id: 'b', emotion: 'Anxiety', isCorrect: false, partialCredit: 0.5 },
      { id: 'c', emotion: 'Uncomfortable', isCorrect: false, partialCredit: 0.7 },
      { id: 'd', emotion: 'Wanting to get away', isCorrect: true, partialCredit: 1 },
    ],
  },
  {
    id: 'ev_009',
    type: 'emotion_vocabulary',
    dimension: 'self_awareness',
    facet: 'emotional_granularity',
    difficulty: 'medium',
    version: 1,
    scenario: 'Something bad happened to someone else. You feel pleased about it.',
    options: [
      { id: 'a', emotion: 'Satisfaction', isCorrect: false, partialCredit: 0.3 },
      { id: 'b', emotion: 'Pleased when others fail', isCorrect: true, partialCredit: 1 },
      { id: 'c', emotion: 'Proven right', isCorrect: false, partialCredit: 0.5 },
      { id: 'd', emotion: 'Glee', isCorrect: false, partialCredit: 0.4 },
    ],
  },
  {
    id: 'ev_010',
    type: 'emotion_vocabulary',
    dimension: 'self_awareness',
    facet: 'emotional_granularity',
    difficulty: 'hard',
    version: 1,
    scenario: 'You want something but you are also scared of it. You feel both at once.',
    options: [
      { id: 'a', emotion: 'Conflict', isCorrect: false, partialCredit: 0.4 },
      { id: 'b', emotion: 'Mixed feelings', isCorrect: true, partialCredit: 1 },
      { id: 'c', emotion: 'Confusion', isCorrect: false, partialCredit: 0.3 },
      { id: 'd', emotion: 'Hesitation', isCorrect: false, partialCredit: 0.5 },
    ],
  },
  {
    id: 'ev_011',
    type: 'emotion_vocabulary',
    dimension: 'self_awareness',
    facet: 'emotional_granularity',
    difficulty: 'easy',
    version: 1,
    scenario: 'You feel empty inside. Things you used to enjoy do not interest you anymore.',
    options: [
      { id: 'a', emotion: 'Sadness', isCorrect: false, partialCredit: 0.6 },
      { id: 'b', emotion: 'No interest in anything', isCorrect: true, partialCredit: 1 },
      { id: 'c', emotion: 'Boredom', isCorrect: false, partialCredit: 0.5 },
      { id: 'd', emotion: 'Tiredness', isCorrect: false, partialCredit: 0.4 },
    ],
  },
  {
    id: 'ev_012',
    type: 'emotion_vocabulary',
    dimension: 'self_awareness',
    facet: 'emotional_granularity',
    difficulty: 'medium',
    version: 1,
    scenario: 'You miss something from the past. You know you cannot have it back.',
    options: [
      { id: 'a', emotion: 'Sadness', isCorrect: false, partialCredit: 0.5 },
      { id: 'b', emotion: 'Nostalgia', isCorrect: true, partialCredit: 1 },
      { id: 'c', emotion: 'Grief', isCorrect: false, partialCredit: 0.6 },
      { id: 'd', emotion: 'Longing', isCorrect: false, partialCredit: 0.7 },
    ],
  },
  {
    id: 'ev_013',
    type: 'emotion_vocabulary',
    dimension: 'self_awareness',
    facet: 'emotional_granularity',
    difficulty: 'hard',
    version: 1,
    scenario: 'Too much is going on. You feel swamped and cannot keep up.',
    options: [
      { id: 'a', emotion: 'Anxiety', isCorrect: false, partialCredit: 0.6 },
      { id: 'b', emotion: 'Overwhelmed', isCorrect: true, partialCredit: 1 },
      { id: 'c', emotion: 'Stress', isCorrect: false, partialCredit: 0.5 },
      { id: 'd', emotion: 'Confusion', isCorrect: false, partialCredit: 0.4 },
    ],
  },
  {
    id: 'ev_014',
    type: 'emotion_vocabulary',
    dimension: 'self_awareness',
    facet: 'emotional_granularity',
    difficulty: 'medium',
    version: 1,
    scenario: 'Someone broke a rule that everyone knows but no one talks about. You feel annoyed.',
    options: [
      { id: 'a', emotion: 'Anger', isCorrect: false, partialCredit: 0.4 },
      { id: 'b', emotion: 'Irritation', isCorrect: false, partialCredit: 0.7 },
      { id: 'c', emotion: 'Upset that it was wrong', isCorrect: true, partialCredit: 1 },
      { id: 'd', emotion: 'Disgust', isCorrect: false, partialCredit: 0.5 },
    ],
  },
  {
    id: 'ev_015',
    type: 'emotion_vocabulary',
    dimension: 'self_awareness',
    facet: 'emotional_granularity',
    difficulty: 'hard',
    version: 1,
    scenario: 'You feel deeply connected to something much bigger than you.',
    options: [
      { id: 'a', emotion: 'Happiness', isCorrect: false, partialCredit: 0.3 },
      { id: 'b', emotion: 'Peace', isCorrect: false, partialCredit: 0.5 },
      { id: 'c', emotion: 'Awe', isCorrect: true, partialCredit: 1 },
      { id: 'd', emotion: 'Deep connection', isCorrect: false, partialCredit: 0.8 },
    ],
  },
];

// =============================================================================
// 4. META-EQ (Self vs Other) (12 questions)
// =============================================================================

export const META_EQ_QUESTIONS: MetaEQQuestion[] = [
  {
    id: 'me_001',
    type: 'meta_eq',
    dimension: 'self_awareness',
    facet: 'self_accuracy',
    difficulty: 'medium',
    version: 1,
    selfStatement: 'I stay composed under pressure.',
    otherStatement: 'People who know me well would say I stay composed under pressure.',
    scale: 7,
    idealDelta: 0,
  },
  {
    id: 'me_002',
    type: 'meta_eq',
    dimension: 'empathy',
    facet: 'emotional_reading',
    difficulty: 'medium',
    version: 1,
    selfStatement: 'I am good at reading people\'s emotions.',
    otherStatement: 'Others would say I am good at reading their emotions.',
    scale: 7,
    idealDelta: 0,
  },
  {
    id: 'me_003',
    type: 'meta_eq',
    dimension: 'social_skills',
    facet: 'communication_clarity',
    difficulty: 'medium',
    version: 1,
    selfStatement: 'I communicate my feelings clearly.',
    otherStatement: 'People I\'m close to would say I communicate my feelings clearly.',
    scale: 7,
    idealDelta: 0,
  },
  {
    id: 'me_004',
    type: 'meta_eq',
    dimension: 'self_regulation',
    facet: 'impulse_control',
    difficulty: 'hard',
    version: 1,
    selfStatement: 'I think before I react emotionally.',
    otherStatement: 'Others would say I think before I react emotionally.',
    scale: 7,
    idealDelta: 0,
  },
  {
    id: 'me_005',
    type: 'meta_eq',
    dimension: 'empathy',
    facet: 'compassionate_concern',
    difficulty: 'medium',
    version: 1,
    selfStatement: 'I am a caring and supportive person.',
    otherStatement: 'People who know me would describe me as caring and supportive.',
    scale: 7,
    idealDelta: 0,
  },
  {
    id: 'me_006',
    type: 'meta_eq',
    dimension: 'social_skills',
    facet: 'conflict_navigation',
    difficulty: 'hard',
    version: 1,
    selfStatement: 'I handle conflict well.',
    otherStatement: 'Others would say I handle conflict well.',
    scale: 7,
    idealDelta: 0,
  },
  {
    id: 'me_007',
    type: 'meta_eq',
    dimension: 'self_awareness',
    facet: 'emotional_recognition',
    difficulty: 'medium',
    version: 1,
    selfStatement: 'I am in touch with my emotions.',
    otherStatement: 'People close to me would say I am in touch with my emotions.',
    scale: 7,
    idealDelta: 0,
  },
  {
    id: 'me_008',
    type: 'meta_eq',
    dimension: 'motivation',
    facet: 'optimism',
    difficulty: 'medium',
    version: 1,
    selfStatement: 'I maintain a positive outlook.',
    otherStatement: 'Others would describe me as having a positive outlook.',
    scale: 7,
    idealDelta: 0,
  },
  {
    id: 'me_009',
    type: 'meta_eq',
    dimension: 'self_regulation',
    facet: 'stress_management',
    difficulty: 'hard',
    version: 1,
    selfStatement: 'I manage stress effectively.',
    otherStatement: 'People who see me under stress would say I manage it effectively.',
    scale: 7,
    idealDelta: 0,
  },
  {
    id: 'me_010',
    type: 'meta_eq',
    dimension: 'social_skills',
    facet: 'influence',
    difficulty: 'medium',
    version: 1,
    selfStatement: 'I am good at motivating others.',
    otherStatement: 'Others would say I am good at motivating them.',
    scale: 7,
    idealDelta: 0,
  },
  {
    id: 'me_011',
    type: 'meta_eq',
    dimension: 'empathy',
    facet: 'perspective_taking',
    difficulty: 'medium',
    version: 1,
    selfStatement: 'I understand other people\'s perspectives.',
    otherStatement: 'People would say I really understand their perspective.',
    scale: 7,
    idealDelta: 0,
  },
  {
    id: 'me_012',
    type: 'meta_eq',
    dimension: 'motivation',
    facet: 'resilience',
    difficulty: 'medium',
    version: 1,
    selfStatement: 'I recover quickly from setbacks.',
    otherStatement: 'People who\'ve seen me face setbacks would say I recover quickly.',
    scale: 7,
    idealDelta: 0,
  },
  // Asymmetric: self = internal, other = behavioral (regulation vs impression management)
  {
    id: 'me_013',
    type: 'meta_eq',
    dimension: 'self_regulation',
    facet: 'impulse_control',
    difficulty: 'medium',
    version: 1,
    selfStatement: 'I feel calm under pressure.',
    otherStatement: 'I appear calm under pressure.',
    scale: 7,
    idealDelta: 0,
  },
  {
    id: 'me_014',
    type: 'meta_eq',
    dimension: 'empathy',
    facet: 'compassionate_concern',
    difficulty: 'medium',
    version: 1,
    selfStatement: 'I feel moved by others\' struggles.',
    otherStatement: 'I show care when others are struggling.',
    scale: 7,
    idealDelta: 0,
  },
  {
    id: 'me_015',
    type: 'meta_eq',
    dimension: 'self_regulation',
    facet: 'stress_management',
    difficulty: 'hard',
    version: 1,
    selfStatement: 'I feel in control of my reactions when stressed.',
    otherStatement: 'I come across as controlled in my reactions when stressed.',
    scale: 7,
    idealDelta: 0,
  },
  // Asymmetric: self = internal, other = behavioral (2 more for calibration resolution)
  {
    id: 'me_016',
    type: 'meta_eq',
    dimension: 'empathy',
    facet: 'emotional_reading',
    difficulty: 'medium',
    version: 1,
    selfStatement: 'I feel attuned to others\' emotional states.',
    otherStatement: 'I respond in ways that show I notice others\' emotions.',
    scale: 7,
    idealDelta: 0,
  },
  {
    id: 'me_017',
    type: 'meta_eq',
    dimension: 'motivation',
    facet: 'intrinsic_drive',
    difficulty: 'medium',
    version: 1,
    selfStatement: 'I feel motivated even when progress is slow.',
    otherStatement: 'I keep showing up and taking steps toward goals.',
    scale: 7,
    idealDelta: 0,
  },
];

// =============================================================================
// 5. PHYSIOLOGICAL PROXY QUESTIONS (10 questions)
// =============================================================================

export const PHYSIOLOGICAL_PROXY_QUESTIONS: PhysiologicalProxyQuestion[] = [
  {
    id: 'pp_001',
    type: 'physiological_proxy',
    dimension: 'self_awareness',
    facet: 'interoceptive_awareness',
    difficulty: 'easy',
    version: 1,
    prompt: 'When I\'m stressed, I usually notice it first in:',
    options: [
      { id: 'a', text: 'My breathing (shallow, fast, or held)', awarenessLevel: 'high', bodyArea: 'respiratory' },
      { id: 'b', text: 'My muscles (tense shoulders, clenched jaw)', awarenessLevel: 'high', bodyArea: 'muscular' },
      { id: 'c', text: 'My thoughts (racing, negative, scattered)', awarenessLevel: 'medium' },
      { id: 'd', text: 'I don\'t usually notice until later', awarenessLevel: 'low' },
    ],
  },
  {
    id: 'pp_002',
    type: 'physiological_proxy',
    dimension: 'self_awareness',
    facet: 'interoceptive_awareness',
    difficulty: 'medium',
    version: 1,
    prompt: 'When I\'m anxious, my body typically:',
    options: [
      { id: 'a', text: 'Gets restless - I need to move or fidget', awarenessLevel: 'high', bodyArea: 'motor' },
      { id: 'b', text: 'Feels heavy or frozen', awarenessLevel: 'high', bodyArea: 'muscular' },
      { id: 'c', text: 'I notice my heart rate changing', awarenessLevel: 'high', bodyArea: 'cardiovascular' },
      { id: 'd', text: 'I don\'t notice specific body sensations', awarenessLevel: 'low' },
    ],
  },
  {
    id: 'pp_003',
    type: 'physiological_proxy',
    dimension: 'self_awareness',
    facet: 'interoceptive_awareness',
    difficulty: 'medium',
    version: 1,
    prompt: 'When I\'m excited or happy:',
    options: [
      { id: 'a', text: 'I feel energy in my chest or stomach', awarenessLevel: 'high', bodyArea: 'core' },
      { id: 'b', text: 'I notice myself smiling or laughing more', awarenessLevel: 'medium', bodyArea: 'facial' },
      { id: 'c', text: 'I want to talk more or be around people', awarenessLevel: 'medium' },
      { id: 'd', text: 'I just know I\'m happy without specific sensations', awarenessLevel: 'low' },
    ],
  },
  {
    id: 'pp_004',
    type: 'physiological_proxy',
    dimension: 'self_awareness',
    facet: 'interoceptive_awareness',
    difficulty: 'hard',
    version: 1,
    prompt: 'I can tell the difference between hunger and emotional eating:',
    options: [
      { id: 'a', text: 'Always - they feel very different in my body', awarenessLevel: 'high' },
      { id: 'b', text: 'Usually - I can distinguish if I pay attention', awarenessLevel: 'medium' },
      { id: 'c', text: 'Sometimes - it\'s often unclear', awarenessLevel: 'low' },
      { id: 'd', text: 'Rarely - they feel the same to me', awarenessLevel: 'low' },
    ],
  },
  {
    id: 'pp_005',
    type: 'physiological_proxy',
    dimension: 'self_awareness',
    facet: 'interoceptive_awareness',
    difficulty: 'easy',
    version: 1,
    prompt: 'When I\'m angry:',
    options: [
      { id: 'a', text: 'I feel heat rising, especially in my face or chest', awarenessLevel: 'high', bodyArea: 'thermal' },
      { id: 'b', text: 'My muscles tense up, especially in my hands or jaw', awarenessLevel: 'high', bodyArea: 'muscular' },
      { id: 'c', text: 'I notice my voice or behavior changing', awarenessLevel: 'medium' },
      { id: 'd', text: 'I usually realize I was angry after the fact', awarenessLevel: 'low' },
    ],
  },
  {
    id: 'pp_006',
    type: 'physiological_proxy',
    dimension: 'self_awareness',
    facet: 'interoceptive_awareness',
    difficulty: 'medium',
    version: 1,
    prompt: 'When I\'m sad:',
    options: [
      { id: 'a', text: 'I feel a heaviness in my chest or throat', awarenessLevel: 'high', bodyArea: 'core' },
      { id: 'b', text: 'My body feels tired or drained', awarenessLevel: 'medium', bodyArea: 'general' },
      { id: 'c', text: 'I notice tears or tightness in my eyes', awarenessLevel: 'high', bodyArea: 'facial' },
      { id: 'd', text: 'I mainly notice through my thoughts, not body', awarenessLevel: 'low' },
    ],
  },
  {
    id: 'pp_007',
    type: 'physiological_proxy',
    dimension: 'self_awareness',
    facet: 'interoceptive_awareness',
    difficulty: 'hard',
    version: 1,
    prompt: 'How often do you notice subtle body sensations throughout the day?',
    options: [
      { id: 'a', text: 'Frequently - I\'m often aware of what my body is telling me', awarenessLevel: 'high' },
      { id: 'b', text: 'Sometimes - especially when sensations are strong', awarenessLevel: 'medium' },
      { id: 'c', text: 'Rarely - only when something is very wrong', awarenessLevel: 'low' },
      { id: 'd', text: 'Almost never - I\'m usually in my head', awarenessLevel: 'low' },
    ],
  },
  {
    id: 'pp_008',
    type: 'physiological_proxy',
    dimension: 'self_awareness',
    facet: 'interoceptive_awareness',
    difficulty: 'medium',
    version: 1,
    prompt: 'When feeling nervous before an important event:',
    options: [
      { id: 'a', text: 'I notice specific sensations (butterflies, sweating, trembling)', awarenessLevel: 'high' },
      { id: 'b', text: 'I feel generally unsettled but can\'t pinpoint where', awarenessLevel: 'medium' },
      { id: 'c', text: 'I mainly notice racing thoughts', awarenessLevel: 'medium' },
      { id: 'd', text: 'I don\'t notice much until afterward', awarenessLevel: 'low' },
    ],
  },
  {
    id: 'pp_009',
    type: 'physiological_proxy',
    dimension: 'self_awareness',
    facet: 'interoceptive_awareness',
    difficulty: 'hard',
    version: 1,
    prompt: 'When I\'m feeling emotionally overwhelmed:',
    options: [
      { id: 'a', text: 'I can feel it building before I reach my limit', awarenessLevel: 'high' },
      { id: 'b', text: 'I notice when I\'m approaching my limit', awarenessLevel: 'medium' },
      { id: 'c', text: 'I often realize I\'m overwhelmed only once I\'m there', awarenessLevel: 'low' },
      { id: 'd', text: 'I usually don\'t recognize it until later', awarenessLevel: 'low' },
    ],
  },
  {
    id: 'pp_010',
    type: 'physiological_proxy',
    dimension: 'self_awareness',
    facet: 'interoceptive_awareness',
    difficulty: 'easy',
    version: 1,
    prompt: 'I can feel my heartbeat without taking my pulse:',
    options: [
      { id: 'a', text: 'Yes, easily - especially when it\'s elevated', awarenessLevel: 'high', bodyArea: 'cardiovascular' },
      { id: 'b', text: 'Sometimes, if I focus on it', awarenessLevel: 'medium', bodyArea: 'cardiovascular' },
      { id: 'c', text: 'Only in extreme situations', awarenessLevel: 'low', bodyArea: 'cardiovascular' },
      { id: 'd', text: 'No, I never notice it', awarenessLevel: 'low' },
    ],
  },
  // Gate item only: discriminates high awareness + regulation from high awareness + anxiety (not scored)
  {
    id: 'pp_gate',
    type: 'physiological_proxy',
    dimension: 'self_awareness',
    facet: 'interoceptive_awareness',
    difficulty: 'medium',
    version: 1,
    prompt: 'When I notice body sensations, I can usually regulate them.',
    options: [
      { id: 'a', text: 'Usually yes - I can calm or shift them', awarenessLevel: 'high' },
      { id: 'b', text: 'Sometimes', awarenessLevel: 'medium' },
      { id: 'c', text: 'Rarely - they often overwhelm me', awarenessLevel: 'low' },
      { id: 'd', text: 'I don\'t usually notice body sensations', awarenessLevel: 'low' },
    ],
  },
];

// =============================================================================
// 6. CONSISTENCY PROBE QUESTIONS (12 questions - 6 pairs)
// =============================================================================

export const CONSISTENCY_PROBE_QUESTIONS: ConsistencyProbeQuestion[] = [
  // Pair 1: Self-regulation
  {
    id: 'cp_001',
    type: 'consistency_probe',
    dimension: 'self_regulation',
    facet: 'impulse_control',
    difficulty: 'easy',
    version: 1,
    statement: 'I pause before reacting emotionally.',
    scale: 7,
    pairedWithId: 'cp_002',
    expectedCorrelation: 'negative',
  },
  {
    id: 'cp_002',
    type: 'consistency_probe',
    dimension: 'self_regulation',
    facet: 'impulse_control',
    difficulty: 'easy',
    version: 1,
    statement: 'I often react before thinking.',
    scale: 7,
    pairedWithId: 'cp_001',
    expectedCorrelation: 'negative',
  },
  // Pair 2: Empathy
  {
    id: 'cp_003',
    type: 'consistency_probe',
    dimension: 'empathy',
    facet: 'emotional_reading',
    difficulty: 'medium',
    version: 1,
    statement: 'I easily pick up on how others are feeling.',
    scale: 7,
    pairedWithId: 'cp_004',
    expectedCorrelation: 'negative',
  },
  {
    id: 'cp_004',
    type: 'consistency_probe',
    dimension: 'empathy',
    facet: 'emotional_reading',
    difficulty: 'medium',
    version: 1,
    statement: 'I often miss emotional cues from others.',
    scale: 7,
    pairedWithId: 'cp_003',
    expectedCorrelation: 'negative',
  },
  // Pair 3: Self-awareness
  {
    id: 'cp_005',
    type: 'consistency_probe',
    dimension: 'self_awareness',
    facet: 'emotional_recognition',
    difficulty: 'easy',
    version: 1,
    statement: 'I know exactly what I\'m feeling at any given moment.',
    scale: 7,
    pairedWithId: 'cp_006',
    expectedCorrelation: 'negative',
  },
  {
    id: 'cp_006',
    type: 'consistency_probe',
    dimension: 'self_awareness',
    facet: 'emotional_recognition',
    difficulty: 'easy',
    version: 1,
    statement: 'My emotions often confuse me.',
    scale: 7,
    pairedWithId: 'cp_005',
    expectedCorrelation: 'negative',
  },
  // Pair 4: Motivation
  {
    id: 'cp_007',
    type: 'consistency_probe',
    dimension: 'motivation',
    facet: 'resilience',
    difficulty: 'medium',
    version: 1,
    statement: 'I recover quickly from disappointments.',
    scale: 7,
    pairedWithId: 'cp_008',
    expectedCorrelation: 'negative',
  },
  {
    id: 'cp_008',
    type: 'consistency_probe',
    dimension: 'motivation',
    facet: 'resilience',
    difficulty: 'medium',
    version: 1,
    statement: 'Setbacks tend to affect me for a long time.',
    scale: 7,
    pairedWithId: 'cp_007',
    expectedCorrelation: 'negative',
  },
  // Pair 5: Social skills
  {
    id: 'cp_009',
    type: 'consistency_probe',
    dimension: 'social_skills',
    facet: 'communication_clarity',
    difficulty: 'medium',
    version: 1,
    statement: 'I express my emotions clearly to others.',
    scale: 7,
    pairedWithId: 'cp_010',
    expectedCorrelation: 'negative',
  },
  {
    id: 'cp_010',
    type: 'consistency_probe',
    dimension: 'social_skills',
    facet: 'communication_clarity',
    difficulty: 'medium',
    version: 1,
    statement: 'People often misunderstand my emotional expressions.',
    scale: 7,
    pairedWithId: 'cp_009',
    expectedCorrelation: 'negative',
  },
  // Pair 6: Self-regulation (stress)
  {
    id: 'cp_011',
    type: 'consistency_probe',
    dimension: 'self_regulation',
    facet: 'stress_management',
    difficulty: 'hard',
    version: 1,
    statement: 'I handle pressure well.',
    scale: 7,
    pairedWithId: 'cp_012',
    expectedCorrelation: 'negative',
  },
  {
    id: 'cp_012',
    type: 'consistency_probe',
    dimension: 'self_regulation',
    facet: 'stress_management',
    difficulty: 'hard',
    version: 1,
    statement: 'I tend to fall apart under pressure.',
    scale: 7,
    pairedWithId: 'cp_011',
    expectedCorrelation: 'negative',
  },
  // Pair 7: Orthogonal (same polarity, positive correlation) - catches straight-lining / acquiescence
  {
    id: 'cp_013',
    type: 'consistency_probe',
    dimension: 'self_regulation',
    facet: 'stress_management',
    difficulty: 'medium',
    version: 1,
    statement: 'I am emotionally steady under stress.',
    scale: 7,
    pairedWithId: 'cp_014',
    expectedCorrelation: 'positive',
  },
  {
    id: 'cp_014',
    type: 'consistency_probe',
    dimension: 'self_regulation',
    facet: 'stress_management',
    difficulty: 'medium',
    version: 1,
    statement: 'Stress rarely disrupts my emotional balance.',
    scale: 7,
    pairedWithId: 'cp_013',
    expectedCorrelation: 'positive',
  },
];

// =============================================================================
// 7. RANKING & ALLOCATION QUESTIONS (6 questions)
// =============================================================================

export const RANKING_ALLOCATION_QUESTIONS: RankingAllocationQuestion[] = [
  {
    id: 'ra_001',
    type: 'ranking_allocation',
    dimension: 'self_awareness',
    difficulty: 'medium',
    version: 1,
    prompt: 'Distribute 100 points based on how well each describes you:',
    totalPoints: 100,
    minPerOption: 0,
    maxPerOption: 100,
    options: [
      { id: 'a', text: 'I understand my own emotions deeply', dimension: 'self_awareness' },
      { id: 'b', text: 'I control my emotional reactions well', dimension: 'self_regulation' },
      { id: 'c', text: 'I understand others\' emotions easily', dimension: 'empathy' },
      { id: 'd', text: 'I handle social situations smoothly', dimension: 'social_skills' },
    ],
  },
  {
    id: 'ra_002',
    type: 'ranking_allocation',
    dimension: 'self_regulation',
    difficulty: 'medium',
    version: 1,
    prompt: 'When facing challenges, allocate 100 points to your strengths:',
    totalPoints: 100,
    minPerOption: 0,
    maxPerOption: 100,
    options: [
      { id: 'a', text: 'Staying calm under pressure', dimension: 'self_regulation' },
      { id: 'b', text: 'Understanding what I\'m feeling', dimension: 'self_awareness' },
      { id: 'c', text: 'Continuing toward long-term goals even when progress is slow', dimension: 'motivation' },
      { id: 'd', text: 'Getting support from others', dimension: 'social_skills' },
    ],
  },
  {
    id: 'ra_003',
    type: 'ranking_allocation',
    dimension: 'empathy',
    difficulty: 'hard',
    version: 1,
    prompt: 'In relationships, allocate 100 points to what you\'re best at:',
    totalPoints: 100,
    minPerOption: 0,
    maxPerOption: 100,
    options: [
      { id: 'a', text: 'Sensing how others feel', dimension: 'empathy' },
      { id: 'b', text: 'Expressing my own feelings clearly', dimension: 'social_skills' },
      { id: 'c', text: 'Staying emotionally steady', dimension: 'self_regulation' },
      { id: 'd', text: 'Understanding my own needs', dimension: 'self_awareness' },
      { id: 'e', text: 'Staying committed despite difficulties', dimension: 'motivation' },
    ],
  },
  {
    id: 'ra_004',
    type: 'ranking_allocation',
    dimension: 'social_skills',
    difficulty: 'medium',
    version: 1,
    prompt: 'At work/school, allocate 100 points to your emotional strengths:',
    totalPoints: 100,
    minPerOption: 0,
    maxPerOption: 100,
    options: [
      { id: 'a', text: 'Working well with others', dimension: 'social_skills' },
      { id: 'b', text: 'Managing my stress effectively', dimension: 'self_regulation' },
      { id: 'c', text: 'Staying motivated and focused', dimension: 'motivation' },
      { id: 'd', text: 'Understanding team dynamics', dimension: 'empathy' },
    ],
  },
  {
    id: 'ra_005',
    type: 'ranking_allocation',
    dimension: 'motivation',
    difficulty: 'hard',
    version: 1,
    prompt: 'When things go wrong, allocate 100 points to how you cope:',
    totalPoints: 100,
    minPerOption: 0,
    maxPerOption: 100,
    options: [
      { id: 'a', text: 'Staying optimistic about the future', dimension: 'motivation' },
      { id: 'b', text: 'Processing my emotions fully', dimension: 'self_awareness' },
      { id: 'c', text: 'Controlling my reactions', dimension: 'self_regulation' },
      { id: 'd', text: 'Seeking support from others', dimension: 'social_skills' },
      { id: 'e', text: 'Understanding others\' perspectives', dimension: 'empathy' },
    ],
  },
  {
    id: 'ra_006',
    type: 'ranking_allocation',
    dimension: 'self_awareness',
    difficulty: 'medium',
    version: 1,
    prompt: 'What would you most want to improve? Allocate 100 points:',
    totalPoints: 100,
    minPerOption: 0,
    maxPerOption: 100,
    options: [
      { id: 'a', text: 'Understanding my emotions better', dimension: 'self_awareness' },
      { id: 'b', text: 'Managing my reactions better', dimension: 'self_regulation' },
      { id: 'c', text: 'Being more attuned to others', dimension: 'empathy' },
      { id: 'd', text: 'Communicating emotions more effectively', dimension: 'social_skills' },
      { id: 'e', text: 'Being more resilient', dimension: 'motivation' },
    ],
  },
];

// =============================================================================
// 8. SJT DECISION TASKS (scenario + 4 options with effectiveness 0–1)
// =============================================================================

export const SJT_DECISION_QUESTIONS: SJTDecisionQuestion[] = [
  {
    id: 'sjt_001',
    type: 'sjt_decision',
    dimension: 'self_regulation',
    difficulty: 'medium',
    version: 1,
    scenario: 'A colleague criticizes your work in front of the team. You feel hot and want to reply right away.',
    options: [
      { id: 'a', text: 'Take a breath, acknowledge their point, and suggest talking about it later in private.', dimension: 'self_regulation', effectiveness: 0.9 },
      { id: 'b', text: 'Defend your work and list why they are wrong.', dimension: 'self_regulation', effectiveness: 0.35 },
      { id: 'c', text: 'Say nothing and leave the room to cool off.', dimension: 'self_regulation', effectiveness: 0.5 },
      { id: 'd', text: 'Dismiss the comment and change the subject.', dimension: 'self_regulation', effectiveness: 0.2 },
    ],
  },
  {
    id: 'sjt_002',
    type: 'sjt_decision',
    dimension: 'empathy',
    difficulty: 'medium',
    version: 1,
    scenario: 'Your teammate has been quiet and withdrawn for two days. You think something is wrong.',
    options: [
      { id: 'a', text: 'Find a private moment to ask how they are and just listen.', dimension: 'empathy', effectiveness: 0.92 },
      { id: 'b', text: 'Send a quick message: "You okay?" and move on.', dimension: 'empathy', effectiveness: 0.45 },
      { id: 'c', text: 'Assume they want space and not bring it up.', dimension: 'empathy', effectiveness: 0.3 },
      { id: 'd', text: 'Tell them to cheer up so the team is not affected.', dimension: 'empathy', effectiveness: 0.1 },
    ],
  },
  {
    id: 'sjt_003',
    type: 'sjt_decision',
    dimension: 'resilience',
    difficulty: 'hard',
    version: 1,
    scenario: 'A project you led was just cancelled. You spent months on it.',
    options: [
      { id: 'a', text: 'Let yourself feel disappointed briefly, then focus on what you can control and what you learned.', dimension: 'resilience', effectiveness: 0.88 },
      { id: 'b', text: 'Push the feelings aside and volunteer for the next project right away.', dimension: 'resilience', effectiveness: 0.4 },
      { id: 'c', text: 'Talk to a trusted peer about it, then move on.', dimension: 'resilience', effectiveness: 0.55 },
      { id: 'd', text: 'Step back from the team for a few days until you feel better.', dimension: 'resilience', effectiveness: 0.25 },
    ],
  },
  {
    id: 'sjt_004',
    type: 'sjt_decision',
    dimension: 'social_skills',
    difficulty: 'medium',
    version: 1,
    scenario: 'Two team members are in conflict and it is affecting work. You are not the manager.',
    options: [
      { id: 'a', text: 'Offer to help them talk: each shares their view and one thing they appreciate about the other.', dimension: 'social_skills', effectiveness: 0.85 },
      { id: 'b', text: 'Tell both to sort it out before the next meeting.', dimension: 'social_skills', effectiveness: 0.3 },
      { id: 'c', text: 'Tell the manager without talking to either person first.', dimension: 'social_skills', effectiveness: 0.4 },
      { id: 'd', text: 'Take over their tasks so they do not have to work together.', dimension: 'social_skills', effectiveness: 0.2 },
    ],
  },
  {
    id: 'sjt_005',
    type: 'sjt_decision',
    dimension: 'self_awareness',
    difficulty: 'medium',
    version: 1,
    scenario: 'You notice you are snapping at small requests. You are not sure why.',
    options: [
      { id: 'a', text: 'Pause and check in with yourself: stress, sleep, or something else? Then adjust or say you need space.', dimension: 'self_awareness', effectiveness: 0.9 },
      { id: 'b', text: 'Apologize each time and try to be nicer without looking at the cause.', dimension: 'self_awareness', effectiveness: 0.5 },
      { id: 'c', text: 'Blame others for asking too much.', dimension: 'self_awareness', effectiveness: 0.15 },
      { id: 'd', text: 'Ignore it and hope it passes.', dimension: 'self_awareness', effectiveness: 0.35 },
    ],
  },
  {
    id: 'sjt_006',
    type: 'sjt_decision',
    dimension: 'resilience',
    difficulty: 'medium',
    version: 1,
    scenario: 'You get harsh feedback from a client. Your first reaction is to get defensive.',
    options: [
      { id: 'a', text: 'Notice you feel defensive, then re-read the feedback and pick one small thing you can improve.', dimension: 'resilience', effectiveness: 0.88 },
      { id: 'b', text: 'Reply right away and explain why the client is wrong.', dimension: 'resilience', effectiveness: 0.25 },
      { id: 'c', text: 'Forward the email to your manager and ask them to handle it.', dimension: 'resilience', effectiveness: 0.4 },
      { id: 'd', text: 'Avoid the client for a while until things cool down.', dimension: 'resilience', effectiveness: 0.2 },
    ],
  },
];

// =============================================================================
// 9. EMOTION PERCEPTION (detect emotion from text/tone/context)
// =============================================================================

export const EMOTION_PERCEPTION_QUESTIONS: EmotionPerceptionQuestion[] = [
  {
    id: 'ep_001',
    type: 'emotion_perception',
    dimension: 'empathy',
    format: 'text_scenario',
    difficulty: 'easy',
    version: 1,
    scenario: 'A friend says: "I got the promotion... but I will miss my team."',
    options: [
      { id: 'a', emotion: 'Happy and sad at once', isCorrect: true, partialCredit: 1 },
      { id: 'b', emotion: 'Anger', isCorrect: false, partialCredit: 0 },
      { id: 'c', emotion: 'Pure joy', isCorrect: false, partialCredit: 0 },
      { id: 'd', emotion: 'Anxiety', isCorrect: false, partialCredit: 0.2 },
    ],
  },
  {
    id: 'ep_002',
    type: 'emotion_perception',
    dimension: 'empathy',
    format: 'text_scenario',
    difficulty: 'medium',
    version: 1,
    scenario: 'A coworker says in a flat voice: "Sure, I can take the extra shift. No problem." They look away.',
    options: [
      { id: 'a', emotion: 'Really willing', isCorrect: false, partialCredit: 0 },
      { id: 'b', emotion: 'Reluctant or resentful', isCorrect: true, partialCredit: 1 },
      { id: 'c', emotion: 'Confused', isCorrect: false, partialCredit: 0.3 },
      { id: 'd', emotion: 'Excited', isCorrect: false, partialCredit: 0 },
    ],
  },
  {
    id: 'ep_003',
    type: 'emotion_perception',
    dimension: 'empathy',
    format: 'context_inference',
    difficulty: 'medium',
    version: 1,
    scenario: 'Before a big talk, someone says: "I have done this many times. It is just another day." Their hands are clasped tightly.',
    options: [
      { id: 'a', emotion: 'Confident and relaxed', isCorrect: false, partialCredit: 0 },
      { id: 'b', emotion: 'Nervous but holding it together', isCorrect: true, partialCredit: 1 },
      { id: 'c', emotion: 'Bored', isCorrect: false, partialCredit: 0 },
      { id: 'd', emotion: 'Angry', isCorrect: false, partialCredit: 0 },
    ],
  },
  {
    id: 'ep_004',
    type: 'emotion_perception',
    dimension: 'empathy',
    format: 'text_scenario',
    difficulty: 'easy',
    version: 1,
    scenario: '"They forgot my birthday again. It is fine. I do not care."',
    options: [
      { id: 'a', emotion: 'Hurt', isCorrect: true, partialCredit: 1 },
      { id: 'b', emotion: 'Does not care', isCorrect: false, partialCredit: 0.2 },
      { id: 'c', emotion: 'Grateful', isCorrect: false, partialCredit: 0 },
      { id: 'd', emotion: 'Relief', isCorrect: false, partialCredit: 0 },
    ],
  },
  {
    id: 'ep_005',
    type: 'emotion_perception',
    dimension: 'empathy',
    format: 'tone_interpretation',
    difficulty: 'hard',
    version: 1,
    scenario: 'Someone you manage says: "Your feedback was really helpful." They pause, look away, then say: "Really."',
    options: [
      { id: 'a', emotion: 'Truly thankful', isCorrect: false, partialCredit: 0.3 },
      { id: 'b', emotion: 'Sarcastic or not meaning it', isCorrect: true, partialCredit: 1 },
      { id: 'c', emotion: 'Neutral', isCorrect: false, partialCredit: 0.2 },
      { id: 'd', emotion: 'Fear', isCorrect: false, partialCredit: 0 },
    ],
  },
  {
    id: 'ep_006',
    type: 'emotion_perception',
    dimension: 'empathy',
    format: 'text_scenario',
    difficulty: 'medium',
    version: 1,
    scenario: '"I have tried everything. Nothing works. Maybe I am not good enough for this."',
    options: [
      { id: 'a', emotion: 'Determined', isCorrect: false, partialCredit: 0 },
      { id: 'b', emotion: 'Frustrated and doubting themselves', isCorrect: true, partialCredit: 1 },
      { id: 'c', emotion: 'Curious', isCorrect: false, partialCredit: 0 },
      { id: 'd', emotion: 'Proud', isCorrect: false, partialCredit: 0 },
    ],
  },
];

// =============================================================================
// COMBINED QUESTION BANK
// =============================================================================

export const ALL_QUESTIONS: EQQuestion[] = [
  ...FORCED_CHOICE_QUESTIONS,
  ...LIKERT_QUESTIONS,
  ...EMOTION_VOCABULARY_QUESTIONS,
  ...META_EQ_QUESTIONS,
  ...PHYSIOLOGICAL_PROXY_QUESTIONS,
  ...CONSISTENCY_PROBE_QUESTIONS,
  ...RANKING_ALLOCATION_QUESTIONS,
  ...SJT_DECISION_QUESTIONS,
  ...EMOTION_PERCEPTION_QUESTIONS,
];

// =============================================================================
// QUESTION SELECTION UTILITIES
// =============================================================================

/**
 * Get questions by type
 */
export function getQuestionsByType(type: EQQuestion['type']): EQQuestion[] {
  return ALL_QUESTIONS.filter(q => q.type === type);
}

/**
 * Get questions by dimension
 */
export function getQuestionsByDimension(dimension: EQQuestion['dimension']): EQQuestion[] {
  return ALL_QUESTIONS.filter(q => q.dimension === dimension);
}

/**
 * Shuffle array using Fisher-Yates
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Select questions for full test
 */
export function selectFullTestQuestions(): EQQuestion[] {
  const questions: EQQuestion[] = [];
  
  // 10 forced choice (balanced across dimensions)
  const fcByDimension = new Map<string, ForcedChoiceQuestion[]>();
  FORCED_CHOICE_QUESTIONS.forEach(q => {
    const list = fcByDimension.get(q.dimension) || [];
    list.push(q);
    fcByDimension.set(q.dimension, list);
  });
  fcByDimension.forEach(list => {
    questions.push(...shuffleArray(list).slice(0, 2));
  });
  
  // 15 likert (balanced across dimensions and reverse keying)
  questions.push(...shuffleArray(LIKERT_QUESTIONS).slice(0, 15));
  
  // 10 emotion vocabulary
  questions.push(...shuffleArray(EMOTION_VOCABULARY_QUESTIONS).slice(0, 10));
  
  // 8 meta-eq
  questions.push(...shuffleArray(META_EQ_QUESTIONS).slice(0, 8));
  
  // 6 physiological
  questions.push(...shuffleArray(PHYSIOLOGICAL_PROXY_QUESTIONS).slice(0, 6));
  
  // 8 consistency probes (4 pairs drawn from 7 pairs; includes positive-correlation pair for straight-line detection)
  const pairs = [
    [CONSISTENCY_PROBE_QUESTIONS[0], CONSISTENCY_PROBE_QUESTIONS[1]],
    [CONSISTENCY_PROBE_QUESTIONS[2], CONSISTENCY_PROBE_QUESTIONS[3]],
    [CONSISTENCY_PROBE_QUESTIONS[4], CONSISTENCY_PROBE_QUESTIONS[5]],
    [CONSISTENCY_PROBE_QUESTIONS[6], CONSISTENCY_PROBE_QUESTIONS[7]],
    [CONSISTENCY_PROBE_QUESTIONS[8], CONSISTENCY_PROBE_QUESTIONS[9]],
    [CONSISTENCY_PROBE_QUESTIONS[10], CONSISTENCY_PROBE_QUESTIONS[11]],
    [CONSISTENCY_PROBE_QUESTIONS[12], CONSISTENCY_PROBE_QUESTIONS[13]],
  ];
  const selectedPairs = shuffleArray(pairs).slice(0, 4);
  selectedPairs.forEach(pair => questions.push(...pair));
  
  // 4 ranking allocation
  questions.push(...shuffleArray(RANKING_ALLOCATION_QUESTIONS).slice(0, 4));
  
  // 6 SJT decision
  questions.push(...shuffleArray(SJT_DECISION_QUESTIONS).slice(0, 6));
  
  // 6 emotion perception
  questions.push(...shuffleArray(EMOTION_PERCEPTION_QUESTIONS).slice(0, 6));
  
  // Shuffle final order (but keep consistency pairs somewhat separated)
  return shuffleArray(questions);
}

// Question counts summary
export const QUESTION_COUNTS = {
  forced_choice: FORCED_CHOICE_QUESTIONS.length,
  likert: LIKERT_QUESTIONS.length,
  emotion_vocabulary: EMOTION_VOCABULARY_QUESTIONS.length,
  meta_eq: META_EQ_QUESTIONS.length,
  physiological_proxy: PHYSIOLOGICAL_PROXY_QUESTIONS.length,
  consistency_probe: CONSISTENCY_PROBE_QUESTIONS.length,
  ranking_allocation: RANKING_ALLOCATION_QUESTIONS.length,
  sjt_decision: SJT_DECISION_QUESTIONS.length,
  emotion_perception: EMOTION_PERCEPTION_QUESTIONS.length,
  total: ALL_QUESTIONS.length,
};
