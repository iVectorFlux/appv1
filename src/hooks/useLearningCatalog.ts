import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchLearningEpisodes,
  type LearningEpisode,
  type LearningAudience,
} from '@/services/learning-content-catalog';
import { LEARNING_MODULES } from '@/data/learning-content';
import { isSupabaseConfigured } from '@/lib/supabase';
import { readCacheJson, writeCacheJson, cacheSegments } from '@/lib/async-data-cache';

const CATALOG_LANG = 'en';

export type LearningCatalogAudienceFilter = LearningAudience | 'all';

export function useLearningCatalog(audience: LearningCatalogAudienceFilter = 'B2C') {
  const [allEpisodes, setAllEpisodes] = useState<LearningEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emptyRemote, setEmptyRemote] = useState(false);

  const episodes = useMemo(() => {
    if (audience === 'all') return allEpisodes;
    return allEpisodes.filter((ep) => ep.eqType === audience);
  }, [allEpisodes, audience]);

  const load = useCallback(async () => {
    setError(null);
    setEmptyRemote(false);
    const disk = await readCacheJson<LearningEpisode[]>(cacheSegments.learningEpisodes(CATALOG_LANG));
    let hadDisk = false;
    if (disk && disk.length > 0) {
      setAllEpisodes(disk);
      setEmptyRemote(isSupabaseConfigured() && disk.length === 0);
      setLoading(false);
      hadDisk = true;
    } else {
      setLoading(true);
    }
    try {
      const e = await fetchLearningEpisodes(CATALOG_LANG);
      setAllEpisodes(e);
      setEmptyRemote(isSupabaseConfigured() && e.length === 0);
      void writeCacheJson(cacheSegments.learningEpisodes(CATALOG_LANG), e);
    } catch (err) {
      if (!hadDisk) {
        setError(err instanceof Error ? err.message : 'Failed to load catalog');
        setAllEpisodes([]);
        setEmptyRemote(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const hasRemote = episodes.length > 0;

  const firstPersonalRouteId =
    allEpisodes.filter((ep) => ep.eqType === 'B2C')[0]?.routeId ?? allEpisodes[0]?.routeId ?? LEARNING_MODULES[0]?.id;

  return {
    episodes,
    loading,
    error,
    reload: load,
    hasRemote,
    emptyRemote,
    firstPersonalRouteId,
  };
}
