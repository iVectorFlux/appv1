/**
 * Loads EQ learning episodes from public.learning_content (pairs audio + video rows).
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { EQDimension } from '@/types/eq-assessment';
import { DIMENSION_INFO, LEARNING_MODULES, type LearningModule } from '@/data/learning-content';
import { b2bEpisodeSubtitle } from '@/data/learning-b2b-taxonomy';
import bundledRows from '@/data/learning-content-rows.json';
import {
  fetchCompetencyGuides,
  hydrateCompetencyGuidesFromRows,
  type DbCompetencyGuideRow,
} from '@/services/eq-curriculum-service';
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

export type LearningAudience = 'B2C' | 'B2B';

export type LearningContentRow = {
  id: string;
  content_for: string;
  eq_type: string;
  domain: string;
  competency: string;
  episode_title: string;
  episode_description: string | null;
  industry: string | null;
  level: string | null;
  content_type: string;
  s3_link: string;
  created_at: string;
  updated_at: string;
  language: string;
  /** Curriculum order (lower = earlier). Same value for audio+video of one episode. */
  sort_order?: number;
  /** Database-driven short reading summary for this episode. */
  short_content?: string | null;
  /** Database-driven long first-principles reading material for this episode. */
  long_content?: string | null;
  /** Estimated reading time in minutes. */
  estimated_read_minutes?: number | null;
};

export type LearningEpisode = {
  episodeKey: string;
  eqType: LearningAudience;
  title: string;
  description: string;
  domain: string;
  competency: string;
  dimension: EQDimension;
  videoUrl: string | null;
  audioUrl: string | null;
  /** Prefer video row id for URLs so progress and deep links stay stable */
  routeId: string;
  icon: string;
  color: string;
  sortOrder: number;
  shortContent?: string;
  longContent?: string;
  estimatedReadMinutes?: number;
};

function groupKey(row: Pick<LearningContentRow, 'eq_type' | 'domain' | 'competency' | 'episode_title'>): string {
  return `${row.eq_type}|${row.domain}|${row.competency}|${row.episode_title}`;
}

export function episodeKeyFromRow(row: Pick<LearningContentRow, 'eq_type' | 'domain' | 'competency' | 'episode_title'>): string {
  return groupKey(row);
}

/**
 * S3 "console" open-object URLs are HTML pages, not media. Map to a normal HTTPS object URL
 * (virtual-hosted style) so expo-av and browser video/audio can play.
 * Pass-through for already-correct s3 / CloudFront links.
 */
export function normalizeS3MediaUrl(url: string | null | undefined): string | null {
  const t = url?.trim();
  if (!t) return null;
  if (!t.includes('console.aws.amazon.com') || !t.toLowerCase().includes('prefix=')) {
    return t;
  }
  try {
    const u = new URL(t);
    const parts = u.hostname.split('.');
    // {bucket}.s3.{region}.console.aws.amazon.com
    if (parts.length < 6 || parts[1] !== 's3' || parts[3] !== 'console') {
      return t;
    }
    const bucket = parts[0]!;
    const region = parts[2]!;
    const prefix = u.searchParams.get('prefix');
    if (!prefix) return t;
    const key = prefix.replace(/^\/+/, '');
    return `https://${bucket}.s3.${region}.amazonaws.com/${encodeURI(key)}`;
  } catch {
    return t;
  }
}

/** B2C intro lesson shown as "Introduction" in Learn / detail (video + audio). */
const INTRO_EPISODE_TITLES = new Set(['Emotional intelligence importance']);

export function isIntroEpisodeTitle(title: string): boolean {
  return INTRO_EPISODE_TITLES.has(title.trim());
}

/** Normalise DB domain/competency strings (handles "Self Awareness", SELF_AWARENESS, SELF_AWARENESS_DOMAIN). */
function normalizeDbKey(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
    .replace(/_+/g, '_');
}

/**
 * Map DB domain/competency to in-app EQ dimension filters.
 * Supports B2C pillar domains (SELF_AWARENESS, SELF_REGULATION, …) and legacy four-domain rows.
 */
export function mapLearningRowToDimension(domain: string, competency: string): EQDimension {
  const d = normalizeDbKey(domain);
  const c = normalizeDbKey(competency);

  // B2C pillar naming (matches six dimensions in Learn / Skill Lab)
  if (d === 'RESILIENCE' || d === 'RESILIENCE_DOMAIN') return 'resilience';
  if (d === 'MOTIVATION' || d === 'MOTIVATION_DOMAIN') return 'motivation';
  if (
    d === 'SOCIAL_SKILLS' ||
    d === 'SOCIAL_SKILLS_DOMAIN' ||
    d === 'SOCIAL_SKILL' ||
    d === 'SOCIAL_SKILL_DOMAIN'
  ) {
    return 'social_skills';
  }
  if (d === 'EMPATHY' || d === 'EMPATHY_DOMAIN') return 'empathy';
  if (d === 'SELF_REGULATION' || d === 'SELF_REGULATION_DOMAIN') return 'self_regulation';
  if (d === 'SELF_AWARENESS' || d === 'SELF_AWARENESS_DOMAIN') return 'self_awareness';

  // Legacy four-domain model (older seeds / B2B)
  if (d === 'SELF_MANAGEMENT_DOMAIN') {
    if (c === 'RESILIENCE') return 'resilience';
    return 'self_regulation';
  }
  if (d === 'SOCIAL_AWARENESS_DOMAIN') {
    if (c === 'EMPATHY') return 'empathy';
    if (c === 'ACHIEVEMENT_ORIENTATION') return 'motivation';
    return 'social_skills';
  }
  if (d === 'RELATIONSHIP_MANAGEMENT_DOMAIN') return 'social_skills';

  return 'self_awareness';
}

export function rowsToEpisodes(rows: LearningContentRow[]): LearningEpisode[] {
  const map = new Map<string, LearningContentRow[]>();
  for (const r of rows) {
    const k = groupKey(r);
    const list = map.get(k) ?? [];
    list.push(r);
    map.set(k, list);
  }

  const out: LearningEpisode[] = [];
  for (const [, group] of map) {
    const video = group.find((x) => x.content_type === 'video');
    const audio = group.find((x) => x.content_type === 'audio');
    const anchor = video ?? audio;
    if (!anchor) continue;
    const eqType = anchor.eq_type === 'B2B' ? 'B2B' : 'B2C';
    const dimension = mapLearningRowToDimension(anchor.domain, anchor.competency);
    const info = DIMENSION_INFO[dimension];
    const sortOrder = Math.min(...group.map((r) => r.sort_order ?? 100));
    const videoUrl = normalizeS3MediaUrl(video?.s3_link);
    const audioUrl = normalizeS3MediaUrl(audio?.s3_link);
    const shortContent =
      video?.short_content?.trim() ||
      audio?.short_content?.trim() ||
      anchor.short_content?.trim() ||
      undefined;
    const longContent =
      video?.long_content?.trim() ||
      audio?.long_content?.trim() ||
      anchor.long_content?.trim() ||
      undefined;
    const rawReadMins =
      video?.estimated_read_minutes ??
      audio?.estimated_read_minutes ??
      anchor.estimated_read_minutes;
    const estimatedReadMinutes =
      typeof rawReadMins === 'number' && rawReadMins > 0 ? rawReadMins : undefined;
    out.push({
      episodeKey: groupKey(anchor),
      eqType,
      title: anchor.episode_title,
      description: anchor.episode_description?.trim() || '',
      domain: anchor.domain,
      competency: anchor.competency,
      dimension,
      videoUrl,
      audioUrl,
      routeId: (video ?? audio)!.id,
      icon: info.icon,
      color: info.color,
      sortOrder,
      shortContent,
      longContent,
      estimatedReadMinutes,
    });
  }

  out.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
  return out;
}

const CATALOG_FRESH_MS = 5 * 60 * 1000;
const EDGE_CATALOG_TIMEOUT_MS = 4_500;
const SUPABASE_CATALOG_TIMEOUT_MS = 8_000;

function getBundledRowsForLanguage(language: string): LearningContentRow[] {
  return (bundledRows as LearningContentRow[]).filter(
    (r) => r.language === language && r.content_for === 'EQ'
  );
}

/**
 * Synchronously return episodes from L1 memory cache (0ms, no spinner on repeat views).
 */
export function getSyncCachedEpisodes(language = 'en'): LearningEpisode[] | null {
  const memEp = readMemoryCache<LearningEpisode[]>(cacheSegments.learningEpisodes(language));
  if (memEp?.data?.length) return memEp.data;
  const memRows = readMemoryCache<LearningContentRow[]>(cacheSegments.learningContentRows(language));
  if (memRows?.data?.length) {
    const eps = rowsToEpisodes(memRows.data);
    writeMemoryCache(cacheSegments.learningEpisodes(language), eps, memRows.updatedAt);
    return eps;
  }
  return null;
}

/**
 * Resolve edge-cached `/api/catalog` URL on deployed web (never fails or throws on localhost/native).
 */
function getEdgeCatalogUrl(language: string): string | null {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !window.location) {
    return null;
  }
  const host = window.location.hostname;
  if (!host || host === 'localhost' || host === '127.0.0.1') return null;
  return `${window.location.protocol}//${window.location.host}/api/catalog?language=${encodeURIComponent(language)}`;
}

async function tryFetchEdgeCatalog(
  language: string
): Promise<{ rows: LearningContentRow[]; guides: DbCompetencyGuideRow[] } | null> {
  const url = getEdgeCatalogUrl(language);
  if (!url || typeof fetch === 'undefined') return null;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), EDGE_CATALOG_TIMEOUT_MS) : undefined;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      ...(controller ? { signal: controller.signal } : {}),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      rows?: LearningContentRow[];
      guides?: DbCompetencyGuideRow[];
    };
    if (!Array.isArray(json?.rows) || json.rows.length === 0) return null;
    return {
      rows: json.rows,
      guides: Array.isArray(json.guides) ? json.guides : [],
    };
  } catch {
    return null;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export async function fetchLearningContentRows(
  language = 'en',
  options?: { forceRefresh?: boolean }
): Promise<LearningContentRow[]> {
  const forceRefresh = Boolean(options?.forceRefresh);
  const rowsCacheKey = cacheSegments.learningContentRows(language);

  const mem = readMemoryCache<LearningContentRow[]>(rowsCacheKey);
  if (!forceRefresh && mem && mem.data.length > 0 && isCacheFresh(mem.updatedAt, CATALOG_FRESH_MS)) {
    void fetchCompetencyGuides(false);
    return mem.data;
  }

  return dedupeRequest(`catalog_rows:${language}:${forceRefresh ? 'force' : 'swr'}`, async () => {
    const disk = await readCacheEntry<LearningContentRow[]>(rowsCacheKey);
    const hasDisk = Boolean(disk?.data?.length);

    if (!forceRefresh && hasDisk && isCacheFresh(disk!.updatedAt, CATALOG_FRESH_MS)) {
      void fetchCompetencyGuides(false);
      return disk!.data;
    }

    // 1. Try CDN Edge-cached `/api/catalog` on deployed web (1 round trip for rows + guides)
    const edge = await tryFetchEdgeCatalog(language);
    if (edge && edge.rows.length > 0) {
      if (edge.guides.length > 0) {
        await hydrateCompetencyGuidesFromRows(edge.guides);
      } else {
        void fetchCompetencyGuides(forceRefresh);
      }
      await writeCacheJson(rowsCacheKey, edge.rows);
      return edge.rows;
    }

    if (!isSupabaseConfigured()) {
      const local = getBundledRowsForLanguage(language);
      writeMemoryCache(rowsCacheKey, local);
      return local;
    }

    // 2. Fallback to direct Supabase query with strict timeout
    try {
      const [{ data, error }] = await withTimeout(
        Promise.all([
          supabase
            .from('learning_content')
            .select('*')
            .eq('language', language)
            .eq('content_for', 'EQ')
            .order('sort_order', { ascending: true })
            .order('episode_title', { ascending: true }),
          fetchCompetencyGuides(forceRefresh),
        ]),
        SUPABASE_CATALOG_TIMEOUT_MS,
        'Learning catalog fetch'
      );

      if (!error && Array.isArray(data) && data.length > 0) {
        const rows = data as LearningContentRow[];
        await writeCacheJson(rowsCacheKey, rows);
        return rows;
      }
      if (error) {
        console.warn('[learning_content] fetch failed, using fallback:', error.message);
      }
    } catch (err) {
      console.warn('[learning_content] request timed out/failed, using cached catalog:', err);
    }

    if (hasDisk) return disk!.data;
    return getBundledRowsForLanguage(language);
  });
}

export async function fetchLearningEpisodes(
  language = 'en',
  options?: { forceRefresh?: boolean }
): Promise<LearningEpisode[]> {
  const rows = await fetchLearningContentRows(language, options);
  const episodes = rowsToEpisodes(rows);
  if (episodes.length > 0) {
    await writeCacheJson(cacheSegments.learningEpisodes(language), episodes);
  }
  return episodes;
}

export async function fetchLearningEpisodeSiblings(row: LearningContentRow): Promise<LearningContentRow[]> {
  const memRows = readMemoryCache<LearningContentRow[]>(cacheSegments.learningContentRows(row.language));
  if (memRows?.data?.length) {
    const cachedSiblings = memRows.data.filter(
      (x) =>
        x.content_for === row.content_for &&
        x.eq_type === row.eq_type &&
        x.domain === row.domain &&
        x.competency === row.competency &&
        x.episode_title === row.episode_title &&
        x.language === row.language
    );
    if (cachedSiblings.length > 0) return cachedSiblings;
  }

  const localSiblings = (bundledRows as LearningContentRow[]).filter(
    (x) =>
      x.content_for === row.content_for &&
      x.eq_type === row.eq_type &&
      x.domain === row.domain &&
      x.competency === row.competency &&
      x.episode_title === row.episode_title &&
      x.language === row.language
  );
  if (!isSupabaseConfigured()) return localSiblings.length ? localSiblings : [row];

  try {
    const { data, error } = await withTimeout(
      (async () =>
        supabase
          .from('learning_content')
          .select('*')
          .eq('content_for', row.content_for)
          .eq('eq_type', row.eq_type)
          .eq('domain', row.domain)
          .eq('competency', row.competency)
          .eq('episode_title', row.episode_title)
          .eq('language', row.language))(),
      6_000,
      'Episode siblings fetch'
    );
    if (!error && data?.length) return data as LearningContentRow[];
  } catch {
    // Fallback cleanly to local/cached siblings
  }
  return localSiblings.length ? localSiblings : [row];
}

export async function fetchLearningContentRowById(id: string): Promise<LearningContentRow | null> {
  // Check L1/L2 cached rows before doing network I/O
  const cachedRows = await readCacheEntry<LearningContentRow[]>(cacheSegments.learningContentRows('en'));
  const cachedHit = cachedRows?.data?.find((x) => x.id === id);
  if (cachedHit) {
    void fetchCompetencyGuides(false);
    return cachedHit;
  }

  const local = (bundledRows as LearningContentRow[]).find((x) => x.id === id) ?? null;
  if (!isSupabaseConfigured()) return local;

  try {
    const [{ data, error }] = await withTimeout(
      Promise.all([
        supabase.from('learning_content').select('*').eq('id', id).maybeSingle(),
        fetchCompetencyGuides(false),
      ]),
      6_000,
      'Lesson detail fetch'
    );
    if (!error && data) return data as LearningContentRow;
  } catch {
    // Timeout fallback to bundled row
  }
  return local;
}

/** Build LearningModule shape for the detail screen (static + DB). */
export function episodeToDetailModule(ep: LearningEpisode): LearningModule {
  const dimInfo = DIMENSION_INFO[ep.dimension];
  const subtitle = isIntroEpisodeTitle(ep.title)
    ? 'Introduction'
    : ep.eqType === 'B2B'
      ? b2bEpisodeSubtitle(ep.domain, ep.competency)
      : dimInfo.name;
  return {
    id: ep.routeId,
    dimension: ep.dimension,
    title: ep.title,
    subtitle,
    description: ep.description || dimInfo.description,
    audioUrl: ep.audioUrl ?? '',
    videoUrl: ep.videoUrl ?? '',
    audioDuration: ep.audioUrl ? 'Podcast' : 'None',
    videoDuration: ep.videoUrl ? 'Video' : 'None',
    icon: ep.icon,
    color: ep.color,
    keyTakeaways: ep.description
      ? ep.description.split(/(?<=[.!?])\s+/).slice(0, 4).filter(Boolean)
      : [],
    catalogEqType: ep.eqType,
    domainKey: ep.domain,
    competencyKey: ep.competency,
    shortContent: ep.shortContent,
    longContent: ep.longContent,
    estimatedReadMinutes: ep.estimatedReadMinutes,
  };
}

/**
 * Synchronously resolve a lesson detail module from L1 memory cache or bundled rows (0ms).
 * Returns null only on cold start with an uncached remote ID.
 */
export function resolveDetailModuleSync(id: string): {
  module: LearningModule;
  episodeKey: string;
} | null {
  const memEps = getSyncCachedEpisodes('en');
  const cachedEp = memEps?.find((ep) => ep.routeId === id);
  if (cachedEp) {
    return { module: episodeToDetailModule(cachedEp), episodeKey: cachedEp.episodeKey };
  }

  const memRows = readMemoryCache<LearningContentRow[]>(cacheSegments.learningContentRows('en'));
  const hitRow =
    memRows?.data?.find((x) => x.id === id) ??
    (bundledRows as LearningContentRow[]).find((x) => x.id === id);
  if (!hitRow) return null;

  const pool = memRows?.data?.length ? memRows.data : (bundledRows as LearningContentRow[]);
  const siblings = pool.filter(
    (x) =>
      x.content_for === hitRow.content_for &&
      x.eq_type === hitRow.eq_type &&
      x.domain === hitRow.domain &&
      x.competency === hitRow.competency &&
      x.episode_title === hitRow.episode_title &&
      x.language === hitRow.language
  );
  const eps = rowsToEpisodes(siblings.length ? siblings : [hitRow]);
  const ep = eps[0];
  if (!ep) return null;
  return { module: episodeToDetailModule(ep), episodeKey: episodeKeyFromRow(hitRow) };
}

export async function resolveDetailModuleFromCatalogId(id: string): Promise<{
  module: LearningModule;
  episodeKey: string;
} | null> {
  const cachedEps = await readCacheEntry<LearningEpisode[]>(cacheSegments.learningEpisodes('en'));
  const hitEp = cachedEps?.data?.find((ep) => ep.routeId === id);
  if (hitEp) {
    void fetchLearningEpisodes('en');
    void fetchCompetencyGuides(false);
    return { module: episodeToDetailModule(hitEp), episodeKey: hitEp.episodeKey };
  }

  const row = await fetchLearningContentRowById(id);
  if (!row) return null;
  const siblings = await fetchLearningEpisodeSiblings(row);
  const episodes = rowsToEpisodes(siblings);
  const ep = episodes[0];
  if (!ep) return null;
  const key = episodeKeyFromRow(row);
  return { module: episodeToDetailModule(ep), episodeKey: key };
}

export function staticFallbackDetailModule(): LearningModule | null {
  const m = LEARNING_MODULES[0];
  return m ?? null;
}

export function staticFallbackDetailId(): string | undefined {
  return LEARNING_MODULES[0]?.id;
}

/** When the DB catalog is empty, drive the same UI from bundled modules (all treated as personal). */
export function staticModulesAsEpisodes(): LearningEpisode[] {
  return LEARNING_MODULES.map((m, i) => ({
    episodeKey: `static|${m.id}`,
    eqType: 'B2C' as LearningAudience,
    title: m.title,
    description: m.description,
    domain: '',
    competency: '',
    dimension: m.dimension,
    videoUrl: m.videoUrl,
    audioUrl: m.audioUrl,
    routeId: m.id,
    icon: m.icon,
    color: m.color,
    sortOrder: 100 + i * 10,
    shortContent: m.shortContent,
    longContent: m.longContent,
    estimatedReadMinutes: m.estimatedReadMinutes,
  }));
}
