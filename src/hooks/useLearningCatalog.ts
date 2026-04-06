import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchLearningEpisodes, type LearningEpisode } from '@/services/learning-content-catalog';
import { LEARNING_MODULES } from '@/data/learning-content';
import { isSupabaseConfigured } from '@/lib/supabase';

export function useLearningCatalog() {
  const [episodes, setEpisodes] = useState<LearningEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emptyRemote, setEmptyRemote] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setEmptyRemote(false);
    try {
      const e = await fetchLearningEpisodes('en');
      setEpisodes(e);
      setEmptyRemote(isSupabaseConfigured() && e.length === 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load catalog');
      setEpisodes([]);
      setEmptyRemote(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const b2c = useMemo(() => episodes.filter((x) => x.eqType === 'B2C'), [episodes]);
  const b2b = useMemo(() => episodes.filter((x) => x.eqType === 'B2B'), [episodes]);

  const hasRemote = episodes.length > 0;

  const firstPersonalRouteId = b2c[0]?.routeId ?? LEARNING_MODULES[0]?.id;
  const firstProfessionalRouteId = b2b[0]?.routeId;

  return {
    episodes,
    b2c,
    b2b,
    loading,
    error,
    reload: load,
    hasRemote,
    emptyRemote,
    firstPersonalRouteId,
    firstProfessionalRouteId,
  };
}
