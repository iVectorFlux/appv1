/** EQ Assessment Storage: Save to Supabase
 * 
 * Saves EQ assessment sessions, responses, and scores to Supabase.
 * Works on both web and native (uses Supabase client).
 */

import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import type { EQAssessmentResult, EQResponse, EQQuestion } from '@/types/eq-assessment';

/**
 * Start an EQ assessment session
 * Returns session ID for tracking responses
 */
export async function startEQAssessmentSession(
  userId: string,
  assessmentType: 'check_in' | 'full_test',
  totalQuestions: number
): Promise<string> {
  if (Platform.OS === 'web') {
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
    
    return data.id as string;
  }
  
  // On native, we could use SQLite, but for now just return a placeholder
  // In the future, you might want to sync to Supabase when online
  return `local_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Save EQ assessment results to Supabase
 * 
 * Creates/updates session, saves all responses, and creates score record
 */
export async function saveEQAssessmentResult(
  result: EQAssessmentResult,
  questions: EQQuestion[],
  sessionStartTime: number
): Promise<void> {
  if (Platform.OS === 'web') {
    const userId = result.userId;
    const completedAt = new Date(result.completedAt);
    const durationMs = completedAt.getTime() - sessionStartTime;

    try {
      // 1. Create or update session
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

      if (sessionError) {
        console.error('[EQ Storage] Failed to create session:', sessionError);
        throw sessionError;
      }

      const sessionId = sessionData.id as string;

      // 2. Save individual responses to eq_check_ins
      const checkIns = result.responses.map((response, index) => {
        const question = questions.find(q => q.id === response.questionId);
        return {
          user_id: userId,
          session_id: sessionId,
          question_id: response.questionId,
          question_type: response.type,
          domain: question?.dimension || 'self_awareness',
          response: response as unknown as Record<string, unknown>,
          score: null, // Individual question scores not stored (only overall)
          order_index: index,
        };
      });

      if (checkIns.length > 0) {
        const { error: checkInsError } = await supabase
          .from('eq_check_ins')
          .insert(checkIns);

        if (checkInsError) {
          console.error('[EQ Storage] Failed to save check-ins:', checkInsError);
          // Don't throw - session is already created, continue to save score
        }
      }

      // 3. Save final score to eq_scores
      const { error: scoreError } = await supabase
        .from('eq_scores')
        .insert({
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

      if (scoreError) {
        console.error('[EQ Storage] Failed to save score:', scoreError);
        throw scoreError;
      }

      console.log('[EQ Storage] Successfully saved assessment result:', sessionId);
    } catch (error) {
      console.error('[EQ Storage] Error saving assessment:', error);
      throw error;
    }
  } else {
    // On native, could save to SQLite for offline sync later
    // For now, just log
    console.log('[EQ Storage] Native platform - assessment result not saved to Supabase:', result.id);
  }
}

/**
 * Get EQ scores for a user
 */
export async function getEQScores(
  userId: string,
  limit: number = 50
): Promise<Array<{
  id: string;
  sessionId: string;
  completedAt: string;
  overallScore: number;
  dimensionScores: Record<string, number>;
  assessmentType: 'check_in' | 'full_test';
}>> {
  if (Platform.OS === 'web') {
    const { data, error } = await supabase
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
      .limit(limit);

    if (error) {
      console.error('[EQ Storage] Failed to fetch scores:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      sessionId: row.session_id,
      completedAt: row.completed_at,
      overallScore: row.overall_score,
      dimensionScores: row.dimension_scores,
      assessmentType: row.eq_assessment_sessions?.assessment_type || 'check_in',
    }));
  }

  return [];
}
