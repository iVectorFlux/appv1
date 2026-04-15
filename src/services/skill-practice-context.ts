/**
 * Saved learner context for Skill Lab scenarios (local only).
 * Used to tailor AI scenarios; not sent except to skills-coach API.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CONTEXT_KEY = '@lumi6/skill-practice-context';
const JOURNEY_PREFIX = '@lumi6/skill-learning-journey/';

export type PracticeBackground =
  | ''
  | 'student'
  | 'early_career'
  | 'professional'
  | 'entrepreneur'
  | 'leader'
  | 'other';

export interface SkillPracticeContext {
  background: PracticeBackground;
  /** Job title or primary role */
  roleTitle: string;
  industry: string;
  /** e.g. Individual contributor, Manager, Director, Executive */
  seniority: string;
}

export const PRACTICE_BACKGROUND_LABELS: Record<Exclude<PracticeBackground, ''>, string> = {
  student: 'Student',
  early_career: 'Early career',
  professional: 'Working professional',
  entrepreneur: 'Entrepreneur',
  leader: 'Leader / executive',
  other: 'Other',
};

export const DEFAULT_SKILL_PRACTICE_CONTEXT: SkillPracticeContext = {
  background: '',
  roleTitle: '',
  industry: '',
  seniority: '',
};

export interface LearningJourneyStep {
  order: number;
  title: string;
  description: string;
  /** Optional atomic skill id from future-skills when relevant */
  suggestedSubSkillId?: string | null;
}

export interface LearningJourney {
  skillId: string;
  skillName: string;
  summary: string;
  steps: LearningJourneyStep[];
  savedAt: string;
}

export async function loadSkillPracticeContext(): Promise<SkillPracticeContext> {
  try {
    const raw = await AsyncStorage.getItem(CONTEXT_KEY);
    if (!raw) return { ...DEFAULT_SKILL_PRACTICE_CONTEXT };
    const j = JSON.parse(raw) as Partial<SkillPracticeContext>;
    return {
      background: (j.background as PracticeBackground) ?? '',
      roleTitle: typeof j.roleTitle === 'string' ? j.roleTitle : '',
      industry: typeof j.industry === 'string' ? j.industry : '',
      seniority: typeof j.seniority === 'string' ? j.seniority : '',
    };
  } catch {
    return { ...DEFAULT_SKILL_PRACTICE_CONTEXT };
  }
}

export async function saveSkillPracticeContext(ctx: SkillPracticeContext): Promise<void> {
  await AsyncStorage.setItem(CONTEXT_KEY, JSON.stringify(ctx));
}

export async function saveLearningJourney(journey: LearningJourney): Promise<void> {
  await AsyncStorage.setItem(`${JOURNEY_PREFIX}${journey.skillId}`, JSON.stringify(journey));
}

export async function loadLearningJourney(skillId: string): Promise<LearningJourney | null> {
  try {
    const raw = await AsyncStorage.getItem(`${JOURNEY_PREFIX}${skillId}`);
    if (!raw) return null;
    return JSON.parse(raw) as LearningJourney;
  } catch {
    return null;
  }
}

export async function clearLearningJourney(skillId: string): Promise<void> {
  await AsyncStorage.removeItem(`${JOURNEY_PREFIX}${skillId}`);
}

/** Shape sent to /api/skills-coach (human-readable strings). */
export function practiceContextForApi(ctx: SkillPracticeContext): {
  background: string;
  roleTitle: string;
  industry: string;
  seniority: string;
} {
  const key = ctx.background;
  const bg =
    key && key in PRACTICE_BACKGROUND_LABELS
      ? PRACTICE_BACKGROUND_LABELS[key as keyof typeof PRACTICE_BACKGROUND_LABELS]
      : '';
  return {
    background: bg,
    roleTitle: ctx.roleTitle.trim(),
    industry: ctx.industry.trim(),
    seniority: ctx.seniority.trim(),
  };
}

export function isSkillPracticeContextFilled(ctx: SkillPracticeContext): boolean {
  const w = practiceContextForApi(ctx);
  return !!(w.background || w.roleTitle || w.industry || w.seniority);
}

/** How many of the 4 context fields have a value. */
export function getContextCompleteness(ctx: SkillPracticeContext): { filled: number; total: number } {
  const w = practiceContextForApi(ctx);
  let filled = 0;
  if (w.background) filled++;
  if (w.roleTitle) filled++;
  if (w.industry) filled++;
  if (w.seniority) filled++;
  return { filled, total: 4 };
}

export async function clearSkillPracticeContext(): Promise<void> {
  await AsyncStorage.removeItem(CONTEXT_KEY);
}
