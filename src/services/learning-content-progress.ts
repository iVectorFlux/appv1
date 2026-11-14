/**
 * Progress & Watch-Time Persistence for learning_content episodes
 * (see learning_content_progress table + migration 00029).
 *
 * Persists exact video/audio playback positions locally via AsyncStorage AND in Supabase
 * so learners resume right where they left off or can explicitly restart from 0:00.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  cacheSegments,
  dedupeRequest,
  isCacheFresh,
  readCacheEntry,
  readCacheJson,
  withTimeout,
  writeCacheJson,
} from '@/lib/async-data-cache';

export type LearningContentProgressUpdate = {
  video_completed?: boolean;
  audio_completed?: boolean;
  video_progress_pct?: number;
  audio_progress_pct?: number;
  video_position_seconds?: number;
  audio_position_seconds?: number;
  last_accessed_at?: string;
};

export interface LearningContentProgressRow {
  episodeKey: string;
  videoCompleted: boolean;
  audioCompleted: boolean;
  videoProgressPct: number;
  audioProgressPct: number;
  videoPositionSeconds: number;
  audioPositionSeconds: number;
  lastAccessedAt: string | null;
}

const LOCAL_SEGMENT = (userId: string) => cacheSegments.learningProgress(userId);
const PROGRESS_FRESH_MS = 15_000;
const PROGRESS_TIMEOUT_MS = 6_000;

function isMissingPositionColumnError(message: string | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes('video_position_seconds') ||
    m.includes('audio_position_seconds') ||
    m.includes('schema cache') ||
    m.includes('does not exist')
  );
}

async function readLocalProgressMap(userId: string): Promise<Record<string, LearningContentProgressRow>> {
  if (!userId) return {};
  const cached = await readCacheJson<Record<string, LearningContentProgressRow>>(LOCAL_SEGMENT(userId));
  return cached ?? {};
}

async function mergeLocalProgressUpdate(
  userId: string,
  episodeKey: string,
  updates: LearningContentProgressUpdate
): Promise<void> {
  if (!userId || !episodeKey) return;
  const map = await readLocalProgressMap(userId);
  const existing: LearningContentProgressRow = map[episodeKey] ?? {
    episodeKey,
    videoCompleted: false,
    audioCompleted: false,
    videoProgressPct: 0,
    audioProgressPct: 0,
    videoPositionSeconds: 0,
    audioPositionSeconds: 0,
    lastAccessedAt: null,
  };
  map[episodeKey] = {
    episodeKey,
    videoCompleted: updates.video_completed ?? existing.videoCompleted,
    audioCompleted: updates.audio_completed ?? existing.audioCompleted,
    videoProgressPct:
      updates.video_progress_pct !== undefined
        ? Math.max(existing.videoCompleted ? 100 : 0, updates.video_progress_pct)
        : existing.videoProgressPct,
    audioProgressPct:
      updates.audio_progress_pct !== undefined
        ? Math.max(existing.audioCompleted ? 100 : 0, updates.audio_progress_pct)
        : existing.audioProgressPct,
    videoPositionSeconds:
      updates.video_position_seconds !== undefined
        ? Math.max(0, Math.floor(updates.video_position_seconds))
        : existing.videoPositionSeconds,
    audioPositionSeconds:
      updates.audio_position_seconds !== undefined
        ? Math.max(0, Math.floor(updates.audio_position_seconds))
        : existing.audioPositionSeconds,
    lastAccessedAt: updates.last_accessed_at ?? existing.lastAccessedAt,
  };
  await writeCacheJson(LOCAL_SEGMENT(userId), map);
}

export async function upsertLearningContentProgress(
  userId: string,
  episodeKey: string,
  updates: LearningContentProgressUpdate
): Promise<void> {
  await mergeLocalProgressUpdate(userId, episodeKey, updates);

  if (!isSupabaseConfigured() || !userId || !episodeKey) return;
  const payload: Record<string, unknown> = {
    user_id: userId,
    episode_key: episodeKey,
    updated_at: new Date().toISOString(),
  };
  if (updates.video_completed !== undefined) payload.video_completed = updates.video_completed;
  if (updates.audio_completed !== undefined) payload.audio_completed = updates.audio_completed;
  if (updates.video_progress_pct !== undefined) payload.video_progress_pct = updates.video_progress_pct;
  if (updates.audio_progress_pct !== undefined) payload.audio_progress_pct = updates.audio_progress_pct;
  if (updates.video_position_seconds !== undefined) payload.video_position_seconds = updates.video_position_seconds;
  if (updates.audio_position_seconds !== undefined) payload.audio_position_seconds = updates.audio_position_seconds;
  if (updates.last_accessed_at !== undefined) payload.last_accessed_at = updates.last_accessed_at;

  const { error } = await supabase.from('learning_content_progress').upsert(payload, {
    onConflict: 'user_id,episode_key',
  });
  if (error && isMissingPositionColumnError(error.message)) {
    // Graceful fallback if migration 00029 hasn't been applied on DB yet
    const fallbackPayload = { ...payload };
    delete fallbackPayload.video_position_seconds;
    delete fallbackPayload.audio_position_seconds;
    const retry = await supabase.from('learning_content_progress').upsert(fallbackPayload, {
      onConflict: 'user_id,episode_key',
    });
    if (retry.error) console.warn('learning_content_progress upsert failed:', retry.error.message);
    return;
  }
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
    video_position_seconds: 0,
    last_accessed_at: new Date().toISOString(),
  });
}

export async function recordEpisodeAudioCompleted(userId: string, episodeKey: string): Promise<void> {
  await upsertLearningContentProgress(userId, episodeKey, {
    audio_completed: true,
    audio_progress_pct: 100,
    audio_position_seconds: 0,
    last_accessed_at: new Date().toISOString(),
  });
}

export async function recordEpisodeVideoProgress(
  userId: string,
  episodeKey: string,
  pct: number
): Promise<void> {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  await upsertLearningContentProgress(userId, episodeKey, {
    video_progress_pct: clamped,
    ...(clamped >= 85 ? { video_completed: true } : {}),
    last_accessed_at: new Date().toISOString(),
  });
}

export async function recordEpisodeAudioProgress(
  userId: string,
  episodeKey: string,
  pct: number
): Promise<void> {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  await upsertLearningContentProgress(userId, episodeKey, {
    audio_progress_pct: clamped,
    ...(clamped >= 85 ? { audio_completed: true } : {}),
    last_accessed_at: new Date().toISOString(),
  });
}

export async function saveEpisodePlaybackPosition(
  userId: string,
  episodeKey: string,
  kind: 'video' | 'audio',
  positionSeconds: number,
  durationSeconds: number
): Promise<void> {
  if (!userId || !episodeKey) return;
  const safePos = Math.max(0, Math.floor(positionSeconds));
  const pct =
    durationSeconds > 0
      ? Math.max(0, Math.min(100, Math.round((positionSeconds / durationSeconds) * 100)))
      : undefined;

  if (kind === 'video') {
    await upsertLearningContentProgress(userId, episodeKey, {
      video_position_seconds: safePos,
      ...(pct !== undefined ? { video_progress_pct: pct } : {}),
      ...(pct !== undefined && pct >= 85 ? { video_completed: true } : {}),
      last_accessed_at: new Date().toISOString(),
    });
  } else {
    await upsertLearningContentProgress(userId, episodeKey, {
      audio_position_seconds: safePos,
      ...(pct !== undefined ? { audio_progress_pct: pct } : {}),
      ...(pct !== undefined && pct >= 85 ? { audio_completed: true } : {}),
      last_accessed_at: new Date().toISOString(),
    });
  }
}

export async function resetEpisodePlaybackPosition(
  userId: string,
  episodeKey: string,
  kind: 'video' | 'audio'
): Promise<void> {
  if (!userId || !episodeKey) return;
  if (kind === 'video') {
    await upsertLearningContentProgress(userId, episodeKey, {
      video_position_seconds: 0,
      last_accessed_at: new Date().toISOString(),
    });
  } else {
    await upsertLearningContentProgress(userId, episodeKey, {
      audio_position_seconds: 0,
      last_accessed_at: new Date().toISOString(),
    });
  }
}

export function formatPlaybackSeconds(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export async function fetchUserLearningContentProgress(
  userId: string,
  options?: { forceRefresh?: boolean }
): Promise<Record<string, LearningContentProgressRow>> {
  if (!userId) return {};
  const segment = LOCAL_SEGMENT(userId);
  const entry = await readCacheEntry<Record<string, LearningContentProgressRow>>(segment);
  const localMap = entry?.data ?? {};

  if (!isSupabaseConfigured()) return localMap;
  if (!options?.forceRefresh && entry && isCacheFresh(entry.updatedAt, PROGRESS_FRESH_MS)) {
    return localMap;
  }

  return dedupeRequest(`learning_progress:${userId}`, async () => {
    let rows: Record<string, unknown>[] | null = null;
    try {
      const res = await withTimeout(
        (async () =>
          supabase
            .from('learning_content_progress')
            .select(
              'episode_key, video_completed, audio_completed, video_progress_pct, audio_progress_pct, video_position_seconds, audio_position_seconds, last_accessed_at'
            )
            .eq('user_id', userId))(),
        PROGRESS_TIMEOUT_MS,
        'Learning progress fetch'
      );

      if (res.error && isMissingPositionColumnError(res.error.message)) {
        const fallback = await withTimeout(
          (async () =>
            supabase
              .from('learning_content_progress')
              .select('episode_key, video_completed, audio_completed, video_progress_pct, audio_progress_pct, last_accessed_at')
              .eq('user_id', userId))(),
          PROGRESS_TIMEOUT_MS,
          'Learning progress fallback fetch'
        );
        if (!fallback.error && fallback.data) {
          rows = fallback.data as Record<string, unknown>[];
        }
      } else if (!res.error && res.data) {
        rows = res.data as Record<string, unknown>[];
      }
    } catch {
      return localMap;
    }

    if (!rows) return localMap;

    const merged: Record<string, LearningContentProgressRow> = { ...localMap };
    for (const r of rows) {
      const key = String(r.episode_key ?? '');
      if (!key) continue;
      const local = localMap[key];
      const remoteVideoCompleted = Boolean(r.video_completed);
      const remoteAudioCompleted = Boolean(r.audio_completed);
      const remoteVideoPos = Number(r.video_position_seconds ?? 0);
      const remoteAudioPos = Number(r.audio_position_seconds ?? 0);

      merged[key] = {
        episodeKey: key,
        videoCompleted: remoteVideoCompleted || Boolean(local?.videoCompleted),
        audioCompleted: remoteAudioCompleted || Boolean(local?.audioCompleted),
        videoProgressPct: Math.max(Number(r.video_progress_pct ?? 0), local?.videoProgressPct ?? 0),
        audioProgressPct: Math.max(Number(r.audio_progress_pct ?? 0), local?.audioProgressPct ?? 0),
        videoPositionSeconds: remoteVideoPos > 0 ? remoteVideoPos : (local?.videoPositionSeconds ?? 0),
        audioPositionSeconds: remoteAudioPos > 0 ? remoteAudioPos : (local?.audioPositionSeconds ?? 0),
        lastAccessedAt: (r.last_accessed_at as string | null) ?? local?.lastAccessedAt ?? null,
      };
    }
    await writeCacheJson(segment, merged);
    return merged;
  });
}
