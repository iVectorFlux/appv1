import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchLearningEpisodes,
  getSyncCachedEpisodes,
  type LearningEpisode,
  type LearningAudience,
} from '@/services/learning-content-catalog';
import { LEARNING_MODULES } from '@/data/learning-content';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  readCacheJson,
  writeCacheJson,
  cacheSegments,
} from '@/lib/async-data-cache';
import { sortB2bEpisodesInPillarOrder } from '@/data/learning-b2b-taxonomy';

const CATALOG_LANG = 'en';

export type LearningCatalogAudienceFilter = LearningAudience | 'all';

export function useLearningCatalog(audience: LearningCatalogAudienceFilter = 'B2C') {
  const initialSync = getSyncCachedEpisodes(CATALOG_LANG);
  const [allEpisodes, setAllEpisodes] = useState<LearningEpisode[]>(() => initialSync ?? []);
  const [loading, setLoading] = useState(() => !initialSync?.length);
  const [error, setError] = useState<string | null>(null);
  const [emptyRemote, setEmptyRemote] = useState(false);

  const episodes = useMemo(() => {
    let list =
      audience === 'all' ? allEpisodes : allEpisodes.filter((ep) => ep.eqType === audience);
    if (audience === 'B2B' && list.length > 0) {
      list = sortB2bEpisodesInPillarOrder(list);
    }
    return list;
  }, [allEpisodes, audience]);

  const load = useCallback(async (forceRefresh = false) => {
    setError(null);
    setEmptyRemote(false);

    const syncHit = getSyncCachedEpisodes(CATALOG_LANG);
    let hasCached = Boolean(syncHit?.length);
    if (syncHit?.length) {
      setAllEpisodes(syncHit);
      setLoading(false);
    } else {
      const disk = await readCacheJson<LearningEpisode[]>(cacheSegments.learningEpisodes(CATALOG_LANG));
      if (disk && disk.length > 0) {
        setAllEpisodes(disk);
        setLoading(false);
        hasCached = true;
      } else {
        setLoading(true);
      }
    }

    try {
      const fresh = await fetchLearningEpisodes(CATALOG_LANG, { forceRefresh });
      setAllEpisodes(fresh);
      setEmptyRemote(isSupabaseConfigured() && fresh.length === 0);
      if (fresh.length > 0) {
        void writeCacheJson(cacheSegments.learningEpisodes(CATALOG_LANG), fresh);
      }
    } catch (err) {
      if (!hasCached) {
        setError(err instanceof Error ? err.message : 'Failed to load catalog');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const reload = useCallback(() => load(true), [load]);

  const hasRemote = episodes.length > 0;

  const firstPersonalRouteId =
    allEpisodes.filter((ep) => ep.eqType === 'B2C')[0]?.routeId ?? allEpisodes[0]?.routeId ?? LEARNING_MODULES[0]?.id;

  return {
    episodes,
    loading,
    error,
    reload,
    hasRemote,
    emptyRemote,
    firstPersonalRouteId,
  };
}
