/**
 * Aggregates Learn tab, Skill Lab, and cloud Assist chat stats for Insights.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { FUTURE_SKILLS } from '@/data/future-skills';
import { getModuleById } from '@/data/learning-content';
import { getSkillsProgress, type SkillProgress } from '@/services/skills-storage';

export type CatalogEpisodeProgress = {
  episodeKey: string;
  lastAccessedAt: string | null;
  videoPct: number;
  audioPct: number;
  videoDone: boolean;
  audioDone: boolean;
};

export type ModuleProgressRow = {
  moduleId: string;
  title: string;
  lastAccessedAt: string | null;
  videoPct: number;
  audioPct: number;
  videoDone: boolean;
  audioDone: boolean;
};

export type InsightsLearningBundle = {
  skillProgress: Record<string, SkillProgress>;
  /** Saved chat turns in Supabase (Assist tab / chat when synced). */
  assistInnerAllyMessages: number;
  assistCoachMessages: number;
  lastAssistMessageAt: string | null;
  catalogEpisodeRows: number;
  catalogEpisodesCompleteBoth: number;
  catalogEpisodesEngaged: number;
  catalogDetails: CatalogEpisodeProgress[];
  legacyModuleRows: number;
  legacyModulesWithCompletion: number;
  moduleDetails: ModuleProgressRow[];
};

export const EMPTY_INSIGHTS_LEARNING_BUNDLE: InsightsLearningBundle = {
  skillProgress: {},
  assistInnerAllyMessages: 0,
  assistCoachMessages: 0,
  lastAssistMessageAt: null,
  catalogEpisodeRows: 0,
  catalogEpisodesCompleteBoth: 0,
  catalogEpisodesEngaged: 0,
  catalogDetails: [],
  legacyModuleRows: 0,
  legacyModulesWithCompletion: 0,
  moduleDetails: [],
};

function parseTs(a: string | null | undefined): number {
  if (!a) return 0;
  const t = new Date(a).getTime();
  return Number.isFinite(t) ? t : 0;
}

export async function loadInsightsLearningBundle(userId: string): Promise<InsightsLearningBundle> {
  if (!isSupabaseConfigured()) {
    return { ...EMPTY_INSIGHTS_LEARNING_BUNDLE };
  }

  const [
    innerCountRes,
    coachCountRes,
    lastMsgRes,
    cpRes,
    lpRes,
    skillProgress,
  ] = await Promise.all([
    supabase
      .from('ai_chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('mode', 'inner_ally'),
    supabase
      .from('ai_chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('mode', 'coach'),
    supabase
      .from('ai_chat_messages')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('learning_content_progress')
      .select(
        'episode_key, video_completed, audio_completed, last_accessed_at, video_progress_pct, audio_progress_pct'
      )
      .eq('user_id', userId),
    supabase
      .from('learning_progress')
      .select(
        'module_id, video_completed, audio_completed, last_accessed_at, video_progress_pct, audio_progress_pct'
      )
      .eq('user_id', userId),
    getSkillsProgress(userId),
  ]);

  if (cpRes.error) {
    console.warn('[Insights] learning_content_progress:', cpRes.error.message);
  }
  if (lpRes.error) {
    console.warn('[Insights] learning_progress:', lpRes.error.message);
  }

  const assistInnerAllyMessages = innerCountRes.count ?? 0;
  const assistCoachMessages = coachCountRes.count ?? 0;
  const lastAssistMessageAt =
    (lastMsgRes.data as { created_at?: string } | null)?.created_at ?? null;

  const cp = (cpRes.data ?? []) as {
    episode_key?: string;
    video_completed?: boolean;
    audio_completed?: boolean;
    last_accessed_at?: string | null;
    video_progress_pct?: number | null;
    audio_progress_pct?: number | null;
  }[];

  let catalogEpisodesCompleteBoth = 0;
  let catalogEpisodesEngaged = 0;
  const catalogDetails: CatalogEpisodeProgress[] = [];

  for (const row of cp) {
    const key = row.episode_key ?? '';
    if (!key) continue;
    const v = row.video_completed === true;
    const a = row.audio_completed === true;
    if (v && a) catalogEpisodesCompleteBoth++;
    if (v || a || (row.last_accessed_at != null && String(row.last_accessed_at).length > 0)) {
      catalogEpisodesEngaged++;
    }
    catalogDetails.push({
      episodeKey: key,
      lastAccessedAt: row.last_accessed_at ?? null,
      videoPct: Math.min(100, Math.max(0, Number(row.video_progress_pct) || 0)),
      audioPct: Math.min(100, Math.max(0, Number(row.audio_progress_pct) || 0)),
      videoDone: v,
      audioDone: a,
    });
  }

  catalogDetails.sort((x, y) => parseTs(y.lastAccessedAt) - parseTs(x.lastAccessedAt));

  const lp = (lpRes.data ?? []) as {
    module_id?: string;
    video_completed?: boolean;
    audio_completed?: boolean;
    last_accessed_at?: string | null;
    video_progress_pct?: number | null;
    audio_progress_pct?: number | null;
  }[];

  let legacyModulesWithCompletion = 0;
  const moduleDetails: ModuleProgressRow[] = [];

  for (const row of lp) {
    const mid = row.module_id ?? '';
    if (!mid) continue;
    const v = row.video_completed === true;
    const a = row.audio_completed === true;
    if (v || a) legacyModulesWithCompletion++;
    const mod = getModuleById(mid);
    moduleDetails.push({
      moduleId: mid,
      title: mod?.title ?? mid.replace(/_/g, ' '),
      lastAccessedAt: row.last_accessed_at ?? null,
      videoPct: Math.min(100, Math.max(0, Number(row.video_progress_pct) || 0)),
      audioPct: Math.min(100, Math.max(0, Number(row.audio_progress_pct) || 0)),
      videoDone: v,
      audioDone: a,
    });
  }

  moduleDetails.sort((x, y) => parseTs(y.lastAccessedAt) - parseTs(x.lastAccessedAt));

  return {
    skillProgress,
    assistInnerAllyMessages,
    assistCoachMessages,
    lastAssistMessageAt,
    catalogEpisodeRows: cp.length,
    catalogEpisodesCompleteBoth,
    catalogEpisodesEngaged,
    catalogDetails: catalogDetails.slice(0, 12),
    legacyModuleRows: lp.length,
    legacyModulesWithCompletion,
    moduleDetails: moduleDetails.slice(0, 12),
  };
}

export function skillDisplayName(skillId: string): string {
  return FUTURE_SKILLS.find((s) => s.id === skillId)?.name ?? skillId.replace(/_/g, ' ');
}

/** Short label for catalog episode_key in UI */
export function shortenEpisodeKey(key: string): string {
  if (key.length <= 42) return key;
  return `${key.slice(0, 20)}…${key.slice(-18)}`;
}
