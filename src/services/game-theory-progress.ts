/**
 * Local progress for Game Theory module (completed games).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@lumi6/game-theory-progress/v1';

export interface GameTheoryProgress {
  completedIds: string[];
  completedAt: Record<string, string>;
}

const EMPTY: GameTheoryProgress = { completedIds: [], completedAt: {} };

export async function getGameTheoryProgress(): Promise<GameTheoryProgress> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as GameTheoryProgress;
    return {
      completedIds: Array.isArray(parsed.completedIds) ? parsed.completedIds : [],
      completedAt: parsed.completedAt && typeof parsed.completedAt === 'object' ? parsed.completedAt : {},
    };
  } catch {
    return { ...EMPTY };
  }
}

export async function markGameTheoryComplete(gameId: string): Promise<GameTheoryProgress> {
  const prev = await getGameTheoryProgress();
  if (prev.completedIds.includes(gameId)) return prev;
  const next: GameTheoryProgress = {
    completedIds: [...prev.completedIds, gameId],
    completedAt: { ...prev.completedAt, [gameId]: new Date().toISOString() },
  };
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
