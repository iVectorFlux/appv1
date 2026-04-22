/**
 * Loads EQ learning episodes from public.learning_content (pairs audio + video rows).
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { EQDimension } from '@/types/eq-assessment';
import { DIMENSION_INFO, LEARNING_MODULES, type LearningModule } from '@/data/learning-content';

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

function rowsToEpisodes(rows: LearningContentRow[]): LearningEpisode[] {
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
    });
  }

  out.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
  return out;
}

export async function fetchLearningContentRows(language = 'en'): Promise<LearningContentRow[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('learning_content')
    .select('*')
    .eq('language', language)
    .eq('content_for', 'EQ')
    .order('sort_order', { ascending: true })
    .order('episode_title', { ascending: true });
  if (error) {
    console.warn('[learning_content] fetch failed:', error.message);
    return [];
  }
  return (data ?? []) as LearningContentRow[];
}

export async function fetchLearningEpisodes(language = 'en'): Promise<LearningEpisode[]> {
  const rows = await fetchLearningContentRows(language);
  return rowsToEpisodes(rows);
}

export async function fetchLearningEpisodeSiblings(row: LearningContentRow): Promise<LearningContentRow[]> {
  if (!isSupabaseConfigured()) return [row];
  const { data, error } = await supabase
    .from('learning_content')
    .select('*')
    .eq('content_for', row.content_for)
    .eq('eq_type', row.eq_type)
    .eq('domain', row.domain)
    .eq('competency', row.competency)
    .eq('episode_title', row.episode_title)
    .eq('language', row.language);
  if (error || !data?.length) return [row];
  return data as LearningContentRow[];
}

export async function fetchLearningContentRowById(id: string): Promise<LearningContentRow | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase.from('learning_content').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return data as LearningContentRow;
}

/** Build LearningModule shape for the detail screen (static + DB). */
export function episodeToDetailModule(ep: LearningEpisode): LearningModule {
  const dimInfo = DIMENSION_INFO[ep.dimension];
  const subtitle = isIntroEpisodeTitle(ep.title) ? 'Introduction' : dimInfo.name;
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
  };
}

export async function resolveDetailModuleFromCatalogId(id: string): Promise<{
  module: LearningModule;
  episodeKey: string;
} | null> {
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
  }));
}
