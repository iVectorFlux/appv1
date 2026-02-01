/**
 * Learning progress tracking
 *
 * Upserts to Supabase learning_progress for video/audio completion and last_accessed_at.
 * Requires learning_modules to have a row with matching id (app uses same ids as learning-content).
 */

import { supabase } from '@/lib/supabase';

export type LearningProgressUpdate = {
  video_completed?: boolean;
  audio_completed?: boolean;
  video_progress_pct?: number;
  audio_progress_pct?: number;
  last_accessed_at?: string; // ISO
};

/**
 * Record or update learning progress for a user and module.
 * Uses upsert on (user_id, module_id). Pass only the fields you want to update.
 */
export async function upsertLearningProgress(
  userId: string,
  moduleId: string,
  updates: LearningProgressUpdate
): Promise<void> {
  const payload: Record<string, unknown> = {
    user_id: userId,
    module_id: moduleId,
    updated_at: new Date().toISOString(),
  };
  if (updates.video_completed !== undefined) payload.video_completed = updates.video_completed;
  if (updates.audio_completed !== undefined) payload.audio_completed = updates.audio_completed;
  if (updates.video_progress_pct !== undefined) payload.video_progress_pct = updates.video_progress_pct;
  if (updates.audio_progress_pct !== undefined) payload.audio_progress_pct = updates.audio_progress_pct;
  if (updates.last_accessed_at !== undefined) payload.last_accessed_at = updates.last_accessed_at;

  await supabase.from('learning_progress').upsert(payload, {
    onConflict: 'user_id,module_id',
  });
}

/** Mark last accessed now for a module (e.g. when user opens the detail screen). */
export async function recordLastAccessed(userId: string, moduleId: string): Promise<void> {
  await upsertLearningProgress(userId, moduleId, {
    last_accessed_at: new Date().toISOString(),
  });
}

/** Mark video as completed. */
export async function recordVideoCompleted(userId: string, moduleId: string): Promise<void> {
  await upsertLearningProgress(userId, moduleId, {
    video_completed: true,
    video_progress_pct: 100,
    last_accessed_at: new Date().toISOString(),
  });
}

/** Mark audio as completed. */
export async function recordAudioCompleted(userId: string, moduleId: string): Promise<void> {
  await upsertLearningProgress(userId, moduleId, {
    audio_completed: true,
    audio_progress_pct: 100,
    last_accessed_at: new Date().toISOString(),
  });
}
