import { describe, expect, it, vi } from 'vitest';
import {
  computeEqTestAvailability,
  countCompletedCompetencies,
  type EqTestDraft,
} from './eq-test-state';
import type { SequencedEpisode } from './learning-sequence';
import type { EQQuestion, EQResponse } from '@/types/eq-assessment';

vi.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    default: {
      getItem: vi.fn(async (k: string) => store.get(k) ?? null),
      setItem: vi.fn(async (k: string, v: string) => {
        store.set(k, v);
      }),
      removeItem: vi.fn(async (k: string) => {
        store.delete(k);
      }),
    },
  };
});

function makeEpisodeItem(
  compIndex: number,
  completed: boolean,
  epSuffix = 'a'
): SequencedEpisode {
  const compId = `comp_${compIndex}`;
  return {
    episode: {
      episodeKey: `B2B|D|${compId}|${epSuffix}`,
      routeId: `${compId}_${epSuffix}`,
      title: `Episode ${compId} ${epSuffix}`,
      description: '',
      shortContent: '',
      longContent: '',
      dimension: 'self_awareness',
      eqType: 'B2B',
      domain: 'SELF_AWARENESS_DOMAIN',
      competency: compId,
      videoUrl: 'https://example.com/v.mp4',
      audioUrl: null,
      icon: 'book',
      color: '#2563EB',
      sortOrder: compIndex,
      estimatedReadMinutes: 2,
    },
    sequenceNumber: compIndex,
    guide: {
      key: compId,
      sequenceOrder: compIndex,
      domainKey: 'SELF_AWARENESS_DOMAIN',
      domainLabel: 'Self-Awareness',
      title: compId,
      shortSummary: '',
      longContent: '',
      whatItIs: '',
      whyItMatters: '',
      howToMeasure: [],
      practicePrompt: '',
      estimatedReadMinutes: 3,
    },
    videoCompleted: completed,
    audioCompleted: false,
    videoProgressPct: completed ? 100 : 0,
    audioProgressPct: 0,
    videoPositionSeconds: 0,
    audioPositionSeconds: 0,
    lastAccessedAt: null,
    completed,
    progressPct: completed ? 100 : 0,
    unlocked: true,
    isCurrentNext: false,
    lockedReason: null,
  };
}

function makeSequenced(completedCompetencies: number, totalCompetencies = 12) {
  const items: SequencedEpisode[] = [];
  for (let i = 1; i <= totalCompetencies; i++) {
    items.push(makeEpisodeItem(i, i <= completedCompetencies, 'a'));
    items.push(makeEpisodeItem(i, i <= completedCompetencies, 'b'));
  }
  const completedCount = items.filter((x) => x.completed).length;
  const totalCount = items.length;
  return {
    items,
    completedCount,
    totalCount,
    completionRatePct: Math.round((completedCount / totalCount) * 100),
  };
}

describe('computeEqTestAvailability', () => {
  it('shows initial Take EQ Test when user has 0 completed tests and no draft', () => {
    const res = computeEqTestAvailability({
      completedTestsCount: 0,
      draft: null,
      stages: { midLearningTaken: false, finalTaken: false },
      sequenced: makeSequenced(0),
    });
    expect(res.kind).toBe('initial');
    expect(res.isAvailable).toBe(true);
    expect(res.title).toBe('Take EQ Test');
    expect(res.ctaLabel).toBe('Take EQ Test');
  });

  it('always prioritizes Complete EQ Test resume state when draft has progress', () => {
    const draft: EqTestDraft = {
      userId: 'u1',
      sessionId: 's1',
      sessionStartTime: 1000,
      questions: [
        { id: 'q1' } as EQQuestion,
        { id: 'q2' } as EQQuestion,
        { id: 'q3' } as EQQuestion,
      ],
      currentIndex: 1,
      responses: [{ questionId: 'q1' } as EQResponse],
      updatedAt: 2000,
    };
    const res = computeEqTestAvailability({
      completedTestsCount: 1,
      draft,
      stages: { midLearningTaken: false, finalTaken: false },
      sequenced: makeSequenced(2),
    });
    expect(res.kind).toBe('resume');
    expect(res.isAvailable).toBe(true);
    expect(res.ctaLabel).toBe('Complete EQ Test');
    expect(res.route).toBe('/full-eq-test?resume=1');
    expect(res.draftCurrentQuestion).toBe(2);
    expect(res.draftTotalQuestions).toBe(3);
  });

  it('hides EQ test prompts right after initial test until mid-learning threshold', () => {
    const res = computeEqTestAvailability({
      completedTestsCount: 1,
      draft: null,
      stages: { midLearningTaken: false, finalTaken: false },
      sequenced: makeSequenced(2),
    });
    expect(res.kind).toBe('locked');
    expect(res.isAvailable).toBe(false);
  });

  it('unlocks Mid-Learning Test once 5 primary competencies are completed', () => {
    const seq = makeSequenced(5);
    expect(countCompletedCompetencies(seq)).toBe(5);

    const res = computeEqTestAvailability({
      completedTestsCount: 1,
      draft: null,
      stages: { midLearningTaken: false, finalTaken: false },
      sequenced: seq,
    });
    expect(res.kind).toBe('mid_learning');
    expect(res.isAvailable).toBe(true);
    expect(res.ctaLabel).toBe('Take Mid-Learning Test');
    expect(res.subtitle).not.toMatch(/70%|5/);
  });

  it('hides Mid-Learning Test once taken, until all 12 competencies are completed', () => {
    const resMidTaken = computeEqTestAvailability({
      completedTestsCount: 2,
      draft: null,
      stages: { midLearningTaken: true, finalTaken: false },
      sequenced: makeSequenced(9),
    });
    expect(resMidTaken.kind).toBe('locked');
    expect(resMidTaken.isAvailable).toBe(false);

    const resComplete = computeEqTestAvailability({
      completedTestsCount: 2,
      draft: null,
      stages: { midLearningTaken: true, finalTaken: false },
      sequenced: makeSequenced(12),
    });
    expect(resComplete.kind).toBe('final');
    expect(resComplete.isAvailable).toBe(true);
    expect(resComplete.ctaLabel).toBe('Take EQ Test');
  });

  it('hides EQ Test prompt again after final post-course retake is taken', () => {
    const res = computeEqTestAvailability({
      completedTestsCount: 3,
      draft: null,
      stages: { midLearningTaken: true, finalTaken: true },
      sequenced: makeSequenced(12),
    });
    expect(res.kind).toBe('locked');
    expect(res.isAvailable).toBe(false);
  });
});
