/**
 * Personalized Video, Reading & Audio Recommendations + "Complete This" Resume Queue
 *
 * Surfaces:
 * 1. Incomplete / in-progress lessons ("Complete this") with saved watch/listen timestamps
 * 2. Tailored Video, Reading (first-principles guide), and Audio recommendations upon login
 */

import { formatPlaybackSeconds } from '@/services/learning-content-progress';
import type { SequencedCatalogState, SequencedEpisode } from '@/services/learning-sequence';

export type RecommendationMediaType = 'video' | 'reading' | 'audio';

export interface IncompleteLessonItem {
  episodeKey: string;
  routeId: string;
  title: string;
  competency: string;
  domain: string;
  kind: 'video' | 'audio';
  progressPct: number;
  positionSeconds: number;
  lastAccessedAt: string | null;
  statusLabel: string;
  ctaLabel: string;
}

export interface MediaRecommendationItem {
  type: RecommendationMediaType;
  routeId: string;
  episodeKey: string;
  title: string;
  competency: string;
  domain: string;
  summary: string;
  metaLabel: string;
  ctaLabel: string;
  inProgress: boolean;
  progressPct: number;
  positionSeconds: number;
}

export interface HomeRecommendationsBundle {
  incompleteItems: IncompleteLessonItem[];
  recommendations: MediaRecommendationItem[];
}

function scoreEpisodePriority(
  item: SequencedEpisode,
  weakDimensionOrder: Map<string, number>,
  isFreeBrowse: boolean
): number {
  let score = 0;
  if (item.videoPositionSeconds >= 3 || item.audioPositionSeconds >= 3) score += 2000;
  if (item.progressPct > 0 && !item.completed) score += 1500;
  if (!item.completed) score += 500;

  const dimRank = weakDimensionOrder.get(item.episode.dimension);
  if (dimRank !== undefined) {
    // In Free Browse mode, surface weakest EQ areas ahead of default sequence order
    score += Math.max(0, 600 - dimRank * 120);
  }
  if (item.isCurrentNext && (!isFreeBrowse || weakDimensionOrder.size === 0)) {
    score += 1000;
  }
  score -= item.sequenceNumber;
  return score;
}

export function buildHomeRecommendations(
  sequenced: SequencedCatalogState,
  dimensionScores?: Record<string, number> | null
): HomeRecommendationsBundle {
  const weakDimensionOrder = new Map<string, number>();
  if (dimensionScores) {
    Object.entries(dimensionScores)
      .sort((a, b) => a[1] - b[1])
      .forEach(([dim], idx) => weakDimensionOrder.set(dim, idx));
  }

  // 1. Collect incomplete / started lessons ("Complete this")
  const incompleteItems: IncompleteLessonItem[] = [];
  for (const item of sequenced.items) {
    const hasPartialVideo =
      !item.videoCompleted && (item.videoProgressPct > 0 || item.videoPositionSeconds >= 3);
    const hasPartialAudio =
      !item.audioCompleted && (item.audioProgressPct > 0 || item.audioPositionSeconds >= 3);
    const openedButUnfinished = !item.completed && item.lastAccessedAt !== null;

    if (!hasPartialVideo && !hasPartialAudio && !openedButUnfinished) continue;

    // Pick whichever unfinished medium has more recent/active progress
    const useAudio =
      hasPartialAudio &&
      (!hasPartialVideo ||
        item.audioPositionSeconds > item.videoPositionSeconds ||
        item.audioProgressPct > item.videoProgressPct) &&
      Boolean(item.episode.audioUrl);

    const kind: 'video' | 'audio' = useAudio
      ? 'audio'
      : item.episode.videoUrl
        ? 'video'
        : 'audio';

    const positionSeconds = kind === 'video' ? item.videoPositionSeconds : item.audioPositionSeconds;
    const rawPct = kind === 'video' ? item.videoProgressPct : item.audioProgressPct;
    const progressPct = rawPct > 0 ? rawPct : positionSeconds > 0 ? 5 : 0;

    const timePart = positionSeconds >= 3 ? `Paused at ${formatPlaybackSeconds(positionSeconds)}` : null;
    const pctPart = progressPct > 0 ? `${progressPct}% ${kind === 'video' ? 'watched' : 'listened'}` : 'Started';
    const statusLabel = timePart ? `${pctPart} • ${timePart}` : `${pctPart} • Complete this`;

    const ctaLabel =
      positionSeconds >= 3
        ? `Resume ${kind === 'video' ? 'Video' : 'Audio'} (${formatPlaybackSeconds(positionSeconds)})`
        : kind === 'video'
          ? 'Complete This Video'
          : 'Complete This Audio';

    incompleteItems.push({
      episodeKey: item.episode.episodeKey,
      routeId: item.episode.routeId,
      title: item.episode.title,
      competency: item.episode.competency,
      domain: item.episode.domain,
      kind,
      progressPct,
      positionSeconds,
      lastAccessedAt: item.lastAccessedAt,
      statusLabel,
      ctaLabel,
    });
  }

  incompleteItems.sort((a, b) => {
    const tA = a.lastAccessedAt ? new Date(a.lastAccessedAt).getTime() : 0;
    const tB = b.lastAccessedAt ? new Date(b.lastAccessedAt).getTime() : 0;
    if (tA !== tB) return tB - tA;
    return b.progressPct - a.progressPct;
  });

  // 2. Build Video, Reading, Audio recommendations for login home
  const isFreeBrowse = sequenced.accessMode === 'free_browse';
  const unlockedPool = sequenced.items.filter((i) => i.unlocked);
  const candidatePool = unlockedPool.length > 0 ? unlockedPool : sequenced.items;
  const prioritized = [...candidatePool].sort(
    (a, b) =>
      scoreEpisodePriority(b, weakDimensionOrder, isFreeBrowse) -
      scoreEpisodePriority(a, weakDimensionOrder, isFreeBrowse)
  );

  const recommendations: MediaRecommendationItem[] = [];

  // Video pick
  const videoPick =
    prioritized.find((i) => !i.videoCompleted && i.episode.videoUrl && i.videoPositionSeconds >= 3) ??
    prioritized.find((i) => !i.completed && i.episode.videoUrl) ??
    prioritized.find((i) => i.episode.videoUrl);

  if (videoPick) {
    const resumeSec = videoPick.videoPositionSeconds;
    const pct = videoPick.videoProgressPct;
    const inProgress = !videoPick.videoCompleted && (resumeSec >= 3 || pct > 0);
    recommendations.push({
      type: 'video',
      routeId: videoPick.episode.routeId,
      episodeKey: videoPick.episode.episodeKey,
      title: videoPick.episode.title,
      competency: videoPick.episode.competency,
      domain: videoPick.episode.domain,
      summary: videoPick.episode.shortContent || videoPick.guide.shortSummary,
      metaLabel:
        resumeSec >= 3
          ? `Resume at ${formatPlaybackSeconds(resumeSec)}${pct > 0 ? ` • ${pct}%` : ''}`
          : pct > 0 && !videoPick.videoCompleted
            ? `${pct}% watched`
            : `Step ${videoPick.sequenceNumber} • Video Lesson`,
      ctaLabel: resumeSec >= 3 ? `Resume ${formatPlaybackSeconds(resumeSec)}` : 'Watch Video',
      inProgress,
      progressPct: pct,
      positionSeconds: resumeSec,
    });
  }

  // Reading pick (prefer an uncompleted competency guide distinct from video if free browse allows, otherwise prioritized)
  const readingPick =
    prioritized.find(
      (i) => !i.completed && i.episode.episodeKey !== videoPick?.episode.episodeKey
    ) ??
    prioritized.find((i) => !i.completed) ??
    prioritized[0];

  if (readingPick) {
    recommendations.push({
      type: 'reading',
      routeId: readingPick.episode.routeId,
      episodeKey: readingPick.episode.episodeKey,
      title: readingPick.guide.title,
      competency: readingPick.episode.competency,
      domain: readingPick.episode.domain,
      summary: readingPick.episode.shortContent || readingPick.guide.shortSummary,
      metaLabel: `${readingPick.episode.estimatedReadMinutes ?? readingPick.guide.estimatedReadMinutes} min read • First-Principles`,
      ctaLabel: 'Read Brief & Guide',
      inProgress: !readingPick.completed && readingPick.lastAccessedAt !== null,
      progressPct: readingPick.progressPct,
      positionSeconds: 0,
    });
  }

  // Audio pick (prefer started audio first, else complementary unlocked podcast)
  const audioPick =
    prioritized.find((i) => !i.audioCompleted && i.episode.audioUrl && i.audioPositionSeconds >= 3) ??
    prioritized.find(
      (i) =>
        !i.completed &&
        i.episode.audioUrl &&
        i.episode.episodeKey !== videoPick?.episode.episodeKey &&
        i.episode.episodeKey !== readingPick?.episode.episodeKey
    ) ??
    prioritized.find((i) => !i.completed && i.episode.audioUrl) ??
    prioritized.find((i) => i.episode.audioUrl);

  if (audioPick) {
    const resumeSec = audioPick.audioPositionSeconds;
    const pct = audioPick.audioProgressPct;
    const inProgress = !audioPick.audioCompleted && (resumeSec >= 3 || pct > 0);
    recommendations.push({
      type: 'audio',
      routeId: audioPick.episode.routeId,
      episodeKey: audioPick.episode.episodeKey,
      title: audioPick.episode.title,
      competency: audioPick.episode.competency,
      domain: audioPick.episode.domain,
      summary: audioPick.episode.shortContent || audioPick.guide.shortSummary,
      metaLabel:
        resumeSec >= 3
          ? `Resume at ${formatPlaybackSeconds(resumeSec)}${pct > 0 ? ` • ${pct}%` : ''}`
          : pct > 0 && !audioPick.audioCompleted
            ? `${pct}% listened`
            : `Step ${audioPick.sequenceNumber} • Audio Podcast`,
      ctaLabel: resumeSec >= 3 ? `Resume ${formatPlaybackSeconds(resumeSec)}` : 'Listen Audio',
      inProgress,
      progressPct: pct,
      positionSeconds: resumeSec,
    });
  }

  return { incompleteItems, recommendations };
}
