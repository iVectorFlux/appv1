/**
 * Multi-tier Cache & Request Resilience Utilities
 *
 * L1: Synchronous in-memory cache for 0ms reads across screens/tabs.
 * L2: Persistent AsyncStorage cache with timestamps for instant cold/repeat starts.
 * Plus in-flight request deduplication and hard timeout guards so screens
 * never hang indefinitely on "Loading...".
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const V = 1;
const P = 'eqapp:swr';

function key(segment: string): string {
  return `${P}:v${V}:${segment}`;
}

export interface CacheEntry<T> {
  data: T;
  updatedAt: number;
}

interface StoredEnvelope<T> {
  __swrV: 2;
  updatedAt: number;
  data: T;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();
const inFlightRequests = new Map<string, Promise<unknown>>();

function isStoredEnvelope<T>(raw: unknown): raw is StoredEnvelope<T> {
  return (
    typeof raw === 'object' &&
    raw !== null &&
    (raw as Partial<StoredEnvelope<T>>).__swrV === 2 &&
    'data' in raw &&
    typeof (raw as Partial<StoredEnvelope<T>>).updatedAt === 'number'
  );
}

/** Synchronously read L1 memory cache (returns null if never populated this session). */
export function readMemoryCache<T>(segment: string): CacheEntry<T> | null {
  const hit = memoryCache.get(key(segment));
  return hit ? (hit as CacheEntry<T>) : null;
}

/** Synchronously update L1 memory cache. */
export function writeMemoryCache<T>(segment: string, data: T, updatedAt = Date.now()): void {
  memoryCache.set(key(segment), { data, updatedAt });
}

export function isCacheFresh(updatedAt: number | undefined | null, maxAgeMs: number): boolean {
  if (!updatedAt || maxAgeMs <= 0) return false;
  return Date.now() - updatedAt < maxAgeMs;
}

export async function readCacheEntry<T>(segment: string): Promise<CacheEntry<T> | null> {
  const mem = readMemoryCache<T>(segment);
  if (mem) return mem;

  try {
    const raw = await AsyncStorage.getItem(key(segment));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    const entry: CacheEntry<T> = isStoredEnvelope<T>(parsed)
      ? { data: parsed.data, updatedAt: parsed.updatedAt }
      : { data: parsed as T, updatedAt: 0 };
    memoryCache.set(key(segment), entry);
    return entry;
  } catch {
    return null;
  }
}

export async function readCacheJson<T>(segment: string): Promise<T | null> {
  const entry = await readCacheEntry<T>(segment);
  return entry ? entry.data : null;
}

export async function writeCacheJson<T>(segment: string, data: T): Promise<void> {
  const updatedAt = Date.now();
  memoryCache.set(key(segment), { data, updatedAt });
  try {
    const envelope: StoredEnvelope<T> = { __swrV: 2, updatedAt, data };
    await AsyncStorage.setItem(key(segment), JSON.stringify(envelope));
  } catch {
    // best-effort
  }
}

export async function removeCacheSegment(segment: string): Promise<void> {
  memoryCache.delete(key(segment));
  try {
    await AsyncStorage.removeItem(key(segment));
  } catch {
    // best-effort
  }
}

/**
 * Race any async operation against a timeout so slow/stalled sockets cannot hang the UI.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label = 'Request'
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/**
 * Share a single in-flight promise across concurrent callers with the same key.
 */
export function dedupeRequest<T>(requestKey: string, factory: () => Promise<T>): Promise<T> {
  const existing = inFlightRequests.get(requestKey);
  if (existing) {
    return existing as Promise<T>;
  }
  const tracked = factory().finally(() => {
    inFlightRequests.delete(requestKey);
  });
  inFlightRequests.set(requestKey, tracked);
  return tracked;
}

/** Clear all L1 memory caches (useful in tests or sign-out). */
export function clearMemoryCache(): void {
  memoryCache.clear();
}

/** User-scoped & global segment helpers */
export const cacheSegments = {
  eqScores: (userId: string) => `eq_scores:${userId}`,
  big5Latest: (userId: string) => `big5_latest:${userId}`,
  insightsLearningBundle: (userId: string) => `insights_bundle:${userId}`,
  learningEpisodes: (language: string) => `learning_episodes:${language}`,
  learningContentRows: (language: string) => `learning_rows:${language}`,
  competencyGuides: () => `eq_competency_guides:v1`,
  learningProgress: (userId: string) => `learning_content_progress:${userId}`,
  authUser: (userId: string) => `auth_user:${userId}`,
} as const;
