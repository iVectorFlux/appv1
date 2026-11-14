import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyDatabaseCompetencyGuides,
  EQ_COMPETENCY_CURRICULUM,
  getCurriculumGuide,
} from '@/data/eq-curriculum';
import { mapDbRowToCompetencyGuide } from './eq-curriculum-service';
import {
  episodeToDetailModule,
  rowsToEpisodes,
  type LearningContentRow,
} from './learning-content-catalog';
import { buildSequencedCatalog } from './learning-sequence';
import { buildHomeRecommendations } from './learning-recommendations';

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

describe('Database-driven short & long reading content', () => {
  const originalEmpathy = { ...EQ_COMPETENCY_CURRICULUM.EMPATHY! };

  afterEach(() => {
    EQ_COMPETENCY_CURRICULUM.EMPATHY = originalEmpathy;
  });

  it('maps eq_competency_guides database rows and updates runtime curriculum guides', () => {
    const mapped = mapDbRowToCompetencyGuide({
      competency_key: 'empathy',
      sequence_order: 6,
      domain_key: 'SOCIAL_AWARENESS',
      domain_label: 'Social Awareness',
      title: 'Empathy (DB)',
      short_content: 'DB short summary for empathy.',
      what_it_is: 'DB definition of empathy.',
      why_it_matters: 'DB rationale for empathy.',
      how_to_measure: ['DB Signal 1', 'DB Signal 2'],
      long_content: 'DB first-principles deep dive into empathy mechanisms.',
      practice_prompt: 'DB empathy drill.',
      estimated_read_minutes: 5,
    });

    applyDatabaseCompetencyGuides([mapped]);

    const guide = getCurriculumGuide('EMPATHY');
    expect(guide.title).toBe('Empathy (DB)');
    expect(guide.shortSummary).toBe('DB short summary for empathy.');
    expect(guide.longContent).toBe('DB first-principles deep dive into empathy mechanisms.');
    expect(guide.howToMeasure).toEqual(['DB Signal 1', 'DB Signal 2']);
    expect(guide.estimatedReadMinutes).toBe(5);
  });

  it('carries learning_content short_content, long_content, and estimated_read_minutes into episodes, detail modules, and recommendations', () => {
    const baseRow: LearningContentRow = {
      id: 'row-video-1',
      content_for: 'EQ',
      eq_type: 'B2B',
      domain: 'SELF_AWARENESS',
      competency: 'EMOTIONAL_SELF_AWARENESS',
      episode_title: 'Spot Signals Early',
      episode_description: 'Video lesson on spotting emotional cues.',
      industry: null,
      level: null,
      content_type: 'video',
      s3_link: 'https://cdn.example.com/spot-signals.mp4',
      created_at: '2026-11-14T00:00:00Z',
      updated_at: '2026-11-14T00:00:00Z',
      language: 'en',
      sort_order: 1,
      short_content: 'DB episode short brief: notice physiological signals before reacting.',
      long_content: 'DB episode long deep-dive: first-principles somatic marker tracking.',
      estimated_read_minutes: 4,
    };

    const audioRow: LearningContentRow = {
      ...baseRow,
      id: 'row-audio-1',
      content_type: 'audio',
      s3_link: 'https://cdn.example.com/spot-signals.mp3',
    };

    const episodes = rowsToEpisodes([baseRow, audioRow]);
    expect(episodes).toHaveLength(1);
    const ep = episodes[0]!;
    expect(ep.shortContent).toBe(
      'DB episode short brief: notice physiological signals before reacting.'
    );
    expect(ep.longContent).toBe(
      'DB episode long deep-dive: first-principles somatic marker tracking.'
    );
    expect(ep.estimatedReadMinutes).toBe(4);

    const detail = episodeToDetailModule(ep);
    expect(detail.shortContent).toBe(ep.shortContent);
    expect(detail.longContent).toBe(ep.longContent);
    expect(detail.estimatedReadMinutes).toBe(4);

    const sequenced = buildSequencedCatalog(episodes, {}, 80);
    const feed = buildHomeRecommendations(sequenced);
    const readingRec = feed.recommendations.find((r) => r.type === 'reading');
    expect(readingRec?.summary).toBe(ep.shortContent);
    expect(readingRec?.metaLabel).toContain('4 min read');
  });
});
