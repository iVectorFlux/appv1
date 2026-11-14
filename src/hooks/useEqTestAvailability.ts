/**
 * Shared hook exposing live EQ test availability (initial / resume / mid-learning / final / locked),
 * latest score, and sequenced curriculum snapshot across Home, Tabs, and Sidebar.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { useLearningCatalog } from '@/hooks/useLearningCatalog';
import { getEQScores } from '@/services/eq-storage';
import {
  fetchUserLearningContentProgress,
  type LearningContentProgressRow,
} from '@/services/learning-content-progress';
import { buildSequencedCatalog } from '@/services/learning-sequence';
import {
  computeEqTestAvailability,
  getEqTestDraftSync,
  getEqTestStagesSync,
  loadEqTestDraft,
  loadEqTestStages,
  subscribeEqTestState,
  type EqTestDraft,
  type EqTestStageRecord,
} from '@/services/eq-test-state';

export function useEqTestAvailability() {
  const { user } = useAuthStore();
  const { episodes } = useLearningCatalog('B2B');

  const [scoresCount, setScoresCount] = useState(0);
  const [latestEqScore, setLatestEqScore] = useState<number | null>(null);
  const [latestDimensionScores, setLatestDimensionScores] = useState<Record<string, number> | null>(null);
  const [progressByKey, setProgressByKey] = useState<Record<string, LearningContentProgressRow>>({});
  const [draft, setDraft] = useState<EqTestDraft | null>(() => getEqTestDraftSync(user?.id));
  const [stages, setStages] = useState<EqTestStageRecord>(() => getEqTestStagesSync(user?.id));

  const refresh = useCallback(async () => {
    const uid = user?.id;
    if (!uid) return;
    setDraft(getEqTestDraftSync(uid));
    setStages(getEqTestStagesSync(uid));
    try {
      const [scores, progress, loadedDraft, loadedStages] = await Promise.all([
        getEQScores(uid),
        fetchUserLearningContentProgress(uid),
        loadEqTestDraft(uid),
        loadEqTestStages(uid),
      ]);
      const latest = scores.length > 0 ? scores[0]! : null;
      setScoresCount(scores.length);
      setLatestEqScore(latest ? Math.round(latest.overallScore) : null);
      setLatestDimensionScores(latest?.dimensionScores ?? null);
      setProgressByKey(progress);
      setDraft(loadedDraft);
      setStages(loadedStages);
    } catch {
      // Keep UI responsive on offline/cached fallback
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  useEffect(() => {
    const unsub = subscribeEqTestState(() => {
      const uid = user?.id;
      if (!uid) return;
      setDraft(getEqTestDraftSync(uid));
      setStages(getEqTestStagesSync(uid));
    });
    return unsub;
  }, [user?.id]);

  const sequenced = useMemo(
    () => buildSequencedCatalog(episodes, progressByKey, latestEqScore),
    [episodes, progressByKey, latestEqScore]
  );

  const availability = useMemo(
    () =>
      computeEqTestAvailability({
        completedTestsCount: scoresCount,
        draft,
        stages,
        sequenced,
      }),
    [scoresCount, draft, stages, sequenced]
  );

  return {
    availability,
    sequenced,
    latestEqScore,
    latestDimensionScores,
    scoresCount,
    refresh,
  };
}

