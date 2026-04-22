/**
 * Progress & Report — Last EQ & Big Five scores, learning / Skill Lab activity.
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
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import { DIMENSION_INFO } from '@/data/learning-content';
import { useAuthStore } from '@/stores/auth-store';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getEQScores } from '@/services/eq-storage';
import { getLatestBig5Assessment, type Big5AssessmentRow } from '@/services/big5-storage';
import {
  EMPTY_INSIGHTS_LEARNING_BUNDLE,
  loadInsightsLearningBundle,
  skillDisplayName,
  type InsightsLearningBundle,
} from '@/services/insights-learning-bundle';
import { GlassBackground } from '@/components/ui/glass-background';
import { GlassCard } from '@/components/ui/glass-card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { AssessmentSnapshotCard } from '@/components/assessment-snapshot-card';
import type { EQDimension } from '@/types/eq-assessment';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const EQ_SCORES_TIMEOUT_MS = 8000;
const LEARNING_BUNDLE_TIMEOUT_MS = 10000;
const SAFETY_TIMEOUT_MS = 20000;

const SCORE_RING_SIZE = 140;
const SCORE_RING_STROKE = 10;
const SCORE_RING_RADIUS = (SCORE_RING_SIZE - SCORE_RING_STROKE) / 2;
const SCORE_RING_CIRC = 2 * Math.PI * SCORE_RING_RADIUS;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timed out')), ms)),
  ]);
}

function dimensionLabel(key: string): string {
  return DIMENSION_INFO[key as EQDimension]?.name ?? key.replace(/_/g, ' ');
}

function dimensionColor(key: string): string {
  return DIMENSION_INFO[key as EQDimension]?.color ?? '#94A3B8';
}

function dimensionIcon(key: string): keyof typeof Ionicons.glyphMap {
  return (DIMENSION_INFO[key as EQDimension]?.icon ?? 'ellipse-outline') as keyof typeof Ionicons.glyphMap;
}

function extractEpisodeName(key: string): string {
  const parts = key.split('|');
  return parts[parts.length - 1]?.trim() || key;
}

// ── Score ring (SVG-free, uses border + rotation trick) ────────────────

function ScoreRing({ score, maxScore = 100, color, colors }: { score: number; maxScore?: number; color: string; colors: ReturnType<typeof useColors> }) {
  const pct = Math.min(score / maxScore, 1);
  const dashOffset = SCORE_RING_CIRC * (1 - pct);
  const isDark = colors.glassTint === 'dark';

  return (
    <View style={ringStyles.wrap}>
      {Platform.OS === 'web' ? (
        <svg width={SCORE_RING_SIZE} height={SCORE_RING_SIZE} viewBox={`0 0 ${SCORE_RING_SIZE} ${SCORE_RING_SIZE}`}>
          <circle
            cx={SCORE_RING_SIZE / 2}
            cy={SCORE_RING_SIZE / 2}
            r={SCORE_RING_RADIUS}
            fill="none"
            stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}
            strokeWidth={SCORE_RING_STROKE}
          />
          <circle
            cx={SCORE_RING_SIZE / 2}
            cy={SCORE_RING_SIZE / 2}
            r={SCORE_RING_RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={SCORE_RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={`${SCORE_RING_CIRC}`}
            strokeDashoffset={`${dashOffset}`}
            transform={`rotate(-90 ${SCORE_RING_SIZE / 2} ${SCORE_RING_SIZE / 2})`}
          />
        </svg>
      ) : (
        <View style={[ringStyles.ring, { width: SCORE_RING_SIZE, height: SCORE_RING_SIZE, borderRadius: SCORE_RING_SIZE / 2, borderWidth: SCORE_RING_STROKE, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
          <View style={[ringStyles.ringFill, { borderColor: color, borderWidth: SCORE_RING_STROKE, borderRadius: SCORE_RING_SIZE / 2, width: SCORE_RING_SIZE, height: SCORE_RING_SIZE }]} />
        </View>
      )}
      <View style={ringStyles.center}>
        <Text style={[ringStyles.scoreNum, { color: colors.textPrimary }]}>{score}</Text>
        <Text style={[ringStyles.scoreLabel, { color: colors.textMuted }]}>EQ Score</Text>
      </View>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', width: SCORE_RING_SIZE, height: SCORE_RING_SIZE },
  ring: { position: 'absolute' },
  ringFill: { position: 'absolute' },
  center: { alignItems: 'center', justifyContent: 'center' },
  scoreNum: { fontSize: 36, fontWeight: '700', letterSpacing: -1 },
  scoreLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3, marginTop: 2 },
});

// ── Dimension bar ─────────────────────────────────────────────────────

function DimensionBar({ label, score, maxScore = 100, color, icon, colors }: {
  label: string; score: number; maxScore?: number; color: string;
  icon: keyof typeof Ionicons.glyphMap; colors: ReturnType<typeof useColors>;
}) {
  const pct = Math.min(score / maxScore, 1);
  const barAnim = useRef(new Animated.Value(0)).current;
  const isDark = colors.glassTint === 'dark';

  useEffect(() => {
    Animated.timing(barAnim, { toValue: pct, duration: 800, useNativeDriver: false }).start();
  }, [pct]);

  const barWidth = barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={dimStyles.row}>
      <View style={[dimStyles.iconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={14} color={color} />
      </View>
      <View style={dimStyles.body}>
        <View style={dimStyles.labelRow}>
          <Text style={[dimStyles.label, { color: colors.textPrimary }]} numberOfLines={1}>{label}</Text>
          <Text style={[dimStyles.value, { color: colors.textSecondary }]}>{score}</Text>
        </View>
        <View style={[dimStyles.track, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
          <Animated.View style={[dimStyles.fill, { width: barWidth, backgroundColor: color }]} />
        </View>
      </View>
    </View>
  );
}

const dimStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  iconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  label: { fontSize: 13, fontWeight: '500' },
  value: { fontSize: 12, fontWeight: '600' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
});

// ── Episode progress bar ──────────────────────────────────────────────

function EpisodeRow({ name, videoPct, audioPct, colors }: {
  name: string; videoPct: number; audioPct: number; colors: ReturnType<typeof useColors>;
}) {
  const isDark = colors.glassTint === 'dark';
  const trackBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const avgPct = Math.round((videoPct + audioPct) / 2);
  const done = videoPct >= 100 && audioPct >= 100;

  return (
    <View style={epStyles.row}>
      <View style={epStyles.titleRow}>
        {done ? (
          <Ionicons name="checkmark-circle" size={16} color={colors.success} style={{ marginRight: 6 }} />
        ) : (
          <Ionicons name="play-circle-outline" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
        )}
        <Text style={[epStyles.name, { color: colors.textPrimary }]} numberOfLines={1}>{name}</Text>
        <Text style={[epStyles.pct, { color: done ? colors.success : colors.textSecondary }]}>{avgPct}%</Text>
      </View>
      <View style={epStyles.bars}>
        <View style={epStyles.barGroup}>
          <Text style={[epStyles.barLabel, { color: colors.textMuted }]}>V</Text>
          <View style={[epStyles.track, { backgroundColor: trackBg }]}>
            <View style={[epStyles.fill, { width: `${videoPct}%`, backgroundColor: colors.accentIndigo }]} />
          </View>
        </View>
        <View style={epStyles.barGroup}>
          <Text style={[epStyles.barLabel, { color: colors.textMuted }]}>A</Text>
          <View style={[epStyles.track, { backgroundColor: trackBg }]}>
            <View style={[epStyles.fill, { width: `${audioPct}%`, backgroundColor: colors.accentSage }]} />
          </View>
        </View>
      </View>
    </View>
  );
}

const epStyles = StyleSheet.create({
  row: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(128,128,128,0.1)' },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  name: { flex: 1, fontSize: 13, fontWeight: '500' },
  pct: { fontSize: 12, fontWeight: '600', marginLeft: 8 },
  bars: { gap: 5, paddingLeft: 22 },
  barGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barLabel: { fontSize: 10, fontWeight: '600', width: 10 },
  track: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
});

// ── Stat pill (small stat with icon) ──────────────────────────────────

function StatPill({ icon, value, label, color, colors }: {
  icon: keyof typeof Ionicons.glyphMap; value: string | number; label: string; color: string; colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={spStyles.pill}>
      <View style={[spStyles.iconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[spStyles.value, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[spStyles.label, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const spStyles = StyleSheet.create({
  pill: { alignItems: 'center', flex: 1, paddingVertical: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  value: { fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },
  label: { fontSize: 11, fontWeight: '500', marginTop: 2, textAlign: 'center' },
});

// ── Data hook (unchanged logic) ───────────────────────────────────────

function useProgressData() {
  const { user, isLoading: authLoading } = useAuthStore();

  const [eqScores, setEqScores] = useState<Awaited<ReturnType<typeof getEQScores>>>([]);
  const [big5Latest, setBig5Latest] = useState<Big5AssessmentRow | null>(null);
  const [learningBundle, setLearningBundle] = useState<InsightsLearningBundle>(EMPTY_INSIGHTS_LEARNING_BUNDLE);
  const [learningHydrated, setLearningHydrated] = useState(false);

  const [loadingEq, setLoadingEq] = useState(false);
  const [loadingLearning, setLoadingLearning] = useState(false);

  const [errorEq, setErrorEq] = useState<string | null>(null);
  const [errorLearning, setErrorLearning] = useState<string | null>(null);

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (authLoading || !user?.id) {
      setEqScores([]);
      setBig5Latest(null);
      setLearningBundle(EMPTY_INSIGHTS_LEARNING_BUNDLE);
      setLearningHydrated(false);
      return;
    }

    cancelledRef.current = false;
    setLearningHydrated(false);
    setLoadingEq(isSupabaseConfigured());
    setLoadingLearning(isSupabaseConfigured());
    setErrorEq(null);
    setErrorLearning(null);

    const safetyTimer = setTimeout(() => {
      if (!cancelledRef.current) {
        setLoadingEq(false);
        setLoadingLearning(false);
        setLearningHydrated(true);
      }
    }, SAFETY_TIMEOUT_MS);

    if (isSupabaseConfigured()) {
      withTimeout(getEQScores(user.id, 60), EQ_SCORES_TIMEOUT_MS)
        .then((s) => { if (!cancelledRef.current) setEqScores(s || []); })
        .catch((e) => { if (!cancelledRef.current) { setEqScores([]); setErrorEq(e?.message || 'Could not load EQ data.'); } })
        .finally(() => { if (!cancelledRef.current) setLoadingEq(false); });

      getLatestBig5Assessment(user.id)
        .then((row) => {
          if (!cancelledRef.current) setBig5Latest(row);
        })
        .catch(() => {
          if (!cancelledRef.current) setBig5Latest(null);
        });

      withTimeout(loadInsightsLearningBundle(user.id), LEARNING_BUNDLE_TIMEOUT_MS)
        .then((b) => { if (!cancelledRef.current) setLearningBundle(b); })
        .catch((e) => { if (!cancelledRef.current) { setLearningBundle(EMPTY_INSIGHTS_LEARNING_BUNDLE); setErrorLearning(e?.message || 'Could not load learning data.'); } })
        .finally(() => { if (!cancelledRef.current) { setLoadingLearning(false); setLearningHydrated(true); } });
    } else {
      setLoadingEq(false);
      setBig5Latest(null);
      setLoadingLearning(false);
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
    const allDimensions = dimEntries.map(([k, v]) => ({ key: k, label: dimensionLabel(k), score: v as number, color: dimensionColor(k), icon: dimensionIcon(k) }));
    const topDimensions = allDimensions.slice(0, 3);
    return { total: n, checkInCount: checkIns.length, fullTestCount: fullTests.length, latestOverall: latest.overallScore, avgOverall, last7, allDimensions, topDimensions };
  }, [eqScores]);

  const learningSummary = useMemo(() => {
    const b = learningBundle;
    const skillList = Object.values(b.skillProgress);
    const totalSkillSessions = skillList.reduce((s, p) => s + p.sessionsCompleted, 0);
    const totalScenarios = skillList.reduce((s, p) => s + p.scenariosAttempted, 0);
    const topSkills = [...skillList]
      .sort((a, bx) => bx.sessionsCompleted - a.sessionsCompleted)
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

  return {
    user,
    authLoading,
    eqScores,
    eqSummary,
    learningHydrated,
    learningSummary,
    big5Latest,
    loadingEq,
    loadingLearning,
    errorEq,
    errorLearning,
    supabaseOn: isSupabaseConfigured(),
    retry: () => setRefreshTrigger((t) => t + 1),
  };
}

// ── Main screen ───────────────────────────────────────────────────────

export default function ProgressScreen() {
  const router = useRouter();
  const colors = useColors();
  const [refreshing, setRefreshing] = useState(false);
  const d = useProgressData();
  const isDark = colors.glassTint === 'dark';

  const onRefresh = () => { setRefreshing(true); d.retry(); setTimeout(() => setRefreshing(false), 500); };
  const st = createStyles(colors);

  const lastEq = useMemo(() => {
    const s = d.eqScores[0];
    if (!s) return null;
    return {
      overallScore: s.overallScore,
      assessmentType: s.assessmentType,
      completedAt: s.completedAt,
    };
  }, [d.eqScores]);

  const lastBig5 = useMemo(() => {
    const row = d.big5Latest;
    if (!row?.scores) return null;
    return { scores: row.scores, completedAt: row.completed_at };
  }, [d.big5Latest]);

  const loadingAssessments = d.loadingEq;

  return (
    <GlassBackground>
      <ScrollView
        style={st.container}
        contentContainerStyle={st.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Your Progress" backFallbackHref="/(tabs)/home" showHomeButton />
        <Text style={st.subtitle}>Assessments and learning activity</Text>

        <View style={st.section}>
          <Text style={st.snapshotSectionTitle}>Assessments</Text>
          <AssessmentSnapshotCard
            loading={loadingAssessments}
            lastEq={lastEq}
            lastBig5={lastBig5}
            onPressEq={() => router.push('/(tabs)/eq')}
            onPressBig5={() => router.push('/big5-test')}
          />
        </View>

        {/* ── EQ dimension detail (latest attempt) ── */}
        <View style={st.section}>
          {d.loadingEq ? null : d.eqSummary ? (
            <>
              <GlassCard>
                <View style={st.heroRow}>
                  <ScoreRing score={d.eqSummary.latestOverall} color={colors.primary} colors={colors} />
                  <View style={st.heroMeta}>
                    <View style={st.heroStatRow}>
                      <Text style={[st.heroStatNum, { color: colors.textPrimary }]}>{d.eqSummary.total}</Text>
                      <Text style={[st.heroStatLabel, { color: colors.textSecondary }]}>
                        assessment{d.eqSummary.total !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    {d.eqSummary.last7 > 0 && (
                      <View style={st.heroStatRow}>
                        <Text style={[st.heroStatNum, { color: colors.primary }]}>{d.eqSummary.last7}</Text>
                        <Text style={[st.heroStatLabel, { color: colors.textSecondary }]}>this week</Text>
                      </View>
                    )}
                    {d.eqSummary.topDimensions.length > 0 && (
                      <View style={st.strengthBadges}>
                        {d.eqSummary.topDimensions.map((dim) => (
                          <View key={dim.key} style={[st.strengthBadge, { backgroundColor: dim.color + '18' }]}>
                            <Ionicons name={dim.icon} size={10} color={dim.color} />
                            <Text style={[st.strengthBadgeText, { color: dim.color }]}>{dim.label}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              </GlassCard>

              {d.eqSummary.allDimensions.length > 0 && (
                <GlassCard style={{ marginTop: Spacing.sm }}>
                  <Text style={st.cardTitle}>Dimension Breakdown</Text>
                  <View style={{ marginTop: 8 }}>
                    {d.eqSummary.allDimensions.map((dim) => (
                      <DimensionBar
                        key={dim.key}
                        label={dim.label}
                        score={dim.score}
                        color={dim.color}
                        icon={dim.icon}
                        colors={colors}
                      />
                    ))}
                  </View>
                </GlassCard>
              )}

              <TouchableOpacity style={[st.ctaBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/(tabs)/eq')} activeOpacity={0.85}>
                <Ionicons name="pulse-outline" size={18} color={colors.primaryForeground} />
                <Text style={[st.ctaBtnText, { color: colors.primaryForeground }]}>Take EQ Check-in</Text>
              </TouchableOpacity>
            </>
          ) : (
            <GlassCard>
              <View style={st.emptyState}>
                <View style={[st.emptyIcon, { backgroundColor: colors.primary + '14' }]}>
                  <Ionicons name="analytics-outline" size={28} color={colors.primary} />
                </View>
                <Text style={[st.emptyTitle, { color: colors.textPrimary }]}>No EQ scores yet</Text>
                <Text style={[st.emptyBody, { color: colors.textSecondary }]}>
                  Complete your first check-in to unlock your EQ dashboard with scores, dimensions, and progress tracking.
                </Text>
                <TouchableOpacity style={[st.ctaBtn, { backgroundColor: colors.primary, alignSelf: 'stretch' }]} onPress={() => router.push('/(tabs)/eq')} activeOpacity={0.85}>
                  <Ionicons name="pulse-outline" size={18} color={colors.primaryForeground} />
                  <Text style={[st.ctaBtnText, { color: colors.primaryForeground }]}>Start EQ Check-in</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          )}
          {d.errorEq ? <Text style={st.errorText}>{d.errorEq}</Text> : null}
        </View>

        {/* ── Learning & Skill Lab ───────────────────── */}
        <View style={st.section}>
          <SectionHeading icon="school-outline" iconColor={colors.accentIndigo} title="Learning" colors={colors} />
          {d.loadingLearning ? (
            <GlassCard>
              <View style={st.loadingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={st.loadingText}>Loading learning activity…</Text>
              </View>
            </GlassCard>
          ) : d.learningHydrated && d.learningSummary.emptyLearning ? (
            <GlassCard>
              <View style={st.emptyState}>
                <View style={[st.emptyIcon, { backgroundColor: colors.accentIndigo + '14' }]}>
                  <Ionicons name="school-outline" size={28} color={colors.accentIndigo} />
                </View>
                <Text style={[st.emptyTitle, { color: colors.textPrimary }]}>Start learning</Text>
                <Text style={[st.emptyBody, { color: colors.textSecondary }]}>
                  Explore lessons and practice in Skill Lab to track your growth here.
                </Text>
                <TouchableOpacity style={[st.ctaBtn, { backgroundColor: colors.accentIndigo, alignSelf: 'stretch' }]} onPress={() => router.push('/(tabs)/learn')} activeOpacity={0.85}>
                  <Ionicons name="book-outline" size={18} color="#fff" />
                  <Text style={[st.ctaBtnText, { color: '#fff' }]}>Browse Lessons</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          ) : (
            <>
              {d.learningSummary.catalogEpisodesEngaged > 0 && (
                <GlassCard>
                  <View style={st.cardTitleRow}>
                    <Text style={st.cardTitle}>Lessons</Text>
                    <View style={[st.badge, { backgroundColor: colors.accentIndigo + '18' }]}>
                      <Text style={[st.badgeText, { color: colors.accentIndigo }]}>
                        {d.learningSummary.catalogEpisodesCompleteBoth}/{d.learningSummary.catalogEpisodesEngaged} done
                      </Text>
                    </View>
                  </View>
                  {d.learningSummary.catalogDetails.map((ep, i) => (
                    <EpisodeRow
                      key={ep.episodeKey}
                      name={extractEpisodeName(ep.episodeKey)}
                      videoPct={ep.videoPct}
                      audioPct={ep.audioPct}
                      colors={colors}
                    />
                  ))}
                </GlassCard>
              )}

              {d.learningSummary.totalSkillSessions > 0 && (
                <GlassCard style={{ marginTop: Spacing.sm }}>
                  <Text style={st.cardTitle}>Skill Lab</Text>
                  <View style={st.statsRow}>
                    <StatPill icon="fitness-outline" value={d.learningSummary.totalSkillSessions} label="Sessions" color={colors.accentSage} colors={colors} />
                    <View style={[st.statDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]} />
                    <StatPill icon="layers-outline" value={d.learningSummary.totalScenarios} label="Scenarios" color={colors.accentIndigo} colors={colors} />
                  </View>
                  {d.learningSummary.topSkills.filter((s) => s.completed > 0).length > 0 && (
                    <View style={{ marginTop: 8 }}>
                      {d.learningSummary.topSkills.filter((s) => s.completed > 0).map((s) => (
                        <View key={s.id} style={st.skillRow}>
                          <View style={[st.skillDot, { backgroundColor: colors.primary }]} />
                          <Text style={[st.skillName, { color: colors.textPrimary }]} numberOfLines={1}>{s.name}</Text>
                          <Text style={[st.skillCount, { color: colors.textSecondary }]}>{s.completed}×</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </GlassCard>
              )}
            </>
          )}
          {d.errorLearning ? <Text style={st.errorText}>{d.errorLearning}</Text> : null}
        </View>

        <View style={st.footer}>
          <Text style={st.footerText}>
            Progress uses structured data only. Your conversations remain private.
          </Text>
        </View>
      </ScrollView>
    </GlassBackground>
  );
}

// ── Section heading ───────────────────────────────────────────────────

function SectionHeading({ icon, iconColor, title, colors }: {
  icon: keyof typeof Ionicons.glyphMap; iconColor: string; title: string; colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm }}>
      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: iconColor + '18', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <Text style={{ fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.semibold, color: colors.textPrimary }}>{title}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1 },
    content: { paddingBottom: 120, paddingHorizontal: Spacing.md, paddingTop: 4 },
    subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4, marginBottom: Spacing.lg, paddingHorizontal: 2 },

    snapshotSectionTitle: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textSecondary,
      letterSpacing: Typography.letterSpacing.normal,
      marginBottom: Spacing.sm,
    },

    section: { marginBottom: Spacing.xl },

    cardTitle: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginBottom: 4 },
    cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    badgeText: { fontSize: 11, fontWeight: '600' },

    heroRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
    heroMeta: { flex: 1, gap: 8 },
    heroStatRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
    heroStatNum: { fontSize: 22, fontWeight: '700' },
    heroStatLabel: { fontSize: 12, fontWeight: '500' },
    strengthBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
    strengthBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
    strengthBadgeText: { fontSize: 10, fontWeight: '600' },

    statsRow: { flexDirection: 'row', alignItems: 'center' },
    statDivider: { width: 1, height: 36, marginHorizontal: 4 },

    ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, paddingHorizontal: Spacing.md, borderRadius: Radius.md, marginTop: 12 },
    ctaBtnText: { fontSize: 14, fontWeight: '600' },

    emptyState: { alignItems: 'center', paddingVertical: 8 },
    emptyIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
    emptyBody: { fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 280, marginBottom: 8 },

    metaFooter: { fontSize: 11, textAlign: 'center', marginTop: 10 },

    skillRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
    skillDot: { width: 6, height: 6, borderRadius: 3 },
    skillName: { flex: 1, fontSize: 13, fontWeight: '500' },
    skillCount: { fontSize: 12, fontWeight: '600' },

    modeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    modeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1 },
    modeChipText: { fontSize: 12, fontWeight: '600' },
    modeChipCount: { fontSize: 11, fontWeight: '500' },

    loadingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    loadingText: { fontSize: 13, color: colors.textSecondary },
    errorText: { fontSize: 11, color: colors.destructive, marginTop: 4 },

    footer: { marginTop: Spacing.md, paddingHorizontal: Spacing.xs, marginBottom: Spacing.md },
    footerText: { fontSize: 11, lineHeight: 16, color: colors.textMuted, textAlign: 'center' },
  });
