/**
 * B2B (workplace) learning catalog: 4 domains and 12 ESCI-style competencies.
 * Keys match `learning_content.domain` / `competency` from CSV/Supabase; labels are for UI.
 * B2C uses different domain names (e.g. SELF_REGULATION_DOMAIN) — this file is B2B-only.
 */

/** Minimal shape for ordering workplace episodes (avoids importing the catalog service). */
export type B2bPillarSortable = {
  domain: string;
  competency: string;
  sortOrder: number;
  title: string;
};

export const B2B_DOMAIN_ORDER = [
  'SELF_AWARENESS_DOMAIN',
  'SELF_MANAGEMENT_DOMAIN',
  'SOCIAL_AWARENESS_DOMAIN',
  'RELATIONSHIP_MANAGEMENT_DOMAIN',
] as const;

export type B2BDomainKey = (typeof B2B_DOMAIN_ORDER)[number];

/** Human labels for the four B2B pillars (matches CSV `domain` column). */
export const B2B_DOMAIN_LABELS: Record<B2BDomainKey, string> = {
  SELF_AWARENESS_DOMAIN: 'Self-Awareness',
  SELF_MANAGEMENT_DOMAIN: 'Self-Management',
  SOCIAL_AWARENESS_DOMAIN: 'Social Awareness',
  RELATIONSHIP_MANAGEMENT_DOMAIN: 'Relationship Management',
};

/**
 * Ordered competency keys per domain (12 total across all domains, as in the catalog).
 * One row in CSV = audio + video per episode, same `competency` for both.
 */
export const B2B_COMPETENCY_ORDER: Record<B2BDomainKey, readonly string[]> = {
  SELF_AWARENESS_DOMAIN: ['SELF_AWARENESS'],
  SELF_MANAGEMENT_DOMAIN: [
    'EMOTIONAL_BALANCE',
    'POSITIVE_OUTLOOK',
    'ADAPTABILITY',
    'ACHIEVEMENT_ORIENTATION',
  ],
  SOCIAL_AWARENESS_DOMAIN: ['EMPATHY', 'ORGANIZATIONAL_AWARENESS'],
  RELATIONSHIP_MANAGEMENT_DOMAIN: [
    'INFLUENCE',
    'COACH_MENTOR',
    'CONFLICT_MANAGEMENT',
    'TEAMWORK',
    'INSPIRATIONAL_LEADERSHIP',
  ],
};

export const B2B_COMPETENCY_LABELS: Record<string, string> = {
  SELF_AWARENESS: 'Emotional self-awareness',
  EMOTIONAL_BALANCE: 'Emotional balance',
  POSITIVE_OUTLOOK: 'Positive outlook',
  ADAPTABILITY: 'Adaptability',
  ACHIEVEMENT_ORIENTATION: 'Achievement orientation',
  EMPATHY: 'Empathy',
  ORGANIZATIONAL_AWARENESS: 'Organizational awareness',
  INFLUENCE: 'Influence',
  COACH_MENTOR: 'Coach & mentor',
  CONFLICT_MANAGEMENT: 'Conflict management',
  TEAMWORK: 'Teamwork',
  INSPIRATIONAL_LEADERSHIP: 'Inspirational leadership',
};

export function b2bDomainIndex(domainKey: string): number {
  const i = B2B_DOMAIN_ORDER.indexOf(domainKey as B2BDomainKey);
  return i === -1 ? 999 : i;
}

export function b2bCompetencyIndex(domainKey: string, competencyKey: string): number {
  const list = B2B_COMPETENCY_ORDER[domainKey as B2BDomainKey];
  if (!list) return 999;
  const j = (list as readonly string[]).indexOf(competencyKey);
  return j === -1 ? 999 : j;
}

/** Normalise CSV/Supabase `domain` / `competency` keys for comparison with taxonomy constants. */
export function normalizeB2bCatalogKey(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
    .replace(/_+/g, '_');
}

function titleCaseFromKey(key: string): string {
  return key
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

/** One-line subtitle for Workplace lessons: pillar · competency (not B2C EQ dimensions). */
export function b2bEpisodeSubtitle(domain: string, competency: string): string {
  const d = normalizeB2bCatalogKey(domain);
  const c = normalizeB2bCatalogKey(competency);
  const domainLabel =
    d in B2B_DOMAIN_LABELS ? B2B_DOMAIN_LABELS[d as B2BDomainKey] : titleCaseFromKey(d.replace(/_DOMAIN$/i, ''));
  const compLabel = B2B_COMPETENCY_LABELS[c] ?? titleCaseFromKey(c);
  return `${domainLabel} · ${compLabel}`;
}

/** Workplace tab: self-awareness → self-management → social awareness → relationship management, then by competency, then by curriculum. */
export function sortB2bEpisodesInPillarOrder<T extends B2bPillarSortable>(episodes: T[]): T[] {
  return [...episodes].sort((a, b) => {
    const da = b2bDomainIndex(a.domain);
    const db = b2bDomainIndex(b.domain);
    if (da !== db) return da - db;
    const ca = b2bCompetencyIndex(a.domain, a.competency);
    const cb = b2bCompetencyIndex(b.domain, b.competency);
    if (ca !== cb) return ca - cb;
    return a.sortOrder - b.sortOrder || a.title.localeCompare(b.title);
  });
}
