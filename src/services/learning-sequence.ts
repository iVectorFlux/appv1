/**
 * Adaptive EQ Curriculum Sequencing Service
 *
 * Rules:
 * - Curriculum follows the 4-Domain -> 12-Competency sequence:
 *   1. Self-Awareness: Emotional Self-Awareness
 *   2. Self-Management: Emotional Balance -> Positive Outlook -> Adaptability -> Achievement Orientation
 *   3. Social Awareness: Empathy -> Organizational Awareness
 *   4. Relationship Management: Influence -> Coach & Mentor -> Conflict Management -> Teamwork -> Inspirational Leadership
 *
 * - Score >= GOOD_EQ_SCORE_THRESHOLD (65, matching "strong" / "exemplary" EQ):
 *   Learner earns Free Browse Mode and can explore any competency/course in any order.
 *
 * - Score < 65 or assessment not yet taken:
 *   Learner follows Guided Sequential Mode: Episode 1 is unlocked and each subsequent episode
 *   requires completing the previous episode (video or audio >= 85% / finished) before unlocking.
 */

import { sortB2bEpisodesInPillarOrder } from '@/data/learning-b2b-taxonomy';
import { getCurriculumGuide, type CompetencyReadingGuide } from '@/data/eq-curriculum';
import type { LearningEpisode } from '@/services/learning-content-catalog';
import type { LearningContentProgressRow } from '@/services/learning-content-progress';

export const GOOD_EQ_SCORE_THRESHOLD = 65;

export type LearningAccessMode = 'free_browse' | 'guided_sequential';

export interface SequencedEpisode {
  episode: LearningEpisode;
  sequenceNumber: number;
  guide: CompetencyReadingGuide;
  videoCompleted: boolean;
  audioCompleted: boolean;
  videoProgressPct: number;
  audioProgressPct: number;
  videoPositionSeconds: number;
  audioPositionSeconds: number;
  lastAccessedAt: string | null;
  completed: boolean;
  progressPct: number;
  unlocked: boolean;
  isCurrentNext: boolean;
  lockedReason: string | null;
}

export interface SequencedCatalogState {
  accessMode: LearningAccessMode;
  latestEqScore: number | null;
  items: SequencedEpisode[];
  completedCount: number;
  totalCount: number;
  completionRatePct: number;
  nextUnlockedRouteId: string | null;
}

export function resolveLearningAccessMode(latestEqScore: number | null): LearningAccessMode {
  if (latestEqScore !== null && latestEqScore >= GOOD_EQ_SCORE_THRESHOLD) {
    return 'free_browse';
  }
  return 'guided_sequential';
}

export function buildSequencedCatalog(
  episodes: LearningEpisode[],
  progressByKey: Record<string, LearningContentProgressRow>,
  latestEqScore: number | null
): SequencedCatalogState {
  const ordered = sortB2bEpisodesInPillarOrder(episodes);
  const accessMode = resolveLearningAccessMode(latestEqScore);

  let allPriorCompleted = true;
  let nextUnlockedAssigned = false;
  let nextUnlockedRouteId: string | null = null;
  let completedCount = 0;

  const items: SequencedEpisode[] = ordered.map((ep, idx) => {
    const p = progressByKey[ep.episodeKey];
    const videoCompleted = Boolean(p?.videoCompleted);
    const audioCompleted = Boolean(p?.audioCompleted);
    const videoProgressPct = videoCompleted ? 100 : (p?.videoProgressPct ?? 0);
    const audioProgressPct = audioCompleted ? 100 : (p?.audioProgressPct ?? 0);
    const videoPositionSeconds = videoCompleted ? 0 : (p?.videoPositionSeconds ?? 0);
    const audioPositionSeconds = audioCompleted ? 0 : (p?.audioPositionSeconds ?? 0);
    const lastAccessedAt = p?.lastAccessedAt ?? null;
    const completed = videoCompleted || audioCompleted;
    const progressPct = completed ? 100 : Math.max(videoProgressPct, audioProgressPct);
    if (completed) completedCount += 1;

    const unlocked = accessMode === 'free_browse' ? true : idx === 0 || allPriorCompleted || completed;
    const isCurrentNext = unlocked && !completed && !nextUnlockedAssigned;
    if (isCurrentNext) {
      nextUnlockedAssigned = true;
      nextUnlockedRouteId = ep.routeId;
    }

    const prevTitle = idx > 0 ? ordered[idx - 1]!.title : null;
    const lockedReason = unlocked
      ? null
      : prevTitle
        ? `Complete "${prevTitle}" (Step ${idx}) to unlock`
        : 'Complete the previous lesson to unlock';

    if (!completed) {
      allPriorCompleted = false;
    }

    return {
      episode: ep,
      sequenceNumber: idx + 1,
      guide: getCurriculumGuide(ep.competency, ep.domain),
      videoCompleted,
      audioCompleted,
      videoProgressPct,
      audioProgressPct,
      videoPositionSeconds,
      audioPositionSeconds,
      lastAccessedAt,
      completed,
      progressPct,
      unlocked,
      isCurrentNext,
      lockedReason,
    };
  });

  const totalCount = items.length;
  const completionRatePct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return {
    accessMode,
    latestEqScore,
    items,
    completedCount,
    totalCount,
    completionRatePct,
    nextUnlockedRouteId,
  };
}

