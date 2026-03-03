/**
 * Learning Content Data
 * 
 * Audio podcasts and video lessons for each EQ dimension.
 * Content hosted on S3.
 */

import type { EQDimension } from '@/types/eq-assessment';

export interface LearningModule {
  id: string;
  dimension: EQDimension;
  title: string;
  subtitle: string;
  description: string;
  audioUrl: string;
  videoUrl: string;
  audioDuration: string;
  videoDuration: string;
  icon: string;
  color: string;
  keyTakeaways: string[];
}

// S3 bucket base URL - update this to your CloudFront distribution URL for production
const S3_BASE = 'https://lumi6eq.s3.amazonaws.com/applearningfiles';

export const LEARNING_MODULES: LearningModule[] = [
  {
    id: 'self_awareness_1',
    dimension: 'self_awareness',
    title: 'Name It To Tame It',
    subtitle: 'The Power of Emotional Labeling',
    description: 'Learn how simply naming your emotions can reduce their intensity and help you respond more thoughtfully. This technique, backed by neuroscience research, activates your prefrontal cortex and calms your amygdala.',
    audioUrl: `${S3_BASE}/Self%20awareness%20Name_It_To_Tame_It..m4a`,
    videoUrl: `${S3_BASE}/Self%20awareness%20Name_It_To_Tame_It.mp4`,
    audioDuration: '8 min',
    videoDuration: '5 min',
    icon: 'eye-outline',
    color: '#60A5FA', // Blue - calm, awareness
    keyTakeaways: [
      'Naming emotions reduces amygdala activation by up to 50%',
      'Use specific emotion words, not just "good" or "bad"',
      'Practice the "I notice I\'m feeling..." format',
      'Build your emotion vocabulary over time',
    ],
  },
  {
    id: 'self_regulation_1',
    dimension: 'self_regulation',
    title: 'The Pause Button',
    subtitle: 'Creating Space Between Stimulus and Response',
    description: 'Discover how to create a gap between feeling an emotion and acting on it. This critical skill helps you respond intentionally rather than react impulsively.',
    audioUrl: `${S3_BASE}/Self-Regulation%20The_Pause_Button.m4a`,
    videoUrl: `${S3_BASE}/Self-Regulation%20The_Pause_Button.mp4`,
    audioDuration: '10 min',
    videoDuration: '6 min',
    icon: 'pause-circle-outline',
    color: '#A78BFA', // Purple - calm, control
    keyTakeaways: [
      'The 6-second rule: emotions peak and decline in 6 seconds',
      'Use physical anchors (breath, body scan) to pause',
      'Ask yourself: "What do I want to happen here?"',
      'Practice in low-stakes situations first',
    ],
  },
  {
    id: 'empathy_1',
    dimension: 'empathy',
    title: 'In Their Shoes',
    subtitle: 'Developing Perspective-Taking Skills',
    description: 'Learn techniques for understanding others\' emotional experiences without losing yourself. True empathy is about connection, not absorption.',
    audioUrl: `${S3_BASE}/Empathy%20In_Their_Shoes.m4a`,
    videoUrl: `${S3_BASE}/Empathy%20In_Their_Shoes.mp4`,
    audioDuration: '12 min',
    videoDuration: '7 min',
    icon: 'heart-outline',
    color: '#F472B6', // Pink - warmth, connection
    keyTakeaways: [
      'Empathy vs sympathy: feeling with, not feeling for',
      'Use curiosity: "I wonder what they might be feeling"',
      'Listen to understand, not to respond',
      'Validate emotions before problem-solving',
    ],
  },
  {
    id: 'social_skills_1',
    dimension: 'social_skills',
    title: 'Words That Land',
    subtitle: 'Communicating with Emotional Intelligence',
    description: 'Master the art of expressing yourself in ways that others can truly hear. Learn to navigate difficult conversations while maintaining connection.',
    audioUrl: `${S3_BASE}/Social%20Skills%20Words_That_Land.m4a`,
    videoUrl: `${S3_BASE}/Social%20Skills%20Words_That_Land.mp4`,
    audioDuration: '9 min',
    videoDuration: '6 min',
    icon: 'chatbubbles-outline',
    color: '#34D399', // Green - growth, harmony
    keyTakeaways: [
      'Use "I" statements instead of "You" accusations',
      'Describe behavior, not character',
      'Time your conversations wisely',
      'Check for understanding: "What did you hear me say?"',
    ],
  },
  {
    id: 'motivation_1',
    dimension: 'motivation',
    title: 'Why Before Willpower',
    subtitle: 'Connecting to Your Deeper Purpose',
    description: 'Discover why willpower alone isn\'t enough and how connecting to your deeper "why" creates sustainable motivation that outlasts any obstacle.',
    audioUrl: `${S3_BASE}/The%20Motivation%20Why_Before_Willpower.m4a`,
    videoUrl: `${S3_BASE}/The%20Motivation%20Why_Before_Willpower.mp4`,
    audioDuration: '11 min',
    videoDuration: '7 min',
    icon: 'flame-outline',
    color: '#FBBF24', // Yellow/Orange - energy, drive
    keyTakeaways: [
      'Willpower is a limited resource that depletes',
      'Purpose-driven motivation is renewable',
      'Connect tasks to values, not just outcomes',
      'Use the "5 Whys" to find your deeper motivation',
    ],
  },
  {
    id: 'resilience_1',
    dimension: 'resilience',
    title: 'The Bounce Back Muscle',
    subtitle: 'Building Stress Resilience',
    description: 'Learn how to recover from setbacks, manage stress, and sustain performance under pressure.',
    audioUrl: 'https://lumi6eq.s3.us-west-1.amazonaws.com/applearningfiles/Resilience+The+Bounce+Back+Muscle.m4a',
    videoUrl: 'https://lumi6eq.s3.us-west-1.amazonaws.com/applearningfiles/Resilience+The+Bounce+Back+Muscle.mp4',
    audioDuration: '9 min',
    videoDuration: '6 min',
    icon: 'shield-checkmark-outline',
    color: '#F97316',
    keyTakeaways: [
      'Resilience is a skill you can build, not a fixed trait',
      'Recovery rituals help reset after stress',
      'Reframe setbacks as learning, not failure',
      'Connect with support before you\'re in crisis',
    ],
  },
];

// Get modules by dimension
export function getModulesByDimension(dimension: EQDimension): LearningModule[] {
  return LEARNING_MODULES.filter(m => m.dimension === dimension);
}

// Get a single module by ID
export function getModuleById(id: string): LearningModule | undefined {
  return LEARNING_MODULES.find(m => m.id === id);
}

// Get dimension display info
export const DIMENSION_INFO: Record<EQDimension, { name: string; description: string; icon: string; color: string }> = {
  self_awareness: {
    name: 'Self-Awareness',
    description: 'Recognizing your emotions, triggers, and patterns',
    icon: 'eye-outline',
    color: '#60A5FA',
  },
  self_regulation: {
    name: 'Self-Regulation',
    description: 'Managing your emotional responses effectively',
    icon: 'pause-circle-outline',
    color: '#A78BFA',
  },
  empathy: {
    name: 'Empathy',
    description: 'Understanding others\' emotional experiences',
    icon: 'heart-outline',
    color: '#F472B6',
  },
  social_skills: {
    name: 'Social Skills',
    description: 'Building and maintaining healthy relationships',
    icon: 'chatbubbles-outline',
    color: '#34D399',
  },
  motivation: {
    name: 'Motivation',
    description: 'Driving yourself toward meaningful goals',
    icon: 'flame-outline',
    color: '#FBBF24',
  },
  resilience: {
    name: 'Resilience',
    description: 'Recovering from setbacks and managing stress',
    icon: 'shield-checkmark-outline',
    color: '#F97316',
  },
};
