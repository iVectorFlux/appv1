/**
 * Skills Storage — Skill Lab sessions and progress
 *
 * Works with skills_sessions and skills_progress tables (migrations 00007–00009).
 *
 * Per-session data saved:
 *   skill_id, atomic_skill_id, scenario, ai_question, user_answer, ai_feedback,
 *   strengths, growth_areas, attempt_number, duration_ms, practice_mode,
 *   session_metadata (JSONB — decision options, chosen path, consequences, etc.)
 *
 * Aggregated per-skill analytics updated on every save:
 *   sessions_completed, scenarios_attempted, total_time_ms,
 *   last_practiced_at, top_strengths, top_growth_areas, atomic_skill_breakdown
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { upsertLearningProgress } from '@/services/learning-progress';

const SKILL_SESSION_SAVE_RETRIES = 3;
const SKILL_SESSION_RETRY_DELAY_MS = 700;

async function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export interface SkillSessionMetadata {
  practiceMode?: string;
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
  /** Coach-assigned quality score 0–10 for this response. */
  aiScore?: number;
  strengths?: string[];
  growthAreas?: string[];
  attemptNumber: number;
  /** Time in ms from scenario load to feedback received. */
  durationMs?: number;
  /** Which practice workflow was used. */
  practiceMode?: string;
  sessionMetadata?: SkillSessionMetadata | null;
}

export interface SkillProgress {
  skillId: string;
  sessionsCompleted: number;
  scenariosAttempted: number;
  totalTimeMs: number;
  lastPracticedAt: string | null;
  topStrengths: string[];
  topGrowthAreas: string[];
  atomicSkillBreakdown: Record<string, number>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Save a completed practice round
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Persist one completed practice round + aggregated progress + learning_progress (if module exists).
 * Retries on transient failures so native builds don’t silently drop sessions.
 */
export async function saveSkillSession(session: SkillSession): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    console.warn('[SkillsStorage] Supabase not configured — session not saved.');
    return false;
  }

  const row = {
    user_id: session.userId,
    skill_id: session.skillId,
    atomic_skill_id: session.atomicSkillId ?? null,
    scenario: session.scenario,
    ai_question: session.aiQuestion,
    user_answer: session.userAnswer,
    ai_feedback: session.aiFeedback,
    ai_score:
      session.aiScore != null && Number.isFinite(session.aiScore)
        ? Math.min(10, Math.max(0, Math.round(session.aiScore)))
        : null,
    strengths: session.strengths ?? null,
    growth_areas: session.growthAreas ?? null,
    attempt_number: session.attemptNumber,
    duration_ms: session.durationMs ?? null,
    practice_mode: session.practiceMode ?? null,
    session_metadata: session.sessionMetadata ?? null,
  };

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= SKILL_SESSION_SAVE_RETRIES; attempt++) {
    const { error } = await supabase.from('skills_sessions').insert(row);
    if (!error) {
      const completed = await upsertSkillProgressAfterSession(session);
      if (completed != null) {
        await syncSkillLabToLearningProgress(session.userId, session.skillId, completed);
      }
      return true;
    }
    lastError = new Error(error.message);
    console.warn(`[SkillsStorage] save session attempt ${attempt}/${SKILL_SESSION_SAVE_RETRIES}:`, error.message);
    if (attempt < SKILL_SESSION_SAVE_RETRIES) await delay(SKILL_SESSION_RETRY_DELAY_MS);
  }

  console.error('[SkillsStorage] Failed to save session after retries:', lastError);
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Upsert aggregated progress after each session
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Updates aggregates after a saved session row.
 * `scenarios_attempted` is only incremented in `recordScenarioAttempt` (each scenario start), not here — avoids double-counting.
 * Returns new sessions_completed total, or null on failure.
 */
async function upsertSkillProgressAfterSession(session: SkillSession): Promise<number | null> {
  if (!isSupabaseConfigured()) return null;

  const { data: existing } = await supabase
    .from('skills_progress')
    .select('sessions_completed, scenarios_attempted, total_time_ms, top_strengths, top_growth_areas, atomic_skill_breakdown')
    .eq('user_id', session.userId)
    .eq('skill_id', session.skillId)
    .maybeSingle();

  const prev = (existing as Record<string, unknown> | null) ?? {};
  const prevCompleted = (prev.sessions_completed as number) ?? 0;
  const prevAttempted = (prev.scenarios_attempted as number) ?? 0;
  const prevTimeMs = (prev.total_time_ms as number) ?? 0;

  // Merge strength/growth-area frequency maps
  const prevStrengths = (prev.top_strengths as string[]) ?? [];
  const prevGrowth = (prev.top_growth_areas as string[]) ?? [];
  const newStrengths = mergeTagFrequency(prevStrengths, session.strengths ?? [], 10);
  const newGrowth = mergeTagFrequency(prevGrowth, session.growthAreas ?? [], 10);

  // Merge atomic skill breakdown: { atomicSkillId: count }
  const prevBreakdown = (prev.atomic_skill_breakdown as Record<string, number>) ?? {};
  const newBreakdown = { ...prevBreakdown };
  if (session.atomicSkillId) {
    newBreakdown[session.atomicSkillId] = (newBreakdown[session.atomicSkillId] ?? 0) + 1;
  }

  const nextCompleted = prevCompleted + 1;

  const { error } = await supabase.from('skills_progress').upsert(
    {
      user_id: session.userId,
      skill_id: session.skillId,
      sessions_completed: nextCompleted,
      scenarios_attempted: prevAttempted,
      total_time_ms: prevTimeMs + (session.durationMs ?? 0),
      last_practiced_at: new Date().toISOString(),
      top_strengths: newStrengths,
      top_growth_areas: newGrowth,
      atomic_skill_breakdown: newBreakdown,
    },
    { onConflict: 'user_id,skill_id' }
  );

  if (error) {
    console.error('[SkillsStorage] Failed to upsert progress:', error);
    return null;
  }
  return nextCompleted;
}

/** Mirror Skill Lab completions into learning_progress for cross-tab “learning” analytics. */
async function syncSkillLabToLearningProgress(
  userId: string,
  skillId: string,
  sessionsCompleted: number
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const video_progress_pct = Math.min(100, Math.max(0, sessionsCompleted * 15));
  try {
    await upsertLearningProgress(userId, skillId, {
      last_accessed_at: new Date().toISOString(),
      video_progress_pct,
    });
  } catch (e) {
    console.warn('[SkillsStorage] learning_progress sync skipped:', e);
  }
}

/**
 * Merge new tags into an existing frequency list (most frequent first).
 * Deduplicates, increments counts for repeated tags, and caps at maxKeep.
 *
 * Stored format: flat string array ordered by frequency (index 0 = most common).
 * Simple approach — no separate count map needed for display purposes.
 */
function mergeTagFrequency(existing: string[], incoming: string[], maxKeep: number): string[] {
  const countMap: Record<string, number> = {};
  for (let i = 0; i < existing.length; i++) {
    countMap[existing[i]] = (existing.length - i); // rough frequency weight
  }
  for (const tag of incoming) {
    const key = tag.toLowerCase().trim();
    if (key) countMap[key] = (countMap[key] ?? 0) + 1;
  }
  return Object.entries(countMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, maxKeep)
    .map(([tag]) => tag);
}

// ─────────────────────────────────────────────────────────────────────────────
// Record a scenario start (for scenarios_attempted before feedback is received)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Call when a scenario is generated (before the user answers).
 * Increments scenarios_attempted so we can track completion rates.
 */
export async function recordScenarioAttempt(userId: string, skillId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { data: existing } = await supabase
    .from('skills_progress')
    .select('scenarios_attempted, sessions_completed, total_time_ms')
    .eq('user_id', userId)
    .eq('skill_id', skillId)
    .maybeSingle();

  const prev = (existing as Record<string, unknown> | null) ?? {};

  await supabase.from('skills_progress').upsert(
    {
      user_id: userId,
      skill_id: skillId,
      sessions_completed: (prev.sessions_completed as number) ?? 0,
      scenarios_attempted: ((prev.scenarios_attempted as number) ?? 0) + 1,
      total_time_ms: (prev.total_time_ms as number) ?? 0,
    },
    { onConflict: 'user_id,skill_id' }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Read progress
// ─────────────────────────────────────────────────────────────────────────────

export async function getSkillsProgress(userId: string): Promise<Record<string, SkillProgress>> {
  if (!isSupabaseConfigured()) return {};

  const { data, error } = await supabase
    .from('skills_progress')
    .select('skill_id, sessions_completed, scenarios_attempted, total_time_ms, last_practiced_at, top_strengths, top_growth_areas, atomic_skill_breakdown')
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
      scenariosAttempted: (row.scenarios_attempted as number) ?? 0,
      totalTimeMs: (row.total_time_ms as number) ?? 0,
      lastPracticedAt: (row.last_practiced_at as string) ?? null,
      topStrengths: (row.top_strengths as string[]) ?? [],
      topGrowthAreas: (row.top_growth_areas as string[]) ?? [],
      atomicSkillBreakdown: (row.atomic_skill_breakdown as Record<string, number>) ?? {},
    };
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Read sessions
// ─────────────────────────────────────────────────────────────────────────────

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
    aiScore:
      row.ai_score != null && row.ai_score !== ''
        ? Number(row.ai_score)
        : undefined,
    strengths: (row.strengths as string[]) ?? [],
    growthAreas: (row.growth_areas as string[]) ?? [],
    attemptNumber: (row.attempt_number as number) ?? 1,
    durationMs: (row.duration_ms as number) ?? undefined,
    practiceMode: (row.practice_mode as string) ?? undefined,
  }));
}
