/**
 * Optional learner context on `profiles` - used for Skill Lab scenario generation
 * and shown on the Profile screen.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Big5Scores } from '@/services/big5-scoring';

export type LifeSituationId = 'student' | 'entrepreneur' | 'employed' | 'between_roles' | 'other';

export const LIFE_SITUATION_OPTIONS: { id: LifeSituationId; label: string }[] = [
  { id: 'student', label: 'Student' },
  { id: 'entrepreneur', label: 'Entrepreneur / founder' },
  { id: 'employed', label: 'Employed' },
  { id: 'between_roles', label: 'Between roles' },
  { id: 'other', label: 'Other' },
];

/** Stable ids stored in `profiles.industry` (no free-text to reduce friction). */
export type IndustryId =
  | 'tech'
  | 'health_care'
  | 'education'
  | 'finance'
  | 'retail_hospitality'
  | 'manufacturing'
  | 'public_sector'
  | 'nonprofit'
  | 'creative_media'
  | 'legal'
  | 'construction'
  | 'agriculture'
  | 'other_field'
  | 'prefer_not_say';

export const INDUSTRY_OPTIONS: { id: IndustryId; label: string }[] = [
  { id: 'tech', label: 'Technology' },
  { id: 'health_care', label: 'Health care' },
  { id: 'education', label: 'Education' },
  { id: 'finance', label: 'Finance & insurance' },
  { id: 'retail_hospitality', label: 'Retail & hospitality' },
  { id: 'manufacturing', label: 'Manufacturing' },
  { id: 'public_sector', label: 'Public sector' },
  { id: 'nonprofit', label: 'Nonprofit' },
  { id: 'creative_media', label: 'Creative & media' },
  { id: 'legal', label: 'Legal' },
  { id: 'construction', label: 'Construction' },
  { id: 'agriculture', label: 'Agriculture' },
  { id: 'other_field', label: 'Another field' },
  { id: 'prefer_not_say', label: 'Prefer not to say' },
];

/** Stored in `profiles.org_context` (work environment / org type). */
export type WorkSettingId =
  | 'remote'
  | 'hybrid'
  | 'on_site'
  | 'small_team'
  | 'midsize_org'
  | 'large_enterprise'
  | 'startup'
  | 'solopreneur'
  | 'classroom_campus'
  | 'other_setting'
  | 'prefer_not_say_work';

export const WORK_SETTING_OPTIONS: { id: WorkSettingId; label: string }[] = [
  { id: 'remote', label: 'Mostly remote' },
  { id: 'hybrid', label: 'Hybrid' },
  { id: 'on_site', label: 'Mostly on-site' },
  { id: 'small_team', label: 'Small team' },
  { id: 'midsize_org', label: 'Midsize org' },
  { id: 'large_enterprise', label: 'Large enterprise' },
  { id: 'startup', label: 'Early-stage / startup' },
  { id: 'solopreneur', label: 'Solo / independent' },
  { id: 'classroom_campus', label: 'Classroom or campus' },
  { id: 'other_setting', label: 'Another context' },
  { id: 'prefer_not_say_work', label: 'Prefer not to say' },
];

const INDUSTRY_ID_SET = new Set<string>(INDUSTRY_OPTIONS.map((o) => o.id));
const WORK_SETTING_ID_SET = new Set<string>(WORK_SETTING_OPTIONS.map((o) => o.id));

export function parseIndustryId(raw: string | null | undefined): IndustryId | null {
  if (!raw || typeof raw !== 'string') return null;
  const t = raw.trim();
  if (INDUSTRY_ID_SET.has(t)) return t as IndustryId;
  // Legacy: match label (case-insensitive) from older free-text saves
  const fromLabel = INDUSTRY_OPTIONS.find((o) => o.label.toLowerCase() === t.toLowerCase());
  return fromLabel?.id ?? null;
}

export function parseWorkSettingId(raw: string | null | undefined): WorkSettingId | null {
  if (!raw || typeof raw !== 'string') return null;
  const t = raw.trim();
  if (WORK_SETTING_ID_SET.has(t)) return t as WorkSettingId;
  const fromLabel = WORK_SETTING_OPTIONS.find((o) => o.label.toLowerCase() === t.toLowerCase());
  return fromLabel?.id ?? null;
}

export function industryLabel(id: IndustryId | null | undefined): string | null {
  if (!id) return null;
  return INDUSTRY_OPTIONS.find((o) => o.id === id)?.label ?? null;
}

export function workSettingLabel(id: WorkSettingId | null | undefined): string | null {
  if (!id) return null;
  return WORK_SETTING_OPTIONS.find((o) => o.id === id)?.label ?? null;
}

export interface UserProfileContext {
  profileInterests: string | null;
  lifeSituation: LifeSituationId | null;
  /** Canonical id from `INDUSTRY_OPTIONS` (column `industry` in DB). */
  industry: IndustryId | null;
  professionalRole: string | null;
  /** Canonical id from `WORK_SETTING_OPTIONS` (column `org_context` in DB). */
  orgContext: WorkSettingId | null;
}

const EMPTY: UserProfileContext = {
  profileInterests: null,
  lifeSituation: null,
  industry: null,
  professionalRole: null,
  orgContext: null,
};

function parseLifeSituation(raw: string | null | undefined): LifeSituationId | null {
  if (!raw || typeof raw !== 'string') return null;
  const allowed: LifeSituationId[] = ['student', 'entrepreneur', 'employed', 'between_roles', 'other'];
  return allowed.includes(raw as LifeSituationId) ? (raw as LifeSituationId) : null;
}

export async function getUserProfileContext(userId: string): Promise<UserProfileContext> {
  if (!isSupabaseConfigured()) return { ...EMPTY };

  const { data, error } = await supabase
    .from('profiles')
    .select('profile_interests, life_situation, industry, professional_role, org_context')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('[ProfileContext] load failed:', error.message);
    return { ...EMPTY };
  }
  if (!data) return { ...EMPTY };

  return {
    profileInterests: (data.profile_interests as string | null) ?? null,
    lifeSituation: parseLifeSituation(data.life_situation as string | null | undefined),
    industry: parseIndustryId(data.industry as string | null | undefined),
    professionalRole: (data.professional_role as string | null) ?? null,
    orgContext: parseWorkSettingId(data.org_context as string | null | undefined),
  };
}

export async function updateUserProfileContext(
  userId: string,
  ctx: Partial<UserProfileContext>
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase not configured.' };
  }

  const row: Record<string, string | null> = {};
  if (ctx.profileInterests !== undefined) row.profile_interests = ctx.profileInterests?.trim() || null;
  if (ctx.lifeSituation !== undefined) row.life_situation = ctx.lifeSituation ?? null;
  if (ctx.industry !== undefined) row.industry = ctx.industry ?? null;
  if (ctx.professionalRole !== undefined) row.professional_role = ctx.professionalRole?.trim() || null;
  if (ctx.orgContext !== undefined) row.org_context = ctx.orgContext ?? null;

  if (Object.keys(row).length === 0) return { ok: true };

  const { error } = await supabase.from('profiles').update(row).eq('id', userId);
  if (error) {
    console.error('[ProfileContext] update failed:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/**
 * Wire shape expected by /api/skills-coach (PracticeContextWire).
 */
export function buildPracticeContextWire(
  ctx: UserProfileContext | null
):
  | {
      background?: string;
      roleTitle?: string;
      industry?: string;
      seniority?: string;
    }
  | undefined {
  if (!ctx) return undefined;
  const bits: string[] = [];
  if (ctx.profileInterests?.trim()) bits.push(`Interests: ${ctx.profileInterests.trim()}`);
  if (ctx.lifeSituation) {
    const label = LIFE_SITUATION_OPTIONS.find((o) => o.id === ctx.lifeSituation)?.label ?? ctx.lifeSituation;
    bits.push(`Situation: ${label}`);
  }
  const workLbl = workSettingLabel(ctx.orgContext);
  if (workLbl) bits.push(`Work setting: ${workLbl}`);

  const hasAny =
    bits.length > 0 || industryLabel(ctx.industry) || ctx.professionalRole?.trim() || ctx.lifeSituation;
  if (!hasAny) return undefined;

  return {
    background: bits.length ? bits.join(' | ') : undefined,
    roleTitle: ctx.professionalRole?.trim() || undefined,
    industry: industryLabel(ctx.industry) || undefined,
    seniority: ctx.lifeSituation
      ? LIFE_SITUATION_OPTIONS.find((o) => o.id === ctx.lifeSituation)?.label
      : undefined,
  };
}

export function formatBig5ScoresLine(scores: Big5Scores | null | undefined): string {
  if (!scores) return '';
  return [
    `O ${scores.openness.toFixed(1)}`,
    `C ${scores.conscientiousness.toFixed(1)}`,
    `E ${scores.extraversion.toFixed(1)}`,
    `A ${scores.agreeableness.toFixed(1)}`,
    `N ${scores.neuroticism.toFixed(1)}`,
  ].join(' · ');
}
