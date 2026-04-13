/**
 * Progress & Report — Glassmorphism v5
 *
 * EQ scores, learning/skill lab activity, recovery sessions, and AI companion usage.
 * Uses structured data only.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import { GROUNDING_MODES } from '@/data/grounding-content';
import { DIMENSION_INFO } from '@/data/learning-content';
import { useAuthStore } from '@/stores/auth-store';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getRecoverySessions } from '@/services/recovery-storage';
import { getEQScores } from '@/services/eq-storage';
import {
  EMPTY_INSIGHTS_LEARNING_BUNDLE,
  loadInsightsLearningBundle,
  shortenEpisodeKey,
  skillDisplayName,
  type InsightsLearningBundle,
} from '@/services/insights-learning-bundle';
import { GlassBackground } from '@/components/ui/glass-background';
import { GlassCard } from '@/components/ui/glass-card';
import type { EQDimension } from '@/types/eq-assessment';
import type { GroundingMode } from '@/types/grounding';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const RECOVERY_TIMEOUT_MS = 8000;
const EQ_SCORES_TIMEOUT_MS = 8000;
const LEARNING_BUNDLE_TIMEOUT_MS = 10000;
const SAFETY_TIMEOUT_MS = 20000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timed out')), ms)),
  ]);
}

function dimensionLabel(key: string): string {
  return DIMENSION_INFO[key as EQDimension]?.name ?? key.replace(/_/g, ' ');
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function useProgressData() {
  const { user, isLoading: authLoading } = useAuthStore();

  const [eqScores, setEqScores] = useState<Awaited<ReturnType<typeof getEQScores>>>([]);
  const [recoverySessions, setRecoverySessions] = useState<Awaited<ReturnType<typeof getRecoverySessions>>>([]);
  const [learningBundle, setLearningBundle] = useState<InsightsLearningBundle>(EMPTY_INSIGHTS_LEARNING_BUNDLE);
  const [learningHydrated, setLearningHydrated] = useState(false);

  const [loadingEq, setLoadingEq] = useState(false);
  const [loadingLearning, setLoadingLearning] = useState(false);
  const [loadingRecover, setLoadingRecover] = useState(false);

  const [errorEq, setErrorEq] = useState<string | null>(null);
  const [errorLearning, setErrorLearning] = useState<string | null>(null);
  const [errorRecover, setErrorRecover] = useState<string | null>(null);

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (authLoading || !user?.id) {
      setEqScores([]);
      setRecoverySessions([]);
      setLearningBundle(EMPTY_INSIGHTS_LEARNING_BUNDLE);
      setLearningHydrated(false);
      return;
    }

    cancelledRef.current = false;
    setLearningHydrated(false);
    setLoadingEq(isSupabaseConfigured());
    setLoadingLearning(isSupabaseConfigured());
    setLoadingRecover(isSupabaseConfigured());
    setErrorEq(null);
    setErrorLearning(null);
    setErrorRecover(null);

    const safetyTimer = setTimeout(() => {
      if (!cancelledRef.current) {
        setLoadingEq(false);
        setLoadingLearning(false);
        setLoadingRecover(false);
        setLearningHydrated(true);
      }
    }, SAFETY_TIMEOUT_MS);

    if (isSupabaseConfigured()) {
      withTimeout(getEQScores(user.id, 60), EQ_SCORES_TIMEOUT_MS)
        .then((s) => { if (!cancelledRef.current) setEqScores(s || []); })
        .catch((e) => { if (!cancelledRef.current) { setEqScores([]); setErrorEq(e?.message || 'Could not load EQ data.'); } })
        .finally(() => { if (!cancelledRef.current) setLoadingEq(false); });

      withTimeout(loadInsightsLearningBundle(user.id), LEARNING_BUNDLE_TIMEOUT_MS)
        .then((b) => { if (!cancelledRef.current) setLearningBundle(b); })
        .catch((e) => { if (!cancelledRef.current) { setLearningBundle(EMPTY_INSIGHTS_LEARNING_BUNDLE); setErrorLearning(e?.message || 'Could not load learning data.'); } })
        .finally(() => { if (!cancelledRef.current) { setLoadingLearning(false); setLearningHydrated(true); } });

      withTimeout(getRecoverySessions(user.id, 50), RECOVERY_TIMEOUT_MS)
        .then((s) => { if (!cancelledRef.current) setRecoverySessions(s || []); })
        .catch((e) => { if (!cancelledRef.current) { setRecoverySessions([]); setErrorRecover(e?.message || 'Could not load recovery data.'); } })
        .finally(() => { if (!cancelledRef.current) setLoadingRecover(false); });
    } else {
      setLoadingEq(false);
      setLoadingLearning(false);
      setLoadingRecover(false);
      setLearningHydrated(true);
    }

    return () => { cancelledRef.current = true; clearTimeout(safetyTimer); };
  }, [user?.id, refreshTrigger, authLoading]);

  const eqSummary = useMemo(() => {
    if (eqScores.length === 0) return null;
    const n = eqScores.length;
    const checkIns = eqScores.filter((s) => s.assessmentType === 'check_in');
    const fullTests = eqScores.filter((s) => s.assessmentType === 'full_test');
    const latest = eqScores[0];
    const now = Date.now();
    const last7 = eqScores.filter((s) => now - new Date(s.completedAt).getTime() < 7 * ONE_DAY_MS).length;
    const avgOverall = n > 0 ? eqScores.reduce((acc, s) => acc + s.overallScore, 0) / n : null;
    const dimEntries = latest?.dimensionScores
      ? Object.entries(latest.dimensionScores).filter(([, v]) => typeof v === 'number')
      : [];
    dimEntries.sort((a, b) => (b[1] as number) - (a[1] as number));
    const topDimensions = dimEntries.slice(0, 3).map(([k]) => ({ key: k, label: dimensionLabel(k) }));
    return { total: n, checkInCount: checkIns.length, fullTestCount: fullTests.length, latestOverall: latest.overallScore, avgOverall, last7, topDimensions };
  }, [eqScores]);

  const assistActivity = useMemo(() => {
    if (!learningHydrated) return null;
    const b = learningBundle;
    if (b.assistInnerAllyMessages === 0 && b.assistCoachMessages === 0) return null;
    return { inner: b.assistInnerAllyMessages, coach: b.assistCoachMessages, lastAt: b.lastAssistMessageAt };
  }, [learningHydrated, learningBundle]);

  const learningSummary = useMemo(() => {
    const b = learningBundle;
    const skillList = Object.values(b.skillProgress);
    const totalSkillSessions = skillList.reduce((s, p) => s + p.sessionsCompleted, 0);
    const totalScenarios = skillList.reduce((s, p) => s + p.scenariosAttempted, 0);
    const topSkills = [...skillList]
      .sort((a, b) => b.sessionsCompleted - a.sessionsCompleted)
      .slice(0, 6)
      .map((p) => ({ id: p.skillId, name: skillDisplayName(p.skillId), completed: p.sessionsCompleted, attempted: p.scenariosAttempted, lastAt: p.lastPracticedAt }));
    const hasRealActivity = b.catalogEpisodesEngaged > 0 || totalSkillSessions > 0;
    return {
      emptyLearning: !hasRealActivity,
      catalogEpisodesEngaged: b.catalogEpisodesEngaged,
      catalogEpisodesCompleteBoth: b.catalogEpisodesCompleteBoth,
      catalogDetails: b.catalogDetails,
      totalSkillSessions,
      totalScenarios,
      topSkills,
    };
  }, [learningBundle]);

  const recoverySummary = useMemo(() => {
    if (recoverySessions.length === 0) return null;
    const n = recoverySessions.length;
    const byMode: Record<GroundingMode, number> = {} as Record<GroundingMode, number>;
    recoverySessions.forEach((s) => { byMode[s.mode] = (byMode[s.mode] ?? 0) + 1; });
    const top = (Object.entries(byMode) as [GroundingMode, number][]).sort((a, b) => b[1] - a[1])[0];
    const topMode = top ? GROUNDING_MODES.find((m) => m.id === top[0])?.label ?? top[0] : null;
    const last7 = recoverySessions.filter((s) => Date.now() - new Date(s.startedAt).getTime() < 7 * ONE_DAY_MS).length;
    return { count: n, topMode, last7 };
  }, [recoverySessions]);

  return {
    user, authLoading, eqSummary, assistActivity, learningHydrated, learningSummary, recoverySummary,
    loadingEq, loadingLearning, loadingRecover, errorEq, errorLearning, errorRecover,
    supabaseOn: isSupabaseConfigured(),
    retry: () => setRefreshTrigger((t) => t + 1),
  };
}

export default function ProgressScreen() {
  const router = useRouter();
  const colors = useColors();
  const [refreshing, setRefreshing] = useState(false);
  const d = useProgressData();

  const onRefresh = () => { setRefreshing(true); d.retry(); setTimeout(() => setRefreshing(false), 500); };
  const signedIn = !!d.user?.id && !d.authLoading;
  const st = createStyles(colors);

  return (
    <GlassBackground>
      <ScrollView
        style={st.container}
        contentContainerStyle={st.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={st.header}>
          <Text style={st.title}>Progress & Report</Text>
          <Text style={st.subtitle}>What you practice, made visible.</Text>
        </View>

        {/* AI Companion activity */}
        {d.assistActivity && (
          <View style={st.section}>
            <SectionHeading icon="chatbubble-ellipses-outline" iconColor={colors.accentTerracotta} title="AI Companion" colors={colors} />
            <GlassCard>
              <Text style={st.cardTitle}>Conversation activity</Text>
              <Text style={st.bodyText}>
                Inner Ally: {d.assistActivity.inner} message{d.assistActivity.inner !== 1 ? 's' : ''} · Coach: {d.assistActivity.coach} message{d.assistActivity.coach !== 1 ? 's' : ''}
              </Text>
              {formatDate(d.assistActivity.lastAt) && (
                <Text style={st.statLine}>Last message · {formatDate(d.assistActivity.lastAt)}</Text>
              )}
            </GlassCard>
          </View>
        )}

        {/* EQ assessments */}
        <View style={st.section}>
          <SectionHeading icon="analytics-outline" iconColor={colors.primary} title="EQ Assessments" colors={colors} />
          {d.loadingEq ? (
            <GlassCard><View style={st.loadingRow}><ActivityIndicator size="small" color={colors.primary} /><Text style={st.loadingText}>Loading EQ results…</Text></View></GlassCard>
          ) : d.eqSummary ? (
            <GlassCard>
              <Text style={st.cardTitle}>
                {d.eqSummary.total} completed ({d.eqSummary.checkInCount} check-in{d.eqSummary.checkInCount !== 1 ? 's' : ''}{d.eqSummary.fullTestCount > 0 ? ` · ${d.eqSummary.fullTestCount} full test${d.eqSummary.fullTestCount !== 1 ? 's' : ''}` : ''})
              </Text>
              {d.eqSummary.last7 > 0 && <Text style={st.statLine}>{d.eqSummary.last7} in the last 7 days</Text>}
              <Text style={st.bodyText}>
                Latest overall: {d.eqSummary.latestOverall}{d.eqSummary.avgOverall != null && d.eqSummary.total > 1 ? ` · Average: ${Math.round(d.eqSummary.avgOverall)}` : ''}
              </Text>
              {d.eqSummary.topDimensions.length > 0 && (
                <Text style={st.bodyText}>Strongest: {d.eqSummary.topDimensions.map((d) => d.label).join(' · ')}</Text>
              )}
              <TouchableOpacity style={st.primaryCta} onPress={() => router.push('/(tabs)/eq')} activeOpacity={0.85}>
                <Text style={st.primaryCtaText}>Take EQ Check-in</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.primaryForeground} />
              </TouchableOpacity>
            </GlassCard>
          ) : !d.supabaseOn ? (
            <GlassCard><Text style={st.bodyText}>EQ scores sync when Supabase is configured.</Text></GlassCard>
          ) : (
            <GlassCard>
              <Text style={st.cardTitle}>No EQ scores yet</Text>
              <Text style={st.bodyText}>Complete a check-in to see your scores here.</Text>
              <TouchableOpacity style={st.primaryCta} onPress={() => router.push('/(tabs)/eq')} activeOpacity={0.85}>
                <Text style={st.primaryCtaText}>Start EQ Check-in</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.primaryForeground} />
              </TouchableOpacity>
            </GlassCard>
          )}
          {d.errorEq && <Text style={st.errorText}>{d.errorEq}</Text>}
        </View>

        {/* Learning & Skill Lab */}
        <View style={st.section}>
          <SectionHeading icon="school-outline" iconColor={colors.accentIndigo} title="Learning & Skill Lab" colors={colors} />
          {d.loadingLearning ? (
            <GlassCard><View style={st.loadingRow}><ActivityIndicator size="small" color={colors.primary} /><Text style={st.loadingText}>Loading learning activity…</Text></View></GlassCard>
          ) : d.learningHydrated && d.learningSummary.emptyLearning ? (
            <GlassCard>
              <Text style={st.cardTitle}>No learning progress yet</Text>
              <Text style={st.bodyText}>Open episodes in Learn or practice in Skill Lab to see activity here.</Text>
              <TouchableOpacity style={st.primaryCta} onPress={() => router.push('/(tabs)/learn')} activeOpacity={0.85}>
                <Text style={st.primaryCtaText}>Browse Learn</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.primaryForeground} />
              </TouchableOpacity>
            </GlassCard>
          ) : (
            <>
              {d.learningSummary.catalogEpisodesEngaged > 0 && (
                <GlassCard>
                  <Text style={st.cardTitle}>Lessons</Text>
                  <Text style={st.bodyText}>
                    {d.learningSummary.catalogEpisodesEngaged} episode{d.learningSummary.catalogEpisodesEngaged !== 1 ? 's' : ''} with activity · {d.learningSummary.catalogEpisodesCompleteBoth} fully complete
                  </Text>
                  {d.learningSummary.catalogDetails.length > 0 && (
                    <View style={st.progressBlock}>
                      {d.learningSummary.catalogDetails.map((ep) => (
                        <View key={ep.episodeKey} style={st.progressRow}>
                          <Text style={st.progressTitle} numberOfLines={1}>{shortenEpisodeKey(ep.episodeKey)}</Text>
                          <Text style={st.progressMeta}>Video {ep.videoPct}% · Audio {ep.audioPct}%</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </GlassCard>
              )}
              {d.learningSummary.totalSkillSessions > 0 && (
                <GlassCard style={d.learningSummary.catalogEpisodesEngaged > 0 ? { marginTop: Spacing.sm } : undefined}>
                  <Text style={st.cardTitle}>Skill Lab</Text>
                  <Text style={st.bodyText}>
                    {d.learningSummary.totalSkillSessions} practice round{d.learningSummary.totalSkillSessions !== 1 ? 's' : ''} completed
                    {d.learningSummary.totalScenarios > 0 ? ` · ${d.learningSummary.totalScenarios} scenario${d.learningSummary.totalScenarios !== 1 ? 's' : ''}` : ''}
                  </Text>
                  {d.learningSummary.topSkills.filter((s) => s.completed > 0).length > 0 && (
                    <View style={st.bulletList}>
                      {d.learningSummary.topSkills.filter((s) => s.completed > 0).map((s) => (
                        <Text key={s.id} style={st.bulletItem}>· {s.name}: {s.completed} completed</Text>
                      ))}
                    </View>
                  )}
                </GlassCard>
              )}
            </>
          )}
          {d.errorLearning && <Text style={st.errorText}>{d.errorLearning}</Text>}
        </View>

        {/* Recover & grounding */}
        <View style={st.section}>
          <SectionHeading icon="leaf-outline" iconColor={colors.accentCalm} title="Recover & Grounding" colors={colors} />
          {d.loadingRecover ? (
            <GlassCard><View style={st.loadingRow}><ActivityIndicator size="small" color={colors.primary} /><Text style={st.loadingText}>Loading recovery data…</Text></View></GlassCard>
          ) : d.recoverySummary ? (
            <GlassCard>
              <Text style={st.cardTitle}>{d.recoverySummary.count} session{d.recoverySummary.count !== 1 ? 's' : ''}</Text>
              {d.recoverySummary.last7 > 0 && <Text style={st.statLine}>{d.recoverySummary.last7} in the last 7 days</Text>}
              {d.recoverySummary.topMode && <Text style={st.bodyText}>Most used: {d.recoverySummary.topMode}</Text>}
            </GlassCard>
          ) : (
            <GlassCard>
              <Text style={st.cardTitle}>No recovery sessions yet</Text>
              <Text style={st.bodyText}>Complete a grounding exercise to see summaries here.</Text>
              <TouchableOpacity style={st.primaryCta} onPress={() => router.push('/(tabs)/recover')} activeOpacity={0.85}>
                <Text style={st.primaryCtaText}>Go to Recover</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.primaryForeground} />
              </TouchableOpacity>
            </GlassCard>
          )}
          {d.errorRecover && <Text style={st.errorText}>{d.errorRecover}</Text>}
        </View>

        <View style={st.footer}>
          <Text style={st.footerText}>
            Progress uses structured data only (scores, completion, session counts). Your conversations remain private.
          </Text>
        </View>
      </ScrollView>
    </GlassBackground>
  );
}

function SectionHeading({ icon, iconColor, title, colors }: { icon: keyof typeof Ionicons.glyphMap; iconColor: string; title: string; colors: ReturnType<typeof useColors> }) {
  const st = createStyles(colors);
  return (
    <View style={st.sectionHeadingRow}>
      <View style={[st.sectionIcon, { backgroundColor: iconColor + '18' }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={st.sectionTitle}>{title}</Text>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1 },
    content: { paddingBottom: 120, paddingHorizontal: Spacing.md },
    header: { paddingTop: Platform.OS === 'ios' ? 56 : Spacing.xl, marginBottom: Spacing.lg },
    title: { fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold, color: colors.textPrimary, marginBottom: Spacing.xs },
    subtitle: { fontSize: Typography.fontSize.sm, lineHeight: Typography.fontSize.sm * 1.45, color: colors.textSecondary },
    section: { marginBottom: Spacing.xl },
    sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
    sectionIcon: { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
    sectionTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.semibold, color: colors.textPrimary },
    cardTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: colors.textPrimary, marginBottom: Spacing.xs },
    statLine: { fontSize: Typography.fontSize.sm, color: colors.textSecondary, marginBottom: Spacing.xs },
    bodyText: { fontSize: Typography.fontSize.sm, lineHeight: Typography.fontSize.sm * 1.45, color: colors.textSecondary, marginBottom: Spacing.xs },
    loadingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    loadingText: { fontSize: Typography.fontSize.sm, color: colors.textSecondary },
    errorText: { fontSize: Typography.fontSize.xs, color: colors.destructive, marginTop: Spacing.xs },
    primaryCta: {
      marginTop: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: Spacing.xs, backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: Spacing.md, borderRadius: Radius.md,
    },
    primaryCtaText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, color: colors.primaryForeground },
    progressBlock: { marginTop: Spacing.sm },
    progressRow: { paddingVertical: Spacing.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight },
    progressTitle: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium, color: colors.textPrimary, marginBottom: 2 },
    progressMeta: { fontSize: Typography.fontSize.xs, color: colors.textSecondary },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: Spacing.md },
    bulletList: { marginTop: Spacing.xs, marginBottom: Spacing.sm },
    bulletItem: { fontSize: Typography.fontSize.sm, color: colors.textSecondary, marginBottom: 2 },
    footer: { marginTop: Spacing.md, paddingHorizontal: Spacing.xs },
    footerText: { fontSize: Typography.fontSize.xs, lineHeight: 16, color: colors.textMuted, textAlign: 'center' },
  });
