/**
 * Core Type Definitions
 * 
 * Strong typing throughout the application.
 * Clear domain boundaries between Journal, EQ, and Insights systems.
 */

// Re-export comprehensive EQ assessment types
export * from './eq-assessment';

// ============================================================================
// AUTHENTICATION TYPES
// ============================================================================

export interface User {
  id: string;
  email?: string;
  username: string;
  /** Display name from profiles (onboarding); prefer this for greeting. */
  displayName?: string;
  createdAt: number;
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
/** Source of the entry: Reflect flow (check-in + optional journal) or standalone Journal write. */
export type JournalEntrySource = 'reflect' | 'journal_only' | 'inner_ally';

export interface JournalEntry {
  id: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
  entrySource: JournalEntrySource;

  // Structured metadata (can be used for insights). For journal_only these can be empty/undefined.
  emotions?: EmotionTag[]; // 1-3 emotions max (reflect); empty/undefined for journal_only
  energyLevel?: EnergyLevel; // 1-5 scale (reflect)
  pleasantness?: number; // 0-100 (reflect)
  reasons?: string[]; // Optional reason tags (reflect)
  reason?: string; // Optional context (structured) — deprecated in favor of reasons

  // Private journal text (encrypted, local only). Empty string for reflect-only when user skips writing.
  journalTextEncrypted: string;
  encryptionKeyId?: string; // Optional when no journal text
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
// EQ SYSTEM TYPES
// ============================================================================
// Note: Comprehensive EQ assessment types are exported from './eq-assessment'
// This includes: EQDimension, QuestionType, all question/response interfaces,
// scoring types, and assessment result types.

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
// ONBOARDING & USER PREFERENCES TYPES
// ============================================================================

/** User's primary goal for using the app (onboarding). */
export type UserGoalId =
  | 'manage_stress'
  | 'improve_relationships'
  | 'build_self_awareness'
  | 'improve_focus'
  | 'emotional_regulation'
  | 'other';

/**
 * @deprecated Supabase table user_goals was dropped in 00003; goals live in user_preferences.goals (JSONB).
 */
export interface UserGoal {
  id: string;
  userId: string;
  goalId: UserGoalId;
  customText?: string;
  selectedAt: number;
  isPrimary: boolean;
}

export interface UserOnboarding {
  userId: string;
  startedAt: number;
  completedAt?: number;
  onboardingVersion: number;
  stepsCompleted: string[]; // e.g. ['goal', 'background', 'frequency', 'emotional_check']
}

/**
 * @deprecated Supabase table user_background was dropped in 00003; context lives in user_preferences.context (JSONB).
 */
export interface UserBackground {
  userId: string;
  ageRange?: '18-24' | '25-34' | '35-44' | '45-54' | '55+' | 'prefer_not_to_say';
  context?: string;
  occupationCategory?: 'student' | 'employed' | 'self_employed' | 'caregiver' | 'other';
  createdAt: number;
  updatedAt: number;
}

/** How often the user wants to check in (onboarding + settings). */
export type CheckInFrequency =
  | 'daily'
  | 'few_times_week'
  | 'weekly'
  | 'when_reminded'
  | 'no_reminders';

export interface UserPreferences {
  userId: string;
  checkInFrequency: CheckInFrequency;
  reminderEnabled: boolean;
  reminderTimes: string[]; // "HH:mm"
  reminderDays: number[]; // 0=Sun..6=Sat
  createdAt: number;
  updatedAt: number;
}

/** Onboarding emotional baseline question value type. */
export type OnboardingEmotionalValueType = 'scale' | 'emotion' | 'multi_emotion';

export interface OnboardingEmotionalCheck {
  id: string;
  userId: string;
  questionId: string;
  questionText?: string;
  valueType: OnboardingEmotionalValueType;
  valueScale?: number; // 1–5 or 1–7
  valueEmotion?: EmotionTag;
  valueEmotions?: EmotionTag[];
  orderIndex: number;
  createdAt: number;
}

// ============================================================================
// LEARN TYPES
// ============================================================================
// Note: Learning module types are defined in '@/data/learning-content'
// This includes: LearningModule with audio/video content for each EQ dimension.
