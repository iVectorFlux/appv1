/**
 * Enterprise Multi-Admin Workspace & User Analytics Service
 *
 * Uses Supabase RLS + SECURITY DEFINER RPCs (migration 00028_enterprise_roles_companies.sql):
 * - Multiple admins can belong to the same company.
 * - Admins view complete user lists, EQ scores, video/audio completion, and overall progress
 *   for members in their company.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { fetchLearningEpisodes } from '@/services/learning-content-catalog';
import { sortB2bEpisodesInPillarOrder } from '@/data/learning-b2b-taxonomy';
import type { UserRole } from '@/types';

export interface CompanyWorkspace {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: string;
}

export interface CompanyUserLessonDetail {
  episodeKey: string;
  title: string;
  competency: string;
  videoCompleted: boolean;
  audioCompleted: boolean;
  videoProgressPct: number;
  audioProgressPct: number;
  lastAccessedAt: string | null;
}

export interface CompanyMemberAnalytics {
  userId: string;
  displayName: string;
  email: string;
  role: UserRole;
  lastLoginAt: string | null;
  latestEqScore: number | null;
  latestEqDate: string | null;
  eqAssessmentsCount: number;
  videosCompleted: number;
  audiosCompleted: number;
  lessonsCompleted: number;
  totalCatalogLessons: number;
  avgVideoProgressPct: number;
  overallCompletionPct: number;
  lastLearningActivityAt: string | null;
  lessonDetails: CompanyUserLessonDetail[];
}

export interface CompanyCourseStat {
  episodeKey: string;
  title: string;
  competency: string;
  domain: string;
  videosCompletedCount: number;
  audiosCompletedCount: number;
  completionRatePct: number;
}

export interface EnterpriseDashboardData {
  company: CompanyWorkspace | null;
  members: CompanyMemberAnalytics[];
  courseStats: CompanyCourseStat[];
  summary: {
    totalUsers: number;
    adminCount: number;
    activeLearners: number;
    totalVideosCompleted: number;
    totalAudiosCompleted: number;
    avgCourseCompletionPct: number;
    avgEqScore: number | null;
    totalCurriculumLessons: number;
  };
}

export async function createCompanyWorkspace(
  companyName: string
): Promise<{ companyId: string; name: string; inviteCode: string }> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured.');
  }
  const { data, error } = await supabase.rpc('create_company_workspace', {
    company_name: companyName.trim(),
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.company_id) {
    throw new Error('Failed to create company workspace.');
  }
  return {
    companyId: String(row.company_id),
    name: String(row.name),
    inviteCode: String(row.invite_code),
  };
}

export async function joinCompanyByInviteCode(
  code: string
): Promise<{ companyId: string; name: string; inviteCode: string }> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured.');
  }
  const { data, error } = await supabase.rpc('join_company_by_code', {
    code: code.trim(),
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.company_id) {
    throw new Error('Invalid company invite code.');
  }
  return {
    companyId: String(row.company_id),
    name: String(row.name),
    inviteCode: String(row.invite_code),
  };
}

export async function setCompanyMemberRole(memberId: string, newRole: UserRole): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured.');
  }
  const { error } = await supabase.rpc('set_company_member_role', {
    member_id: memberId,
    new_role: newRole,
  });
  if (error) throw new Error(error.message);
}

export async function fetchEnterpriseDashboardData(companyId: string): Promise<EnterpriseDashboardData> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured.');
  }

  const [companyRes, profilesRes, progressRes, eqRes, episodes] = await Promise.all([
    supabase.from('companies').select('id, name, invite_code, created_at').eq('id', companyId).maybeSingle(),
    supabase
      .from('profiles')
      .select('id, display_name, email, role, last_login_at, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: true }),
    supabase
      .from('learning_content_progress')
      .select('user_id, episode_key, video_completed, audio_completed, video_progress_pct, audio_progress_pct, last_accessed_at'),
    supabase
      .from('eq_scores')
      .select('user_id, assessment_type, overall_score, assessed_at')
      .eq('assessment_type', 'full_test')
      .order('assessed_at', { ascending: false }),
    fetchLearningEpisodes('en'),
  ]);

  if (profilesRes.error) throw new Error(profilesRes.error.message);

  const company: CompanyWorkspace | null = companyRes.data
    ? {
        id: String(companyRes.data.id),
        name: String(companyRes.data.name),
        inviteCode: String(companyRes.data.invite_code),
        createdAt: String(companyRes.data.created_at),
      }
    : null;

  const curriculumEpisodes = sortB2bEpisodesInPillarOrder(episodes.filter((e) => e.eqType === 'B2B'));
  const totalCatalogLessons = curriculumEpisodes.length || episodes.length;
  const episodeByKey = new Map(episodes.map((e) => [e.episodeKey, e]));

  const profileRows = (profilesRes.data ?? []) as Record<string, unknown>[];
  const memberIds = new Set(profileRows.map((p) => String(p.id)));

  // Group learning progress by user_id (filtered cleanly to members of this company)
  const progressByUser = new Map<string, Record<string, unknown>[]>();
  for (const row of (progressRes.data ?? []) as Record<string, unknown>[]) {
    const uid = String(row.user_id ?? '');
    if (!memberIds.has(uid)) continue;
    const arr = progressByUser.get(uid) ?? [];
    arr.push(row);
    progressByUser.set(uid, arr);
  }

  // Group EQ scores by user_id
  const eqByUser = new Map<string, { overall: number; date: string }[]>();
  for (const row of (eqRes.data ?? []) as Record<string, unknown>[]) {
    const uid = String(row.user_id ?? '');
    if (!memberIds.has(uid)) continue;
    const arr = eqByUser.get(uid) ?? [];
    arr.push({
      overall: Number(row.overall_score ?? 0),
      date: String(row.assessed_at ?? ''),
    });
    eqByUser.set(uid, arr);
  }

  let totalVideosCompleted = 0;
  let totalAudiosCompleted = 0;
  let activeLearners = 0;
  let adminCount = 0;
  const eqScoresForAvg: number[] = [];

  const members: CompanyMemberAnalytics[] = profileRows.map((p) => {
    const uid = String(p.id);
    const email = String(p.email ?? '');
    const displayName = String(p.display_name ?? '').trim() || email.split('@')[0] || uid.slice(0, 8);
    const role: UserRole = p.role === 'admin' ? 'admin' : 'user';
    if (role === 'admin') adminCount += 1;

    const eqList = eqByUser.get(uid) ?? [];
    const latestEq = eqList[0] ?? null;
    if (latestEq) eqScoresForAvg.push(latestEq.overall);

    const pRows = progressByUser.get(uid) ?? [];
    let videosCompleted = 0;
    let audiosCompleted = 0;
    let lessonsCompleted = 0;
    let videoPctSum = 0;
    let lastLearningActivityAt: string | null = null;

    const lessonDetails: CompanyUserLessonDetail[] = pRows.map((r) => {
      const epKey = String(r.episode_key ?? '');
      const epMeta = episodeByKey.get(epKey);
      const vc = Boolean(r.video_completed);
      const ac = Boolean(r.audio_completed);
      const vpct = vc ? 100 : Number(r.video_progress_pct ?? 0);
      const apct = ac ? 100 : Number(r.audio_progress_pct ?? 0);
      const accAt = (r.last_accessed_at as string | null) ?? null;

      if (vc) videosCompleted += 1;
      if (ac) audiosCompleted += 1;
      if (vc || ac) lessonsCompleted += 1;
      videoPctSum += vpct;
      if (accAt && (!lastLearningActivityAt || accAt > lastLearningActivityAt)) {
        lastLearningActivityAt = accAt;
      }

      return {
        episodeKey: epKey,
        title: epMeta?.title ?? epKey.split('|').pop() ?? epKey,
        competency: epMeta?.competency ?? '',
        videoCompleted: vc,
        audioCompleted: ac,
        videoProgressPct: vpct,
        audioProgressPct: apct,
        lastAccessedAt: accAt,
      };
    });

    totalVideosCompleted += videosCompleted;
    totalAudiosCompleted += audiosCompleted;
    if (pRows.length > 0) activeLearners += 1;

    const overallCompletionPct =
      totalCatalogLessons > 0 ? Math.min(100, Math.round((lessonsCompleted / totalCatalogLessons) * 100)) : 0;
    const avgVideoProgressPct =
      totalCatalogLessons > 0 ? Math.min(100, Math.round(videoPctSum / totalCatalogLessons)) : 0;

    return {
      userId: uid,
      displayName,
      email,
      role,
      lastLoginAt: (p.last_login_at as string | null) ?? null,
      latestEqScore: latestEq ? Math.round(latestEq.overall) : null,
      latestEqDate: latestEq?.date ?? null,
      eqAssessmentsCount: eqList.length,
      videosCompleted,
      audiosCompleted,
      lessonsCompleted,
      totalCatalogLessons,
      avgVideoProgressPct,
      overallCompletionPct,
      lastLearningActivityAt,
      lessonDetails,
    };
  });

  // Per-course completion breakdown across all company members
  const totalUsers = members.length;
  const courseStats: CompanyCourseStat[] = curriculumEpisodes.map((ep) => {
    let vidCount = 0;
    let audCount = 0;
    let anyDoneCount = 0;
    for (const m of members) {
      const match = m.lessonDetails.find((d) => d.episodeKey === ep.episodeKey);
      if (match?.videoCompleted) vidCount += 1;
      if (match?.audioCompleted) audCount += 1;
      if (match?.videoCompleted || match?.audioCompleted) anyDoneCount += 1;
    }
    return {
      episodeKey: ep.episodeKey,
      title: ep.title,
      competency: ep.competency,
      domain: ep.domain,
      videosCompletedCount: vidCount,
      audiosCompletedCount: audCount,
      completionRatePct: totalUsers > 0 ? Math.round((anyDoneCount / totalUsers) * 100) : 0,
    };
  });

  const avgCourseCompletionPct =
    totalUsers > 0
      ? Math.round(members.reduce((acc, m) => acc + m.overallCompletionPct, 0) / totalUsers)
      : 0;
  const avgEqScore =
    eqScoresForAvg.length > 0
      ? Math.round(eqScoresForAvg.reduce((a, b) => a + b, 0) / eqScoresForAvg.length)
      : null;

  return {
    company,
    members,
    courseStats,
    summary: {
      totalUsers,
      adminCount,
      activeLearners,
      totalVideosCompleted,
      totalAudiosCompleted,
      avgCourseCompletionPct,
      avgEqScore,
      totalCurriculumLessons: totalCatalogLessons,
    },
  };
}
