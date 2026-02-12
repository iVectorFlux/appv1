/** Recovery Session Storage: Save to Supabase
 *
 * Saves grounding / recovery sessions to the existing
 * `recovery_sessions` Supabase table.
 * Follows the same pattern as eq-storage.ts.
 */

import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import type { GroundingSession } from '@/types/grounding';

/**
 * Save a completed grounding session to Supabase.
 *
 * Maps GroundingSession fields to recovery_sessions columns:
 *   type        = 'grounding'
 *   technique   = session.mode (e.g. 'quick_reset')
 *   intensity   = stressBefore (1-5)
 *   effectiveness = stressBefore - stressAfter (positive = improved)
 *   duration_ms = session.durationMs
 */
export async function saveRecoverySession(
  userId: string,
  session: GroundingSession
): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      const effectiveness =
        session.stressAfter != null
          ? session.stressBefore - session.stressAfter
          : null;

      const { error } = await supabase.from('recovery_sessions').insert({
        user_id: userId,
        type: 'grounding',
        technique: session.mode,
        started_at: session.startedAt,
        completed_at: session.completedAt,
        duration_ms: session.durationMs,
        intensity: session.stressBefore,
        effectiveness,
      });

      if (error) {
        console.error('[Recovery Storage] Failed to save session:', error);
        throw error;
      }

      console.log('[Recovery Storage] Saved grounding session:', session.mode);
    } catch (error) {
      console.error('[Recovery Storage] Error:', error);
      throw error;
    }
  } else {
    console.log('[Recovery Storage] Native — session not saved to Supabase:', session.mode);
  }
}

/**
 * Get recent grounding sessions for a user.
 */
export async function getRecoverySessions(
  userId: string,
  limit: number = 20
): Promise<GroundingSession[]> {
  if (Platform.OS === 'web') {
    const { data, error } = await supabase
      .from('recovery_sessions')
      .select('technique, intensity, effectiveness, duration_ms, started_at, completed_at')
      .eq('user_id', userId)
      .eq('type', 'grounding')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[Recovery Storage] Failed to fetch sessions:', error);
      return [];
    }

    return (data || []).map((row: Record<string, unknown>) => ({
      mode: (row.technique as string) as GroundingSession['mode'],
      stressBefore: (row.intensity as number) as GroundingSession['stressBefore'],
      stressAfter: row.effectiveness != null
        ? (((row.intensity as number) - (row.effectiveness as number)) as GroundingSession['stressAfter'])
        : null,
      emotionalTone: null, // Not stored in current schema
      completionPct: row.completed_at ? 100 : 0,
      durationMs: (row.duration_ms as number) || 0,
      startedAt: row.started_at as string,
      completedAt: (row.completed_at as string) || null,
    }));
  }

  return [];
}
