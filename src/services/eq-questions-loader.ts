/**
 * Load EQ questions from the database (optional).
 * Use when eq_questions is populated; otherwise the app uses the in-code question bank.
 */

import { supabase } from '@/lib/supabase';
import type { EQQuestion } from '@/types/eq-assessment';
import { FULL_TEST_CONFIG, CHECK_IN_CONFIG } from '@/types/eq-assessment';

export interface EqQuestionRow {
  id: string;
  type: string;
  domain: string;
  facet: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  version: number;
  reverse_keyed: boolean;
  negative_marking: boolean;
  scoring_config: Record<string, unknown>;
  payload: Record<string, unknown>;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Fetch all active questions from eq_questions and map to EQQuestion[].
 * Returns null on error or if the table is empty (caller should fall back to in-code bank).
 */
export async function loadEqQuestionsFromDb(): Promise<EQQuestion[] | null> {
  const { data, error } = await supabase
    .from('eq_questions')
    .select('id, type, domain, facet, difficulty, version, reverse_keyed, negative_marking, scoring_config, payload')
    .eq('is_active', true);

  if (error || !data || data.length === 0) {
    if (__DEV__) {
      console.log('[EQ Loader] Questions from DB: none', error ? { error: error.message } : '(table empty)');
    }
    return null;
  }

  const questions: EQQuestion[] = [];
  for (const row of data as EqQuestionRow[]) {
    const q = dbRowToEqQuestion(row);
    if (q) questions.push(q);
  }
  if (__DEV__) {
    console.log('[EQ Loader] Questions from DB:', questions.length);
  }
  return questions;
}

/**
 * Select full-test question set from a pool (e.g. from DB), using FULL_TEST_CONFIG counts.
 */
export function selectFullTestFromPool(pool: EQQuestion[]): EQQuestion[] {
  const counts = FULL_TEST_CONFIG.questionCounts;
  const byType = new Map<string, EQQuestion[]>();
  for (const q of pool) {
    const list = byType.get(q.type) || [];
    list.push(q);
    byType.set(q.type, list);
  }
  const out: EQQuestion[] = [];
  const types = [
    'forced_choice', 'likert', 'emotion_vocabulary', 'meta_eq', 'physiological_proxy',
    'consistency_probe', 'ranking_allocation', 'sjt_decision', 'emotion_perception',
  ] as const;
  for (const t of types) {
    const n = counts[t] ?? 0;
    const list = byType.get(t) || [];
    out.push(...shuffle(list).slice(0, n));
  }
  return shuffle(out);
}

/**
 * Select check-in question set from a pool, using CHECK_IN_CONFIG counts.
 */
export function selectCheckInFromPool(pool: EQQuestion[]): EQQuestion[] {
  const counts = CHECK_IN_CONFIG.questionCounts;
  const byType = new Map<string, EQQuestion[]>();
  for (const q of pool) {
    const list = byType.get(q.type) || [];
    list.push(q);
    byType.set(q.type, list);
  }
  const out: EQQuestion[] = [];
  const types = [
    'forced_choice', 'likert', 'emotion_vocabulary', 'meta_eq', 'physiological_proxy',
    'consistency_probe', 'ranking_allocation', 'sjt_decision', 'emotion_perception',
  ] as const;
  for (const t of types) {
    const n = counts[t] ?? 0;
    const list = byType.get(t) || [];
    out.push(...shuffle(list).slice(0, n));
  }
  return shuffle(out);
}

/**
 * Load full-test questions from DB; returns null if table empty/error (use in-code fallback).
 */
export async function loadFullTestQuestions(): Promise<EQQuestion[] | null> {
  const pool = await loadEqQuestionsFromDb();
  if (!pool || pool.length === 0) return null;
  return selectFullTestFromPool(pool);
}

/**
 * Load check-in questions from DB; returns null if table empty/error (use in-code fallback).
 */
export async function loadCheckInQuestions(): Promise<EQQuestion[] | null> {
  const pool = await loadEqQuestionsFromDb();
  if (!pool || pool.length === 0) return null;
  return selectCheckInFromPool(pool);
}

/**
 * Map a single DB row back to EQQuestion (payload is the stored full question).
 */
function dbRowToEqQuestion(row: EqQuestionRow): EQQuestion | null {
  const payload = row.payload as Record<string, unknown>;
  const base = {
    id: row.id,
    type: row.type,
    dimension: row.domain as EQQuestion['dimension'],
    facet: row.facet as EQQuestion['facet'],
    difficulty: row.difficulty,
    version: row.version,
  };
  const merged = { ...payload, ...base };
  return merged as EQQuestion;
}
