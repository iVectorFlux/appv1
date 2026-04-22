/**
 * Optional learner context on `profiles` — used for Skill Lab scenario generation
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

export interface UserProfileContext {
  profileInterests: string | null;
  lifeSituation: LifeSituationId | null;
  industry: string | null;
  professionalRole: string | null;
  orgContext: string | null;
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
    industry: (data.industry as string | null) ?? null,
    professionalRole: (data.professional_role as string | null) ?? null,
    orgContext: (data.org_context as string | null) ?? null,
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
  if (ctx.industry !== undefined) row.industry = ctx.industry?.trim() || null;
  if (ctx.professionalRole !== undefined) row.professional_role = ctx.professionalRole?.trim() || null;
  if (ctx.orgContext !== undefined) row.org_context = ctx.orgContext?.trim() || null;

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
  if (ctx.orgContext?.trim()) bits.push(`Work setting: ${ctx.orgContext.trim()}`);

  const hasAny =
    bits.length > 0 || ctx.industry?.trim() || ctx.professionalRole?.trim() || ctx.lifeSituation;
  if (!hasAny) return undefined;

  return {
    background: bits.length ? bits.join(' | ') : undefined,
    roleTitle: ctx.professionalRole?.trim() || undefined,
    industry: ctx.industry?.trim() || undefined,
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
