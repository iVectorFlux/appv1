import { describe, expect, it } from 'vitest';
import {
  buildSequencedCatalog,
  GOOD_EQ_SCORE_THRESHOLD,
  resolveLearningAccessMode,
} from './learning-sequence';
import type { LearningEpisode } from './learning-content-catalog';
import type { LearningContentProgressRow } from './learning-content-progress';

function makeEpisode(
  domain: string,
  competency: string,
  title: string,
  sortOrder = 1
): LearningEpisode {
  const episodeKey = `B2B|${domain}|${competency}|${title}`;
  return {
    episodeKey,
    eqType: 'B2B',
    title,
    description: `${competency} lesson`,
    domain,
    competency,
    dimension: 'self_awareness',
    videoUrl: `https://example.com/${competency}.mp4`,
    audioUrl: `https://example.com/${competency}.mp3`,
    routeId: `route-${competency.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    icon: 'book-outline',
    color: '#2563EB',
    sortOrder,
  };
}

const SCRAMBLED_CURRICULUM: LearningEpisode[] = [
  makeEpisode('Relationship Management', 'Inspirational Leadership', 'Inspire Teams', 12),
  makeEpisode('Social Awareness', 'Organizational Awareness', 'Read the Room', 7),
  makeEpisode('Self-Management', 'Adaptability', 'Navigate Change', 4),
  makeEpisode('Self-Awareness', 'Emotional Self-Awareness', 'Name Your Triggers', 1),
  makeEpisode('Relationship Management', 'Teamwork', 'Shared Ownership', 11),
  makeEpisode('Self-Management', 'Emotional Balance', 'Steady Under Pressure', 2),
  makeEpisode('Relationship Management', 'Conflict Management', 'De-escalate Friction', 10),
  makeEpisode('Self-Management', 'Positive Outlook', 'Grounded Optimism', 3),
  makeEpisode('Relationship Management', 'Influence', 'Lead Without Authority', 8),
  makeEpisode('Social Awareness', 'Empathy', 'Active Listening', 6),
  makeEpisode('Self-Management', 'Achievement Orientation', 'Raise the Bar', 5),
  makeEpisode('Relationship Management', 'Coach & Mentor', 'Develop Others', 9),
];

function makeProgress(
  ep: LearningEpisode,
  overrides: Partial<LearningContentProgressRow> = {}
): LearningContentProgressRow {
  return {
    episodeKey: ep.episodeKey,
    videoCompleted: false,
    audioCompleted: false,
    videoProgressPct: 0,
    audioProgressPct: 0,
    videoPositionSeconds: 0,
    audioPositionSeconds: 0,
    lastAccessedAt: null,
    ...overrides,
  };
}

describe('resolveLearningAccessMode', () => {
  it('returns guided_sequential when score is null or below threshold', () => {
    expect(GOOD_EQ_SCORE_THRESHOLD).toBe(65);
    expect(resolveLearningAccessMode(null)).toBe('guided_sequential');
    expect(resolveLearningAccessMode(64)).toBe('guided_sequential');
  });

  it('returns free_browse when score meets or exceeds threshold', () => {
    expect(resolveLearningAccessMode(65)).toBe('free_browse');
    expect(resolveLearningAccessMode(82)).toBe('free_browse');
  });
});

describe('buildSequencedCatalog', () => {
  it('orders episodes strictly across the 4-domain 12-competency sequence', () => {
    const result = buildSequencedCatalog(SCRAMBLED_CURRICULUM, {}, null);
    expect(result.items.map((item) => item.episode.competency)).toEqual([
      'Emotional Self-Awareness',
      'Emotional Balance',
      'Positive Outlook',
      'Adaptability',
      'Achievement Orientation',
      'Empathy',
      'Organizational Awareness',
      'Influence',
      'Coach & Mentor',
      'Conflict Management',
      'Teamwork',
      'Inspirational Leadership',
    ]);
    expect(result.items.map((item) => item.sequenceNumber)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
  });

  it('locks steps in guided_sequential mode until previous step is completed by video or audio', () => {
    const step1 = SCRAMBLED_CURRICULUM.find((e) => e.competency === 'Emotional Self-Awareness')!;
    const step2 = SCRAMBLED_CURRICULUM.find((e) => e.competency === 'Emotional Balance')!;

    // Initially only step 1 unlocked
    const initial = buildSequencedCatalog(SCRAMBLED_CURRICULUM, {}, 52);
    expect(initial.accessMode).toBe('guided_sequential');
    expect(initial.items[0]!.unlocked).toBe(true);
    expect(initial.items[0]!.isCurrentNext).toBe(true);
    expect(initial.items[1]!.unlocked).toBe(false);
    expect(initial.items[1]!.lockedReason).toContain(step1.title);
    expect(initial.nextUnlockedRouteId).toBe(step1.routeId);

    // Completing step 1 video unlocks step 2, keeps step 3 locked
    const afterStep1 = buildSequencedCatalog(
      SCRAMBLED_CURRICULUM,
      {
        [step1.episodeKey]: makeProgress(step1, { videoCompleted: true, videoProgressPct: 100 }),
      },
      52
    );
    expect(afterStep1.completedCount).toBe(1);
    expect(afterStep1.items[0]!.completed).toBe(true);
    expect(afterStep1.items[1]!.unlocked).toBe(true);
    expect(afterStep1.items[1]!.isCurrentNext).toBe(true);
    expect(afterStep1.items[2]!.unlocked).toBe(false);
    expect(afterStep1.nextUnlockedRouteId).toBe(step2.routeId);

    // Completing step 2 via audio unlocks step 3
    const afterStep2 = buildSequencedCatalog(
      SCRAMBLED_CURRICULUM,
      {
        [step1.episodeKey]: makeProgress(step1, { videoCompleted: true, videoProgressPct: 100 }),
        [step2.episodeKey]: makeProgress(step2, { audioCompleted: true, audioProgressPct: 100 }),
      },
      null
    );
    expect(afterStep2.completedCount).toBe(2);
    expect(afterStep2.items[2]!.unlocked).toBe(true);
    expect(afterStep2.items[2]!.isCurrentNext).toBe(true);
    expect(afterStep2.items[3]!.unlocked).toBe(false);
  });

  it('unlocks all steps immediately in free_browse mode when score >= 65', () => {
    const result = buildSequencedCatalog(SCRAMBLED_CURRICULUM, {}, 78);
    expect(result.accessMode).toBe('free_browse');
    expect(result.items.every((item) => item.unlocked)).toBe(true);
    expect(result.items.every((item) => item.lockedReason === null)).toBe(true);
  });
});

