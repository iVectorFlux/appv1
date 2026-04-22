/** Recovery Session Storage: Save to Supabase
 *
 * Saves grounding / recovery sessions to the
 * `recovery_sessions` Supabase table.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { GroundingSession } from '@/types/grounding';

const SAVE_RETRIES = 3;
const RETRY_DELAY_MS = 400;

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Save a completed grounding session to Supabase.
 * Persists intensity, effectiveness delta, completion, helpful flag, stress_after, and metadata for analytics.
 */
export async function saveRecoverySession(
  userId: string,
  session: GroundingSession,
  extraMetadata?: Record<string, unknown>
): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY to .env and restart.');
  }

  const {
    data: { session: authSession },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    console.error('[Recovery Storage] getSession error:', sessionError.message);
  }
  if (!authSession?.user) {
    const err = new Error('Not signed in. Sign in again to save your recovery session.');
    console.error('[Recovery Storage] No auth session - insert would fail RLS');
    throw err;
  }
  if (authSession.user.id !== userId) {
    console.warn('[Recovery Storage] userId param does not match auth user; using auth uid for insert', {
      param: userId,
      authUid: authSession.user.id,
    });
  }

  const uid = authSession.user.id;

  const effectiveness =
    session.stressAfter != null ? session.stressBefore - session.stressAfter : null;

  const session_metadata = {
    emotional_tone: session.emotionalTone,
    ...(extraMetadata && typeof extraMetadata === 'object' ? extraMetadata : {}),
  };

  const row: Record<string, unknown> = {
    user_id: uid,
    type: 'grounding',
    technique: session.mode,
    started_at: session.startedAt,
    completed_at: session.completedAt,
    duration_ms: session.durationMs,
    intensity: session.stressBefore,
    effectiveness,
    completion_pct: session.completionPct,
    helped: session.helpful,
    stress_after: session.stressAfter,
    session_metadata,
  };

  let lastErr: Error | null = null;

  for (let attempt = 1; attempt <= SAVE_RETRIES; attempt++) {
    const { data, error } = await supabase.from('recovery_sessions').insert(row).select('id').single();

    if (!error && data) {
      if (__DEV__) {
        console.log('[Recovery Storage] Session saved', { id: data.id, technique: session.mode, attempt });
      }
      return;
    }

    const msg = error?.message ?? '';
    const missingOptionalCols =
      /session_metadata|stress_after|completion_pct|helped/i.test(msg) ||
      (error?.code === 'PGRST204' && /column/i.test(msg));

    if (
      missingOptionalCols &&
      (row.session_metadata !== undefined ||
        row.stress_after !== undefined ||
        row.completion_pct !== undefined ||
        row.helped !== undefined)
    ) {
      const {
        session_metadata: _sm,
        stress_after: _sa,
        completion_pct: _cp,
        helped: _h,
        ...rest
      } = row;
      console.warn('[Recovery Storage] Retrying insert with base columns only (apply migrations 00006 / 00023 for full data)');
      const { data: d2, error: e2 } = await supabase.from('recovery_sessions').insert(rest).select('id').single();
      if (!e2 && d2) {
        if (__DEV__) console.log('[Recovery Storage] Session saved (partial columns)', { id: d2.id, technique: session.mode });
        return;
      }
      lastErr = e2 ? new Error(e2.message) : lastErr;
    } else if (error) {
      const hint =
        error.code === '42501' || /row-level security|rls|permission denied/i.test(error.message ?? '')
          ? ' If this persists, apply migration 00024_recovery_sessions_insert_rls.sql (INSERT policy).'
          : '';
      lastErr = new Error((error.message ?? 'Insert failed') + hint);
      console.warn(`[Recovery Storage] insert attempt ${attempt}/${SAVE_RETRIES}:`, error.code, error.message);
    }

    if (attempt < SAVE_RETRIES) await delay(RETRY_DELAY_MS);
  }

  console.error('[Recovery Storage] Failed to save session after retries:', lastErr);
  throw lastErr ?? new Error('Could not save recovery session');
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
  const fullSelect = await supabase
    .from('recovery_sessions')
    .select(
      'technique, intensity, effectiveness, duration_ms, started_at, completed_at, stress_after, helped, completion_pct, session_metadata'
    )
    .eq('user_id', userId)
    .eq('type', 'grounding')
    .order('started_at', { ascending: false })
    .limit(limit);

  let rows: Record<string, unknown>[] = (fullSelect.data as Record<string, unknown>[]) ?? [];
  let error = fullSelect.error;

  if (error && /column|schema/i.test(error.message)) {
    console.warn('[Recovery Storage] Retrying fetch without optional columns');
    const fallback = await supabase
      .from('recovery_sessions')
      .select('technique, intensity, effectiveness, duration_ms, started_at, completed_at, helped, completion_pct')
      .eq('user_id', userId)
      .eq('type', 'grounding')
      .order('started_at', { ascending: false })
      .limit(limit);
    rows = (fallback.data as Record<string, unknown>[]) ?? [];
    error = fallback.error;
  }

  if (error) {
    console.error('[Recovery Storage] Failed to fetch sessions:', error);
    throw new Error(error.message || 'Could not load Recover sessions');
  }

  const normalizeMode = (t: string): GroundingSession['mode'] => {
    if (t === 'panic_interrupt') return 'box_breathing';
    return t as GroundingSession['mode'];
  };

  return rows.map((row: Record<string, unknown>) => {
    const intensity = row.intensity as number;
    const effectivenessVal = row.effectiveness as number | null;
    const stressAfterCol = row.stress_after as number | null | undefined;
    const meta = (row.session_metadata as { emotional_tone?: string } | null) ?? {};

    let stressAfter: GroundingSession['stressAfter'];
    if (stressAfterCol != null && stressAfterCol >= 1 && stressAfterCol <= 5) {
      stressAfter = stressAfterCol as GroundingSession['stressAfter'];
    } else if (effectivenessVal != null) {
      stressAfter = (intensity - effectivenessVal) as GroundingSession['stressAfter'];
    } else {
      stressAfter = null;
    }

    const toneRaw = meta.emotional_tone;
    const emotionalTone =
      toneRaw &&
      [
        'anxious',
        'overwhelmed',
        'angry',
        'panicked',
        'scattered',
        'tense',
        'numb',
        'sad',
        'restless',
      ].includes(toneRaw)
        ? (toneRaw as GroundingSession['emotionalTone'])
        : null;

    return {
      mode: normalizeMode((row.technique as string) ?? 'quick_reset'),
      stressBefore: intensity as GroundingSession['stressBefore'],
      stressAfter,
      emotionalTone,
      completionPct: typeof row.completion_pct === 'number' ? row.completion_pct : row.completed_at ? 100 : 0,
      durationMs: (row.duration_ms as number) || 0,
      startedAt: row.started_at as string,
      completedAt: (row.completed_at as string) || null,
      helpful: typeof row.helped === 'boolean' ? row.helped : null,
    };
  });
}
