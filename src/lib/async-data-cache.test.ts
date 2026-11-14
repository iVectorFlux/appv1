import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearMemoryCache,
  dedupeRequest,
  isCacheFresh,
  readCacheEntry,
  readMemoryCache,
  withTimeout,
  writeCacheJson,
} from './async-data-cache';

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

describe('async-data-cache resilience & SWR primitives', () => {
  beforeEach(() => {
    clearMemoryCache();
  });

  it('stores L1 memory and L2 AsyncStorage entries with timestamps', async () => {
    await writeCacheJson('test_segment', { count: 42 });

    const memHit = readMemoryCache<{ count: number }>('test_segment');
    expect(memHit?.data).toEqual({ count: 42 });
    expect(isCacheFresh(memHit?.updatedAt, 60_000)).toBe(true);

    clearMemoryCache();
    const diskHit = await readCacheEntry<{ count: number }>('test_segment');
    expect(diskHit?.data).toEqual({ count: 42 });
    expect(readMemoryCache<{ count: number }>('test_segment')?.data).toEqual({ count: 42 });
  });

  it('coalesces concurrent calls via dedupeRequest into one underlying execution', async () => {
    let calls = 0;
    const factory = () =>
      new Promise<string>((resolve) => {
        calls += 1;
        setTimeout(() => resolve('shared-result'), 15);
      });

    const [a, b, c] = await Promise.all([
      dedupeRequest('same-key', factory),
      dedupeRequest('same-key', factory),
      dedupeRequest('same-key', factory),
    ]);

    expect(calls).toBe(1);
    expect([a, b, c]).toEqual(['shared-result', 'shared-result', 'shared-result']);
  });

  it('rejects stalled promises cleanly when withTimeout expires', async () => {
    const never = new Promise<string>(() => {});
    await expect(withTimeout(never, 20, 'Stalled request')).rejects.toThrow(
      'Stalled request timed out after 20ms'
    );
  });
});
