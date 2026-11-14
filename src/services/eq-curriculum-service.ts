import { readCacheJson, writeCacheJson } from '@/lib/async-data-cache';
import { supabase } from '@/lib/supabase';
import {
  applyDatabaseCompetencyGuides,
  EQ_COMPETENCY_CURRICULUM,
  type CompetencyReadingGuide,
} from '@/data/eq-curriculum';

const CACHE_KEY = 'eq_competency_guides:v1';

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

let inFlightFetch: Promise<Record<string, CompetencyReadingGuide>> | null = null;
let loadedFromNetwork = false;

/**
 * Loads competency short & long reading content from `public.eq_competency_guides`.
 * Hydrates and updates `EQ_COMPETENCY_CURRICULUM` in memory, with SWR AsyncStorage caching
 * and silent fallback to bundled defaults if offline or before migration 00030 is applied.
 */
export async function fetchCompetencyGuides(
  forceRefresh = false
): Promise<Record<string, CompetencyReadingGuide>> {
  if (!forceRefresh && loadedFromNetwork) {
    return EQ_COMPETENCY_CURRICULUM;
  }
  if (inFlightFetch) {
    return inFlightFetch;
  }

  inFlightFetch = (async () => {
    try {
      const cached = await readCacheJson<CompetencyReadingGuide[]>(CACHE_KEY);
      if (Array.isArray(cached) && cached.length > 0) {
        applyDatabaseCompetencyGuides(cached);
      }

      const { data, error } = await supabase
        .from('eq_competency_guides')
        .select(
          'competency_key, sequence_order, domain_key, domain_label, title, short_content, what_it_is, why_it_matters, how_to_measure, long_content, practice_prompt, estimated_read_minutes'
        )
        .order('sequence_order', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped = (data as DbCompetencyGuideRow[]).map(mapDbRowToCompetencyGuide);
        applyDatabaseCompetencyGuides(mapped);
        await writeCacheJson(CACHE_KEY, mapped);
        loadedFromNetwork = true;
      }
    } catch {
      // Offline or migration 00030 not yet applied; keep bundled fallback intact.
    } finally {
      inFlightFetch = null;
    }

    return EQ_COMPETENCY_CURRICULUM;
  })();

  return inFlightFetch;
}
