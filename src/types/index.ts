/**
 * Core Type Definitions
 * 
 * Strong typing throughout the application.
 * Clear domain boundaries between Journal, EQ, and Insights systems.
 */

// ============================================================================
// AUTHENTICATION TYPES
// ============================================================================

export interface User {
  id: string;
  email?: string;
  username: string;
  createdAt: number;
  isDemoMode: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ============================================================================
// JOURNAL SYSTEM TYPES (PRIVATE, ENCRYPTED, NEVER SYNCED)
// ============================================================================

/**
 * Journal Entry
 * 
 * PRIVACY RULES:
 * - journalText is encrypted locally before storage
 * - journalText is NEVER synced to any server
 * - journalText is NEVER analyzed by AI/NLP
 * - journalText is NEVER accessible to EQ or Insights systems
 * 
 * Only structured metadata (emotions, energy, reason) can be used
 * for pattern detection and insights.
 */
export interface JournalEntry {
  id: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
  
  // Structured metadata (can be used for insights)
  emotions: EmotionTag[]; // 1-3 emotions max
  energyLevel: EnergyLevel; // 1-5 scale
  reason?: string; // Optional context (structured, not free text)
  
  // Private journal text (encrypted, local only)
  journalTextEncrypted: string; // Base64 encoded encrypted text
  encryptionKeyId: string; // Reference to encryption key
}

export type EmotionTag = 
  | 'Happy'
  | 'Sad'
  | 'Anxious'
  | 'Calm'
  | 'Frustrated'
  | 'Grateful'
  | 'Excited'
  | 'Tired'
  | 'Content'
  | 'Overwhelmed'
  | 'Peaceful'
  | 'Angry'
  | 'Hopeful'
  | 'Lonely'
  | 'Confident'
  | 'Uncertain'
  | 'Relaxed'
  | 'Grounded'
  | 'On edge'
  | 'Empty'
  | 'Exhausted'
  | 'Irritated'
  | 'Upset'
  | 'Confused'
  | 'Mixed'
  | 'Unsure'
  | 'Restless'
  | 'Tense'
  | 'Stressed'
  | 'Neutral'
  | 'Worried'
  | 'Energized'
  | 'Disappointed'
  | 'Proud';

export type EnergyLevel = 1 | 2 | 3 | 4 | 5;

// ============================================================================
// EQ SYSTEM TYPES (MEASUREMENT, CAN SYNC)
// ============================================================================

/**
 * EQ Check-In Response
 * 
 * This is the EQ measurement layer.
 * Contains structured responses only - no free text.
 * Can be synced for analytics (with user consent).
 */
export interface EQCheckIn {
  id: string;
  userId: string;
  createdAt: number;
  
  questionId: string;
  questionType: EQQuestionType;
  response: EQResponse;
  
  // Internal scoring (never shown to user)
  domain: EQDomain;
  score?: number; // 0-100, internal only
}

export type EQQuestionType = 'trait' | 'slider' | 'binary';

export type EQResponse = 
  | { type: 'trait'; value: string }
  | { type: 'slider'; value: number } // 0-100
  | { type: 'binary'; value: boolean };

export type EQDomain = 
  | 'self_awareness'
  | 'self_regulation'
  | 'emotional_understanding'
  | 'empathy'
  | 'expression'
  | 'resilience';

export interface EQQuestion {
  id: string;
  domain: EQDomain;
  type: EQQuestionType;
  text: string;
  options?: string[]; // For trait questions
}

// ============================================================================
// INSIGHTS SYSTEM TYPES (DERIVED FROM STRUCTURED DATA ONLY)
// ============================================================================

/**
 * Insight
 * 
 * Derived ONLY from:
 * - EQ check-in patterns
 * - Emotion + energy + reason patterns from journal metadata
 * 
 * NEVER from journal text content.
 */
export interface Insight {
  id: string;
  userId: string;
  createdAt: number;
  type: InsightType;
  title: string;
  description: string;
  category: InsightCategory;
}

export type InsightType = 
  | 'pattern'
  | 'trend'
  | 'strength'
  | 'opportunity';

export type InsightCategory = 
  | 'emotion_patterns'
  | 'energy_patterns'
  | 'eq_domains'
  | 'wellbeing';

// ============================================================================
// WELLBEING SIGNALING TYPES
// ============================================================================

/**
 * Wellbeing Pattern Detection
 * 
 * Based on structured data only:
 * - Same low-valence emotion ≥ 21 days
 * - Low energy ≥ 60% of those days
 * - User still active
 * 
 * Triggers help prompt, not diagnosis.
 */
export interface WellbeingPattern {
  userId: string;
  detectedAt: number;
  patternType: 'low_valence_extended' | 'low_energy_extended';
  durationDays: number;
  emotionTags?: EmotionTag[];
  averageEnergyLevel: number;
  isActive: boolean; // User still engaging with app
}

// ============================================================================
// RECOVER SYSTEM TYPES
// ============================================================================

export interface RecoverySession {
  id: string;
  userId: string;
  type: RecoveryType;
  startedAt: number;
  completedAt?: number;
  duration?: number; // seconds
}

export type RecoveryType = 
  | 'breathing'
  | 'grounding'
  | 'release_let_go';

// ============================================================================
// MEDITATION TYPES
// ============================================================================

export interface MeditationSession {
  id: string;
  userId: string;
  audioId: string;
  startedAt: number;
  completedAt?: number;
  duration?: number; // seconds
}

// ============================================================================
// LEARN TYPES
// ============================================================================

export interface LearnLesson {
  id: string;
  title: string;
  description: string;
  content: string;
  duration: number; // minutes
  category: EQDomain;
}
