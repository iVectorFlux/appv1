/**
 * Persist Big Five assessment results to Supabase (`big5_assessments`).
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { BIG5_INSTRUMENT_VERSION } from '@/data/big5-questions';
import type { Big5Scores } from '@/services/big5-scoring';

export type Big5AssessmentRow = {
  id: string;
  user_id: string;
  instrument_version: string;
  responses: Record<string, number>;
  scores: Big5Scores;
  completed_at: string;
  created_at: string;
};

export async function saveBig5Assessment(
  userId: string,
  responses: Record<string, number>,
  scores: Big5Scores,
  instrumentVersion = BIG5_INSTRUMENT_VERSION
): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    console.warn('[Big5 Storage] Supabase not configured; skip save');
    return null;
  }

  const { data, error } = await supabase
    .from('big5_assessments')
    .insert({
      user_id: userId,
      instrument_version: instrumentVersion,
      responses,
      scores: scores as unknown as Record<string, number>,
      completed_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error('[Big5 Storage] insert failed:', error.message);
    throw new Error(error.message);
  }

  return data?.id as string | null;
}

export async function getLatestBig5Assessment(userId: string): Promise<Big5AssessmentRow | null> {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await supabase
    .from('big5_assessments')
    .select('id, user_id, instrument_version, responses, scores, completed_at, created_at')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[Big5 Storage] load failed:', error.message);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id as string,
    user_id: data.user_id as string,
    instrument_version: data.instrument_version as string,
    responses: data.responses as Record<string, number>,
    scores: data.scores as Big5Scores,
    completed_at: data.completed_at as string,
    created_at: data.created_at as string,
  };
}
