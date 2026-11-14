/** EQ Assessment Storage: Save to Supabase
 *
 * Saves EQ assessment sessions, responses, and scores to Supabase.
 * Works on all platforms (web and native) via the Supabase HTTP client.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  cacheSegments,
  dedupeRequest,
  isCacheFresh,
  readCacheEntry,
  removeCacheSegment,
  withTimeout,
  writeCacheJson,
} from '@/lib/async-data-cache';
import type { EQAssessmentResult, EQQuestion, EQResponse } from '@/types/eq-assessment';

const EQ_SCORES_FRESH_MS = 30_000;
const EQ_SCORES_TIMEOUT_MS = 7_000;

/**
 * Start an EQ assessment session
 * Returns session ID for tracking responses
 */
export async function startEQAssessmentSession(
  userId: string,
  assessmentType: 'check_in' | 'full_test',
  totalQuestions: number
): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }
  const { data, error } = await supabase
    .from('eq_assessment_sessions')
    .insert({
      user_id: userId,
      assessment_type: assessmentType,
      status: 'in_progress',
      total_questions: totalQuestions,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error('[EQ Storage] Failed to create session:', error);
    throw new Error(error.message);
  }

  if (__DEV__) {
    console.log('[EQ Storage] Session started', { sessionId: data.id, assessmentType, totalQuestions });
  }
  return data.id as string;
}

/**
 * Save a single response in real time (upsert by session_id + question_id so back/edit is safe).
 */
export async function saveResponseToSession(
  sessionId: string,
  userId: string,
  questionId: string,
  questionType: string,
  domain: string,
  response: EQResponse,
  orderIndex: number
): Promise<void> {
  const row = {
    user_id: userId,
    session_id: sessionId,
    question_id: questionId,
    question_type: questionType,
    domain,
    response: response as unknown as Record<string, unknown>,
    score: null,
    order_index: orderIndex,
  };
  const { data: existing } = await supabase
    .from('eq_check_ins')
    .select('id')
    .eq('session_id', sessionId)
    .eq('question_id', questionId)
    .maybeSingle();

  if (existing?.id) {
    await supabase.from('eq_check_ins').update(row).eq('id', existing.id);
  } else {
    await supabase.from('eq_check_ins').insert(row);
  }

  await supabase
    .from('eq_assessment_sessions')
    .update({ questions_answered: orderIndex + 1, updated_at: new Date().toISOString() })
    .eq('id', sessionId);

  if (__DEV__) {
    console.log('[EQ Storage] Saved response', { questionId, orderIndex: orderIndex + 1 });
  }
}

/**
 * Complete an existing session: update session row and insert eq_scores.
 * Use when responses were saved in real time via saveResponseToSession.
 */
export async function completeEQAssessmentSession(
  sessionId: string,
  result: EQAssessmentResult,
  sessionStartTime: number
): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }
  const completedAt = new Date(result.completedAt);
  const durationMs = Math.max(0, Math.round(completedAt.getTime() - sessionStartTime));

  const { error: sessionError } = await supabase
    .from('eq_assessment_sessions')
    .update({
      status: 'completed',
      completed_at: result.completedAt,
      duration_ms: durationMs,
      questions_answered: result.responses.length,
      overall_score: result.overallScore,
      dimension_scores: result.dimensionScores,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (sessionError) {
    console.error('[EQ Storage] Failed to complete session:', sessionError);
    throw sessionError;
  }

  const { error: scoreError } = await supabase.from('eq_scores').upsert(
    {
      session_id: sessionId,
      user_id: result.userId,
      completed_at: result.completedAt,
      overall_score: result.overallScore,
      dimension_scores: result.dimensionScores,
      quality_indicators: result.qualityIndicators,
      strengths: result.strengths,
      growth_areas: result.growthAreas,
      insights: result.insights,
      response_ids: result.questionIds,
    },
    { onConflict: 'session_id' }
  );

  if (scoreError) {
    console.error('[EQ Storage] Failed to save score:', scoreError);
    throw scoreError;
  }
  await removeCacheSegment(cacheSegments.eqScores(result.userId));
}

/**
 * Save EQ assessment results to Supabase (legacy: no prior session).
 * Creates session, saves all responses, and creates score record.
 */
export async function saveEQAssessmentResult(
  result: EQAssessmentResult,
  questions: EQQuestion[],
  sessionStartTime: number
): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }
  const userId = result.userId;
  const completedAt = new Date(result.completedAt);
  const durationMs = Math.max(0, Math.round(completedAt.getTime() - sessionStartTime));

  try {
    const { data: sessionData, error: sessionError } = await supabase
      .from('eq_assessment_sessions')
      .insert({
        user_id: userId,
        assessment_type: result.assessmentType,
        status: 'completed',
        started_at: new Date(sessionStartTime).toISOString(),
        completed_at: result.completedAt,
        duration_ms: durationMs,
        questions_answered: result.responses.length,
        total_questions: result.questionIds.length,
        overall_score: result.overallScore,
        dimension_scores: result.dimensionScores,
      })
      .select('id')
      .single();

    if (sessionError) throw sessionError;
    const sessionId = sessionData.id as string;

    const checkIns = result.responses.map((response, index) => {
      const question = questions.find(q => q.id === response.questionId);
      return {
        user_id: userId,
        session_id: sessionId,
        question_id: response.questionId,
        question_type: response.type,
        domain: question?.dimension || 'self_awareness',
        response: response as unknown as Record<string, unknown>,
        score: null,
        order_index: index,
      };
    });

    if (checkIns.length > 0) {
      const { error: checkInsError } = await supabase.from('eq_check_ins').insert(checkIns);
      if (checkInsError) console.error('[EQ Storage] Failed to save check-ins:', checkInsError);
    }

    const { error: scoreError } = await supabase.from('eq_scores').insert({
      session_id: sessionId,
      user_id: userId,
      completed_at: result.completedAt,
      overall_score: result.overallScore,
      dimension_scores: result.dimensionScores,
      quality_indicators: result.qualityIndicators,
      strengths: result.strengths,
      growth_areas: result.growthAreas,
      insights: result.insights,
      response_ids: result.questionIds,
    });

    if (scoreError) throw scoreError;
    await removeCacheSegment(cacheSegments.eqScores(userId));
  } catch (error) {
    console.error('[EQ Storage] Error saving assessment:', error);
    throw error;
  }
}

/**
 * Get EQ scores for a user (L1/L2 cached with SWR freshness, request deduplication, and timeout fallback).
 */
export async function getEQScores(
  userId: string,
  limit: number = 50
): Promise<
  {
    id: string;
    sessionId: string;
    completedAt: string;
    overallScore: number;
    dimensionScores: Record<string, number>;
    assessmentType: 'check_in' | 'full_test';
  }[]
> {
  if (!isSupabaseConfigured() || !userId) {
    return [];
  }

  const cacheKey = cacheSegments.eqScores(userId);
  const cached = await readCacheEntry<
    {
      id: string;
      sessionId: string;
      completedAt: string;
      overallScore: number;
      dimensionScores: Record<string, number>;
      assessmentType: 'check_in' | 'full_test';
    }[]
  >(cacheKey);

  if (cached && cached.data.length >= 0 && isCacheFresh(cached.updatedAt, EQ_SCORES_FRESH_MS) && cached.data.length <= limit) {
    return cached.data.slice(0, limit);
  }

  return dedupeRequest(`eq_scores:${userId}:${limit}`, async () => {
    try {
      const { data, error } = await withTimeout(
        (async () =>
          supabase
            .from('eq_scores')
            .select(`
              id,
              session_id,
              completed_at,
              overall_score,
              dimension_scores,
              eq_assessment_sessions!inner(assessment_type)
            `)
            .eq('user_id', userId)
            .order('completed_at', { ascending: false })
            // Fetch extra rows: we only return full_test sessions in the app (check-in data may still exist in DB).
            .limit(Math.min(500, Math.max(limit * 30, 120))))(),
        EQ_SCORES_TIMEOUT_MS,
        'EQ scores fetch'
      );

      if (error) {
        console.error('[EQ Storage] Failed to fetch scores:', error);
        if (cached?.data) return cached.data.slice(0, limit);
        throw new Error(error.message || 'Could not load EQ assessments');
      }

      const rows = (data || []).map((row: {
        id: string;
        session_id: string;
        completed_at: string;
        overall_score: number;
        dimension_scores: Record<string, number>;
        eq_assessment_sessions: { assessment_type: string } | { assessment_type: string }[] | null;
      }) => {
        const rel = row.eq_assessment_sessions;
        const at = Array.isArray(rel) ? rel[0]?.assessment_type : rel?.assessment_type;
        return {
          id: row.id,
          sessionId: row.session_id,
          completedAt: row.completed_at,
          overallScore: row.overall_score,
          dimensionScores: row.dimension_scores,
          assessmentType: (at === 'full_test' || at === 'check_in' ? at : 'full_test') as 'check_in' | 'full_test',
        };
      });
      // App UI only uses full-length EQ test results; check-in rows may still exist in the database.
      const filtered = rows.filter((r) => r.assessmentType === 'full_test').slice(0, limit);
      void writeCacheJson(cacheKey, filtered);
      return filtered;
    } catch (err) {
      if (cached?.data) return cached.data.slice(0, limit);
      throw err;
    }
  });
}
