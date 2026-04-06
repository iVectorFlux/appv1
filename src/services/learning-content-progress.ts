/**
 * Progress for learning_content episodes (see learning_content_progress table).
 */

import { supabase } from '@/lib/supabase';

export type LearningContentProgressUpdate = {
  video_completed?: boolean;
  audio_completed?: boolean;
  video_progress_pct?: number;
  audio_progress_pct?: number;
  last_accessed_at?: string;
};

export async function upsertLearningContentProgress(
  userId: string,
  episodeKey: string,
  updates: LearningContentProgressUpdate
): Promise<void> {
  const payload: Record<string, unknown> = {
    user_id: userId,
    episode_key: episodeKey,
    updated_at: new Date().toISOString(),
  };
  if (updates.video_completed !== undefined) payload.video_completed = updates.video_completed;
  if (updates.audio_completed !== undefined) payload.audio_completed = updates.audio_completed;
  if (updates.video_progress_pct !== undefined) payload.video_progress_pct = updates.video_progress_pct;
  if (updates.audio_progress_pct !== undefined) payload.audio_progress_pct = updates.audio_progress_pct;
  if (updates.last_accessed_at !== undefined) payload.last_accessed_at = updates.last_accessed_at;

  const { error } = await supabase.from('learning_content_progress').upsert(payload, {
    onConflict: 'user_id,episode_key',
  });
  if (error) console.warn('learning_content_progress upsert failed:', error.message);
}

export async function recordEpisodeLastAccessed(userId: string, episodeKey: string): Promise<void> {
  await upsertLearningContentProgress(userId, episodeKey, {
    last_accessed_at: new Date().toISOString(),
  });
}

export async function recordEpisodeVideoCompleted(userId: string, episodeKey: string): Promise<void> {
  await upsertLearningContentProgress(userId, episodeKey, {
    video_completed: true,
    video_progress_pct: 100,
    last_accessed_at: new Date().toISOString(),
  });
}

export async function recordEpisodeAudioCompleted(userId: string, episodeKey: string): Promise<void> {
  await upsertLearningContentProgress(userId, episodeKey, {
    audio_completed: true,
    audio_progress_pct: 100,
    last_accessed_at: new Date().toISOString(),
  });
}
