/**
 * Stale-while-revalidate: show last JSON snapshot from AsyncStorage immediately, then refresh from network.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const V = 1;
const P = 'eqapp:swr';

function key(segment: string): string {
  return `${P}:v${V}:${segment}`;
}

export async function readCacheJson<T>(segment: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key(segment));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeCacheJson<T>(segment: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key(segment), JSON.stringify(data));
  } catch {
    // best-effort
  }
}

export async function removeCacheSegment(segment: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key(segment));
  } catch {
    // best-effort
  }
}

/** User-scoped segment helpers */
export const cacheSegments = {
  eqScores: (userId: string) => `eq_scores:${userId}`,
  big5Latest: (userId: string) => `big5_latest:${userId}`,
  traitTestLatest: (userId: string) => `trait_test_latest:${userId}`,
  insightsLearningBundle: (userId: string) => `insights_bundle:${userId}`,
  learningEpisodes: (language: string) => `learning_episodes:${language}`,
} as const;
