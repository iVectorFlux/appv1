/**
 * Skills Storage — Skill Lab sessions and progress
 *
 * Works with skills_sessions and skills_progress tables (migration 00007).
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface SkillSessionMetadata {
  decisionOptions?: { id: string; label: string }[];
  selectedDecisionId?: string;
  selectedDecisionLabel?: string;
  consequences?: string;
  reflectionQuestion?: string;
}

export interface SkillSession {
  userId: string;
  skillId: string;
  atomicSkillId?: string | null;
  scenario: string;
  aiQuestion: string;
  userAnswer: string;
  aiFeedback: string;
  strengths?: string[];
  growthAreas?: string[];
  attemptNumber: number;
  sessionMetadata?: SkillSessionMetadata | null;
}

export interface SkillProgress {
  skillId: string;
  sessionsCompleted: number;
  lastPracticedAt: string | null;
}

/**
 * Save a completed practice round (question + answer + feedback).
 */
export async function saveSkillSession(session: SkillSession): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { error } = await supabase.from('skills_sessions').insert({
    user_id: session.userId,
    skill_id: session.skillId,
    atomic_skill_id: session.atomicSkillId ?? null,
    scenario: session.scenario,
    ai_question: session.aiQuestion,
    user_answer: session.userAnswer,
    ai_feedback: session.aiFeedback,
    strengths: session.strengths ?? null,
    growth_areas: session.growthAreas ?? null,
    attempt_number: session.attemptNumber,
    session_metadata: session.sessionMetadata ?? null,
  });

  if (error) {
    console.error('[SkillsStorage] Failed to save session:', error);
    return;
  }

  await upsertSkillProgress(session.userId, session.skillId);
}

/**
 * Increment sessions_completed and update last_practiced_at for the skill.
 */
async function upsertSkillProgress(userId: string, skillId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { data: existing } = await supabase
    .from('skills_progress')
    .select('sessions_completed')
    .eq('user_id', userId)
    .eq('skill_id', skillId)
    .maybeSingle();

  const currentCount = (existing as { sessions_completed: number } | null)?.sessions_completed ?? 0;

  const { error } = await supabase.from('skills_progress').upsert(
    {
      user_id: userId,
      skill_id: skillId,
      sessions_completed: currentCount + 1,
      last_practiced_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,skill_id' }
  );

  if (error) {
    console.error('[SkillsStorage] Failed to upsert progress:', error);
  }
}

/**
 * Get all skill progress records for a user.
 * Returns a map of skillId → SkillProgress for easy lookup.
 */
export async function getSkillsProgress(userId: string): Promise<Record<string, SkillProgress>> {
  if (!isSupabaseConfigured()) return {};

  const { data, error } = await supabase
    .from('skills_progress')
    .select('skill_id, sessions_completed, last_practiced_at')
    .eq('user_id', userId);

  if (error) {
    console.error('[SkillsStorage] Failed to load progress:', error);
    return {};
  }

  const result: Record<string, SkillProgress> = {};
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    result[row.skill_id as string] = {
      skillId: row.skill_id as string,
      sessionsCompleted: (row.sessions_completed as number) ?? 0,
      lastPracticedAt: (row.last_practiced_at as string) ?? null,
    };
  }
  return result;
}

/**
 * Get recent practice sessions for a specific skill.
 */
export async function getSkillSessions(
  userId: string,
  skillId: string,
  limit = 10
): Promise<SkillSession[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from('skills_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('skill_id', skillId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[SkillsStorage] Failed to load sessions:', error);
    return [];
  }

  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    userId: row.user_id as string,
    skillId: row.skill_id as string,
    atomicSkillId: (row.atomic_skill_id as string) ?? null,
    scenario: row.scenario as string,
    aiQuestion: row.ai_question as string,
    userAnswer: row.user_answer as string,
    aiFeedback: row.ai_feedback as string,
    strengths: (row.strengths as string[]) ?? [],
    growthAreas: (row.growth_areas as string[]) ?? [],
    attemptNumber: (row.attempt_number as number) ?? 1,
  }));
}
