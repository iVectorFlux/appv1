import { describe, expect, it, vi } from 'vitest';
import { buildSequencedCatalog } from './learning-sequence';
import { buildHomeRecommendations } from './learning-recommendations';
import type { LearningEpisode } from './learning-content-catalog';
import type { LearningContentProgressRow } from './learning-content-progress';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async () => null),
    setItem: vi.fn(async () => undefined),
    removeItem: vi.fn(async () => undefined),
  },
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {},
  isSupabaseConfigured: () => false,
}));

function makeEpisode(
  domain: string,
  competency: string,
  title: string,
  dimension: LearningEpisode['dimension'],
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
    dimension,
    videoUrl: `https://example.com/${competency}.mp4`,
    audioUrl: `https://example.com/${competency}.mp3`,
    routeId: `route-${competency.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    icon: 'book-outline',
    color: '#2563EB',
    sortOrder,
  };
}

const SAMPLE_CURRICULUM: LearningEpisode[] = [
  makeEpisode('Self-Awareness', 'Emotional Self-Awareness', 'Name Your Triggers', 'self_awareness', 1),
  makeEpisode('Self-Management', 'Emotional Balance', 'Steady Under Pressure', 'self_regulation', 2),
  makeEpisode('Social Awareness', 'Empathy', 'Active Listening', 'empathy', 3),
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

describe('buildHomeRecommendations', () => {
  it('returns Video, Reading, and Audio recommendations on login for a new learner', () => {
    const sequenced = buildSequencedCatalog(SAMPLE_CURRICULUM, {}, null);
    const feed = buildHomeRecommendations(sequenced);

    expect(feed.incompleteItems).toHaveLength(0);
    expect(feed.recommendations.map((r) => r.type)).toEqual(['video', 'reading', 'audio']);
    expect(feed.recommendations[0]!.ctaLabel).toBe('Watch Video');
    expect(feed.recommendations[1]!.ctaLabel).toBe('Read Brief & Guide');
    expect(feed.recommendations[2]!.ctaLabel).toBe('Listen Audio');
  });

  it('surfaces unfinished lessons with saved watch-time timestamps in incompleteItems', () => {
    const ep1 = SAMPLE_CURRICULUM[0]!;
    const ep2 = SAMPLE_CURRICULUM[1]!;

    const sequenced = buildSequencedCatalog(
      SAMPLE_CURRICULUM,
      {
        [ep1.episodeKey]: makeProgress(ep1, {
          videoCompleted: true,
          videoProgressPct: 100,
        }),
        [ep2.episodeKey]: makeProgress(ep2, {
          videoProgressPct: 48,
          videoPositionSeconds: 102,
          lastAccessedAt: '2026-11-14T10:00:00.000Z',
        }),
      },
      75
    );

    const feed = buildHomeRecommendations(sequenced);
    expect(feed.incompleteItems).toHaveLength(1);
    expect(feed.incompleteItems[0]!.episodeKey).toBe(ep2.episodeKey);
    expect(feed.incompleteItems[0]!.kind).toBe('video');
    expect(feed.incompleteItems[0]!.positionSeconds).toBe(102);
    expect(feed.incompleteItems[0]!.statusLabel).toContain('1:42');
    expect(feed.incompleteItems[0]!.ctaLabel).toBe('Resume Video (1:42)');

    const videoRec = feed.recommendations.find((r) => r.type === 'video');
    expect(videoRec?.inProgress).toBe(true);
    expect(videoRec?.ctaLabel).toBe('Resume 1:42');
  });

  it('prioritizes weaker EQ dimension lessons when Free Browse is unlocked', () => {
    const sequenced = buildSequencedCatalog(SAMPLE_CURRICULUM, {}, 80);
    const feed = buildHomeRecommendations(sequenced, {
      self_awareness: 85,
      self_regulation: 82,
      empathy: 42,
    });

    const videoRec = feed.recommendations.find((r) => r.type === 'video');
    expect(videoRec?.competency).toBe('Empathy');
  });
});
