/**
 * EQ Test Availability, Draft Resume, and Milestone Gating
 *
 * Centralizes rules for:
 * 1. Saving & restoring an in-progress EQ test draft so learners always pick up
 *    from the exact question they left off at ("Complete EQ Test").
 * 2. Hiding repeated EQ test prompts after the initial test is completed,
 *    then unlocking cleanly at:
 *    - Mid-learning milestone (5+ of 12 competencies or >= 70% course progress)
 *      as "Mid-Learning Test" (silently gated — thresholds are not shown in copy)
 *    - Full curriculum completion (100% of all reading, video, and audio modules)
 *      as "EQ Test"
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EQQuestion, EQResponse } from '@/types/eq-assessment';
import type { SequencedCatalogState } from '@/services/learning-sequence';

export const MID_LEARNING_COMPETENCY_THRESHOLD = 5;
export const MID_LEARNING_PROGRESS_PCT_THRESHOLD = 70;

export interface EqTestDraft {
  userId: string;
  sessionId: string | null;
  sessionStartTime: number;
  questions: EQQuestion[];
  currentIndex: number;
  responses: EQResponse[];
  updatedAt: number;
}

export interface EqTestStageRecord {
  midLearningTaken: boolean;
  finalTaken: boolean;
  lastCompletedAt?: string;
}

export type EqTestAvailabilityKind = 'resume' | 'initial' | 'mid_learning' | 'final' | 'locked';

export interface EqTestAvailability {
  kind: EqTestAvailabilityKind;
  isAvailable: boolean;
  tabLabel: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  route: string;
  draftCurrentQuestion: number;
  draftTotalQuestions: number;
}

const DRAFT_KEY_PREFIX = 'eq_full_test_draft_v1:';
const STAGES_KEY_PREFIX = 'eq_full_test_stages_v1:';

const draftMemory = new Map<string, EqTestDraft | null>();
const stagesMemory = new Map<string, EqTestStageRecord>();
const listeners = new Set<() => void>();

function notifyListeners() {
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      // Ignore subscriber errors
    }
  }
}

export function subscribeEqTestState(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function readWebStorage(key: string): string | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeWebStorage(key: string, value: string | null): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    if (value === null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Ignore quota / privacy mode errors
  }
}

export function isValidActiveDraft(draft: EqTestDraft | null | undefined): draft is EqTestDraft {
  if (!draft || !Array.isArray(draft.questions) || draft.questions.length === 0) return false;
  if (draft.currentIndex < 0 || draft.currentIndex >= draft.questions.length) return false;
  return draft.responses.length > 0 || draft.currentIndex > 0;
}

export function getEqTestDraftSync(userId: string | null | undefined): EqTestDraft | null {
  if (!userId) return null;
  if (draftMemory.has(userId)) {
    const mem = draftMemory.get(userId) ?? null;
    return isValidActiveDraft(mem) ? mem : null;
  }
  const raw = readWebStorage(`${DRAFT_KEY_PREFIX}${userId}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as EqTestDraft;
    if (isValidActiveDraft(parsed)) {
      draftMemory.set(userId, parsed);
      return parsed;
    }
  } catch {
    // Corrupt draft
  }
  return null;
}

export async function loadEqTestDraft(userId: string | null | undefined): Promise<EqTestDraft | null> {
  if (!userId) return null;
  const sync = getEqTestDraftSync(userId);
  if (sync) return sync;
  try {
    const raw = await AsyncStorage.getItem(`${DRAFT_KEY_PREFIX}${userId}`);
    if (!raw) {
      draftMemory.set(userId, null);
      return null;
    }
    const parsed = JSON.parse(raw) as EqTestDraft;
    if (isValidActiveDraft(parsed)) {
      draftMemory.set(userId, parsed);
      writeWebStorage(`${DRAFT_KEY_PREFIX}${userId}`, raw);
      return parsed;
    }
  } catch {
    // Non-fatal
  }
  return null;
}

export async function saveEqTestDraft(draft: EqTestDraft): Promise<void> {
  if (!draft.userId) return;
  const key = `${DRAFT_KEY_PREFIX}${draft.userId}`;
  const payload = JSON.stringify(draft);
  draftMemory.set(draft.userId, draft);
  writeWebStorage(key, payload);
  notifyListeners();
  try {
    await AsyncStorage.setItem(key, payload);
  } catch {
    // Ignore storage write failure
  }
}

export async function clearEqTestDraft(userId: string | null | undefined): Promise<void> {
  if (!userId) return;
  const key = `${DRAFT_KEY_PREFIX}${userId}`;
  draftMemory.set(userId, null);
  writeWebStorage(key, null);
  notifyListeners();
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // Ignore
  }
}

const DEFAULT_STAGES: EqTestStageRecord = {
  midLearningTaken: false,
  finalTaken: false,
};

export function getEqTestStagesSync(userId: string | null | undefined): EqTestStageRecord {
  if (!userId) return DEFAULT_STAGES;
  if (stagesMemory.has(userId)) {
    return stagesMemory.get(userId)!;
  }
  const raw = readWebStorage(`${STAGES_KEY_PREFIX}${userId}`);
  if (!raw) return DEFAULT_STAGES;
  try {
    const parsed = JSON.parse(raw) as Partial<EqTestStageRecord>;
    const normalized: EqTestStageRecord = {
      midLearningTaken: Boolean(parsed.midLearningTaken),
      finalTaken: Boolean(parsed.finalTaken),
      lastCompletedAt: typeof parsed.lastCompletedAt === 'string' ? parsed.lastCompletedAt : undefined,
    };
    stagesMemory.set(userId, normalized);
    return normalized;
  } catch {
    return DEFAULT_STAGES;
  }
}

export async function loadEqTestStages(userId: string | null | undefined): Promise<EqTestStageRecord> {
  if (!userId) return DEFAULT_STAGES;
  const key = `${STAGES_KEY_PREFIX}${userId}`;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return getEqTestStagesSync(userId);
    const parsed = JSON.parse(raw) as Partial<EqTestStageRecord>;
    const normalized: EqTestStageRecord = {
      midLearningTaken: Boolean(parsed.midLearningTaken),
      finalTaken: Boolean(parsed.finalTaken),
      lastCompletedAt: typeof parsed.lastCompletedAt === 'string' ? parsed.lastCompletedAt : undefined,
    };
    stagesMemory.set(userId, normalized);
    writeWebStorage(key, raw);
    return normalized;
  } catch {
    return getEqTestStagesSync(userId);
  }
}

export async function markEqTestStageCompleted(
  userId: string,
  sequenced: Pick<SequencedCatalogState, 'items' | 'completedCount' | 'totalCount' | 'completionRatePct'>
): Promise<void> {
  if (!userId) return;
  const current = await loadEqTestStages(userId);
  const completedCompetencies = countCompletedCompetencies(sequenced);
  const isCourseComplete = sequenced.totalCount > 0 && sequenced.completedCount >= sequenced.totalCount;
  const isMidLearning =
    completedCompetencies >= MID_LEARNING_COMPETENCY_THRESHOLD ||
    sequenced.completionRatePct >= MID_LEARNING_PROGRESS_PCT_THRESHOLD;

  const updated: EqTestStageRecord = {
    midLearningTaken: current.midLearningTaken || (isMidLearning && !isCourseComplete),
    finalTaken: current.finalTaken || isCourseComplete,
    lastCompletedAt: new Date().toISOString(),
  };

  const key = `${STAGES_KEY_PREFIX}${userId}`;
  const serialized = JSON.stringify(updated);
  stagesMemory.set(userId, updated);
  writeWebStorage(key, serialized);
  notifyListeners();
  try {
    await AsyncStorage.setItem(key, serialized);
  } catch {
    // Ignore
  }
}

export function countCompletedCompetencies(
  sequenced: Pick<SequencedCatalogState, 'items'>
): number {
  const byCompetency = new Map<string, boolean>();
  for (const item of sequenced.items) {
    const compKey = item.guide.key || item.episode.competency || item.episode.episodeKey;
    const prev = byCompetency.get(compKey);
    // Competency counts as completed once all modules in that competency are done
    byCompetency.set(compKey, prev === undefined ? item.completed : prev && item.completed);
  }
  let count = 0;
  for (const done of byCompetency.values()) {
    if (done) count += 1;
  }
  return count;
}

export interface ComputeEqTestAvailabilityInput {
  completedTestsCount: number;
  draft: EqTestDraft | null;
  stages: EqTestStageRecord;
  sequenced: Pick<SequencedCatalogState, 'items' | 'completedCount' | 'totalCount' | 'completionRatePct'>;
}

export function computeEqTestAvailability({
  completedTestsCount,
  draft,
  stages,
  sequenced,
}: ComputeEqTestAvailabilityInput): EqTestAvailability {
  if (isValidActiveDraft(draft)) {
    const currentQ = Math.min(draft.questions.length, draft.currentIndex + 1);
    const totalQ = draft.questions.length;
    return {
      kind: 'resume',
      isAvailable: true,
      tabLabel: 'EQ Test',
      title: 'Complete EQ Test',
      subtitle: `Question ${currentQ} of ${totalQ} · Continue where you left off`,
      ctaLabel: 'Complete EQ Test',
      route: '/full-eq-test?resume=1',
      draftCurrentQuestion: currentQ,
      draftTotalQuestions: totalQ,
    };
  }

  if (completedTestsCount === 0) {
    return {
      kind: 'initial',
      isAvailable: true,
      tabLabel: 'EQ Test',
      title: 'Take EQ Test',
      subtitle: 'Measure your emotional intelligence to personalize your path.',
      ctaLabel: 'Take EQ Test',
      route: '/full-eq-test',
      draftCurrentQuestion: 0,
      draftTotalQuestions: 0,
    };
  }

  const isCourseComplete =
    sequenced.totalCount > 0 && sequenced.completedCount >= sequenced.totalCount;

  if (isCourseComplete && !stages.finalTaken) {
    return {
      kind: 'final',
      isAvailable: true,
      tabLabel: 'EQ Test',
      title: 'EQ Test',
      subtitle: 'All modules complete. Take the EQ Test to measure your growth.',
      ctaLabel: 'Take EQ Test',
      route: '/full-eq-test',
      draftCurrentQuestion: 0,
      draftTotalQuestions: 0,
    };
  }

  const completedCompetencies = countCompletedCompetencies(sequenced);
  const midLearningUnlocked =
    completedCompetencies >= MID_LEARNING_COMPETENCY_THRESHOLD ||
    sequenced.completionRatePct >= MID_LEARNING_PROGRESS_PCT_THRESHOLD;

  if (
    !isCourseComplete &&
    midLearningUnlocked &&
    !stages.midLearningTaken &&
    completedTestsCount < 2
  ) {
    return {
      kind: 'mid_learning',
      isAvailable: true,
      tabLabel: 'Mid-Learning',
      title: 'Mid-Learning Test',
      subtitle: 'Check how your emotional intelligence is progressing so far.',
      ctaLabel: 'Take Mid-Learning Test',
      route: '/full-eq-test',
      draftCurrentQuestion: 0,
      draftTotalQuestions: 0,
    };
  }

  return {
    kind: 'locked',
    isAvailable: false,
    tabLabel: 'EQ Test',
    title: 'EQ Test',
    subtitle: '',
    ctaLabel: 'Take EQ Test',
    route: '/full-eq-test',
    draftCurrentQuestion: 0,
    draftTotalQuestions: 0,
  };
}
