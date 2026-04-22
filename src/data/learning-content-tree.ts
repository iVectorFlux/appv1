/**
 * Domain → competency → episode hierarchy for bundled learning_content export.
 * B2C and B2B use different domain names (e.g. SELF_REGULATION_DOMAIN vs SELF_MANAGEMENT_DOMAIN).
 */
import type { LearningAudience } from '@/services/learning-content-catalog';
import rawRows from './learning-content-rows.json';

export type LearningContentJsonRow = {
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
  sort_order?: number;
};

export type StructuredMediaRef = { id: string; url: string };

export type StructuredEpisode = {
  title: string;
  description: string;
  sortOrder: number;
  audio: StructuredMediaRef | null;
  video: StructuredMediaRef | null;
};

export type StructuredCompetency = {
  key: string;
  label: string;
  episodes: StructuredEpisode[];
};

export type StructuredDomain = {
  key: string;
  label: string;
  minSortOrder: number;
  competencies: StructuredCompetency[];
};

export type LearningContentAudienceTree = {
  audience: LearningAudience;
  displayName: string;
  domains: StructuredDomain[];
};

const DOMAIN_LABELS: Record<string, string> = {
  SELF_AWARENESS_DOMAIN: 'Self-Awareness',
  SELF_REGULATION_DOMAIN: 'Self-Regulation',
  SELF_MANAGEMENT_DOMAIN: 'Self-Management',
  EMPATHY_DOMAIN: 'Empathy',
  SOCIAL_SKILLS_DOMAIN: 'Social Skills',
  SOCIAL_AWARENESS_DOMAIN: 'Social Awareness',
  RELATIONSHIP_MANAGEMENT_DOMAIN: 'Relationship Management',
  MOTIVATION_DOMAIN: 'Motivation',
  RESILIENCE_DOMAIN: 'Resilience',
};

const COMPETENCY_LABELS: Record<string, string> = {
  SELF_AWARENESS: 'Self-Awareness',
  SELF_REGULATION: 'Self-Regulation',
  EMOTIONAL_BALANCE: 'Emotional Balance',
  EMPATHY: 'Empathy',
  ORGANIZATIONAL_AWARENESS: 'Organizational Awareness',
  SOCIAL_SKILLS: 'Social Skills',
  INFLUENCE: 'Influence',
  COACH_MENTOR: 'Coach & Mentor',
  CONFLICT_MANAGEMENT: 'Conflict Management',
  TEAMWORK: 'Teamwork',
  INSPIRATIONAL_LEADERSHIP: 'Inspirational Leadership',
  POSITIVE_OUTLOOK: 'Positive Outlook',
  ADAPTABILITY: 'Adaptability',
  ACHIEVEMENT_ORIENTATION: 'Achievement Orientation',
  MOTIVATION: 'Motivation',
  RESILIENCE: 'Resilience',
};

function formatLabelFromKey(key: string): string {
  return key
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

function labelDomain(key: string): string {
  if (DOMAIN_LABELS[key]) return DOMAIN_LABELS[key]!;
  const base = key.replace(/_DOMAIN$/i, '');
  return formatLabelFromKey(base);
}

function labelCompetency(key: string): string {
  return COMPETENCY_LABELS[key] ?? formatLabelFromKey(key);
}

function groupKey(
  r: Pick<LearningContentJsonRow, 'eq_type' | 'domain' | 'competency' | 'episode_title' | 'sort_order'>,
): string {
  return `${r.eq_type}|${r.domain}|${r.competency}|${r.episode_title}|${r.sort_order ?? 0}`;
}

/**
 * Build domain → competency → episode tree for one audience from flat rows
 * (merges audio + video per episode).
 */
export function buildLearningContentAudienceTree(
  rows: LearningContentJsonRow[],
  audience: LearningAudience,
  displayName: string,
): LearningContentAudienceTree {
  const forAudience = rows.filter((r) => r.content_for === 'EQ' && r.eq_type === audience);
  if (forAudience.length === 0) {
    return { audience, displayName, domains: [] };
  }

  const byEpisode = new Map<string, LearningContentJsonRow[]>();
  for (const r of forAudience) {
    const k = groupKey(r);
    const list = byEpisode.get(k) ?? [];
    list.push(r);
    byEpisode.set(k, list);
  }

  type EpAcc = { domain: string; competency: string; title: string; desc: string; sort: number; group: LearningContentJsonRow[] };
  const epList: EpAcc[] = [];
  for (const group of byEpisode.values()) {
    const video = group.find((x) => x.content_type === 'video');
    const audio = group.find((x) => x.content_type === 'audio');
    const a = video ?? audio;
    if (!a) continue;
    epList.push({
      domain: a.domain,
      competency: a.competency,
      title: a.episode_title,
      desc: a.episode_description?.trim() ?? '',
      sort: Math.min(...group.map((x) => x.sort_order ?? 1000)),
      group,
    });
  }

  const domainMap = new Map<string, { key: string; minSort: number; competencies: Map<string, EpAcc[]> }>();

  for (const ep of epList) {
    let d = domainMap.get(ep.domain);
    if (!d) {
      d = { key: ep.domain, minSort: ep.sort, competencies: new Map() };
      domainMap.set(ep.domain, d);
    }
    d.minSort = Math.min(d.minSort, ep.sort);
    const cList = d.competencies.get(ep.competency) ?? [];
    cList.push(ep);
    d.competencies.set(ep.competency, cList);
  }

  const domains: StructuredDomain[] = [...domainMap.values()]
    .sort((a, b) => a.minSort - b.minSort || a.key.localeCompare(b.key))
    .map((d) => {
      const competencies: StructuredCompetency[] = [...d.competencies.entries()]
        .map(([compKey, eps]) => {
          const sorted = eps.sort((x, y) => x.sort - y.sort || x.title.localeCompare(y.title));
          const episodes: StructuredEpisode[] = sorted.map(({ group, title, desc, sort }) => {
            const video = group.find((x) => x.content_type === 'video');
            const audio = group.find((x) => x.content_type === 'audio');
            const u = (s: string | null | undefined) => (s?.trim() ? s.trim() : null);
            return {
              title,
              description: desc,
              sortOrder: sort,
              audio:
                audio?.s3_link && u(audio.s3_link) ? { id: audio.id, url: u(audio.s3_link)! } : null,
              video:
                video?.s3_link && u(video.s3_link) ? { id: video.id, url: u(video.s3_link)! } : null,
            };
          });
          return { key: compKey, label: labelCompetency(compKey), episodes };
        })
        .sort(
          (a, b) =>
            Math.min(...a.episodes.map((e) => e.sortOrder)) - Math.min(...b.episodes.map((e) => e.sortOrder)) ||
            a.key.localeCompare(b.key),
        );

      return {
        key: d.key,
        label: labelDomain(d.key),
        minSortOrder: d.minSort,
        competencies,
      };
    });

  return { audience, displayName, domains };
}

const rowsTyped = rawRows as LearningContentJsonRow[];

export const BUNDLED_LEARNING_CONTENT_ROWS: readonly LearningContentJsonRow[] = rowsTyped;

export const BUNDLED_LEARNING_CONTENT: {
  b2c: LearningContentAudienceTree;
  b2b: LearningContentAudienceTree;
} = {
  b2c: buildLearningContentAudienceTree(rowsTyped, 'B2C', 'Personal (B2C)'),
  b2b: buildLearningContentAudienceTree(rowsTyped, 'B2B', 'Workplace (B2B)'),
};
