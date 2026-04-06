/** Recovery Session Storage: Save to Supabase
 *
 * Saves grounding / recovery sessions to the existing
 * `recovery_sessions` Supabase table.
 * Works on all platforms (web and native) via the Supabase HTTP client.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { GroundingSession } from '@/types/grounding';

/**
 * Save a completed grounding session to Supabase.
 *
 * Uses only columns from the base recovery_sessions schema (00001) so it works
 * before migration 00006 (completion_pct, helped) is applied.
 * Maps: type='grounding', technique=mode, intensity=stressBefore, effectiveness=delta.
 */
export async function saveRecoverySession(
  userId: string,
  session: GroundingSession
): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY to .env and restart.');
  }
  try {
    const effectiveness =
      session.stressAfter != null
        ? session.stressBefore - session.stressAfter
        : null;

    const row: Record<string, unknown> = {
      user_id: userId,
      type: 'grounding',
      technique: session.mode,
      started_at: session.startedAt,
      completed_at: session.completedAt,
      duration_ms: session.durationMs,
      intensity: session.stressBefore,
      effectiveness,
    };

    const { error } = await supabase.from('recovery_sessions').insert(row);

    if (error) {
      console.error('[Recovery Storage] Failed to save session:', error);
      throw error;
    }

  } catch (error) {
    console.error('[Recovery Storage] Error:', error);
    throw error;
  }
}

/**
 * Get recent grounding sessions for a user.
 */
export async function getRecoverySessions(
  userId: string,
  limit: number = 20
): Promise<GroundingSession[]> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY to .env and restart.');
  }
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

  const normalizeMode = (t: string): GroundingSession['mode'] => {
    if (t === 'panic_interrupt') return 'box_breathing';
    return t as GroundingSession['mode'];
  };

  return (data || []).map((row: Record<string, unknown>) => ({
    mode: normalizeMode((row.technique as string) ?? 'quick_reset'),
    stressBefore: (row.intensity as number) as GroundingSession['stressBefore'],
    stressAfter: row.effectiveness != null
      ? (((row.intensity as number) - (row.effectiveness as number)) as GroundingSession['stressAfter'])
      : null,
    emotionalTone: null,
    completionPct: row.completed_at ? 100 : 0,
    durationMs: (row.duration_ms as number) || 0,
    startedAt: row.started_at as string,
    completedAt: (row.completed_at as string) || null,
    helpful: (row.helped as boolean | null) ?? null,
  }));
}
