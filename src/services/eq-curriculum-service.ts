import {
  cacheSegments,
  dedupeRequest,
  isCacheFresh,
  readCacheEntry,
  readMemoryCache,
  withTimeout,
  writeCacheJson,
  writeMemoryCache,
} from '@/lib/async-data-cache';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  applyDatabaseCompetencyGuides,
  EQ_COMPETENCY_CURRICULUM,
  type CompetencyReadingGuide,
} from '@/data/eq-curriculum';

const CACHE_KEY = cacheSegments.competencyGuides();
const GUIDE_FRESH_MS = 5 * 60 * 1000;
const GUIDE_FETCH_TIMEOUT_MS = 7_000;

export type DbCompetencyGuideRow = {
  competency_key: string;
  sequence_order: number;
  domain_key: string;
  domain_label: string;
  title: string;
  short_content: string;
  what_it_is: string;
  why_it_matters: string;
  how_to_measure: string[] | unknown;
  long_content: string;
  practice_prompt: string;
  estimated_read_minutes: number;
};

export function mapDbRowToCompetencyGuide(row: DbCompetencyGuideRow): CompetencyReadingGuide {
  const key = row.competency_key.trim().toUpperCase().replace(/[\s-]+/g, '_');
  const fallback = EQ_COMPETENCY_CURRICULUM[key];
  const measures = Array.isArray(row.how_to_measure)
    ? row.how_to_measure.map((v) => String(v).trim()).filter(Boolean)
    : fallback?.howToMeasure ?? [];

  return {
    key,
    sequenceOrder: Number.isFinite(row.sequence_order)
      ? row.sequence_order
      : fallback?.sequenceOrder ?? 99,
    domainKey: row.domain_key?.trim() || fallback?.domainKey || 'SELF_AWARENESS',
    domainLabel: row.domain_label?.trim() || fallback?.domainLabel || 'Self Awareness',
    title: row.title?.trim() || fallback?.title || key,
    shortSummary: row.short_content?.trim() || fallback?.shortSummary || '',
    estimatedReadMinutes:
      typeof row.estimated_read_minutes === 'number' && row.estimated_read_minutes > 0
        ? row.estimated_read_minutes
        : fallback?.estimatedReadMinutes ?? 3,
    whatItIs: row.what_it_is?.trim() || fallback?.whatItIs || '',
    whyItMatters: row.why_it_matters?.trim() || fallback?.whyItMatters || '',
    howToMeasure: measures,
    longContent: row.long_content?.trim() || fallback?.longContent || undefined,
    practicePrompt: row.practice_prompt?.trim() || fallback?.practicePrompt || '',
  };
}

/**
 * Apply raw DB guide rows received from `/api/catalog` or Supabase directly into L1+L2 caches.
 */
export async function hydrateCompetencyGuidesFromRows(
  rows: DbCompetencyGuideRow[]
): Promise<void> {
  if (!Array.isArray(rows) || rows.length === 0) return;
  const mapped = rows.map(mapDbRowToCompetencyGuide);
  applyDatabaseCompetencyGuides(mapped);
  writeMemoryCache(CACHE_KEY, mapped);
  await writeCacheJson(CACHE_KEY, mapped);
}

/**
 * Loads competency short & long reading content from L1 memory -> L2 AsyncStorage -> Supabase.
 * Skips redundant network fetches when cached guides are fresh (< 5 min), deduplicates
 * concurrent callers, and enforces a 7s timeout so screens never hang.
 */
export async function fetchCompetencyGuides(
  forceRefresh = false
): Promise<Record<string, CompetencyReadingGuide>> {
  const mem = readMemoryCache<CompetencyReadingGuide[]>(CACHE_KEY);
  if (!forceRefresh && mem && isCacheFresh(mem.updatedAt, GUIDE_FRESH_MS)) {
    applyDatabaseCompetencyGuides(mem.data);
    return EQ_COMPETENCY_CURRICULUM;
  }

  return dedupeRequest(`guides:${forceRefresh ? 'force' : 'swr'}`, async () => {
    try {
      const disk = await readCacheEntry<CompetencyReadingGuide[]>(CACHE_KEY);
      if (disk?.data?.length) {
        applyDatabaseCompetencyGuides(disk.data);
        if (!forceRefresh && isCacheFresh(disk.updatedAt, GUIDE_FRESH_MS)) {
          return EQ_COMPETENCY_CURRICULUM;
        }
      }

      if (!isSupabaseConfigured()) {
        return EQ_COMPETENCY_CURRICULUM;
      }

      const queryPromise = (async () => {
        const { data, error } = await supabase
          .from('eq_competency_guides')
          .select(
            'competency_key, sequence_order, domain_key, domain_label, title, short_content, what_it_is, why_it_matters, how_to_measure, long_content, practice_prompt, estimated_read_minutes'
          )
          .order('sequence_order', { ascending: true });
        return { data, error };
      })();

      const { data, error } = await withTimeout(
        queryPromise,
        GUIDE_FETCH_TIMEOUT_MS,
        'Competency guides fetch'
      );

      if (!error && Array.isArray(data) && data.length > 0) {
        await hydrateCompetencyGuidesFromRows(data as DbCompetencyGuideRow[]);
      }
    } catch {
      // Offline, timed out, or migration 00030 not yet applied; keep cached/bundled fallback intact.
    }

    return EQ_COMPETENCY_CURRICULUM;
  });
}
