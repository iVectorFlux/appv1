import { useCallback, useEffect, useState } from 'react';
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
      const personalOnly = e.filter((ep) => ep.eqType === 'B2C');
      setEpisodes(personalOnly);
      setEmptyRemote(isSupabaseConfigured() && personalOnly.length === 0);
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

  const hasRemote = episodes.length > 0;

  const firstPersonalRouteId = episodes[0]?.routeId ?? LEARNING_MODULES[0]?.id;

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
