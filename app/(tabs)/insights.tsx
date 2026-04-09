/**
 * Insights — EQ, emotions, learning (Learn + Skill Lab), and Recover
 *
 * Structured / aggregate data only. Private journal prose is never analyzed here.
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
import { Button } from '@/components/ui/button';
import { useColors, Spacing, Typography, Radius, Shadows } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import { GROUNDING_MODES } from '@/data/grounding-content';
import { DIMENSION_INFO } from '@/data/learning-content';
import { useAuthStore } from '@/stores/auth-store';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getJournalEntries } from '@/services/journal-storage';
import { getRecoverySessions } from '@/services/recovery-storage';
import { getEQScores } from '@/services/eq-storage';
import {
  EMPTY_INSIGHTS_LEARNING_BUNDLE,
  loadInsightsLearningBundle,
  shortenEpisodeKey,
  skillDisplayName,
  type InsightsLearningBundle,
} from '@/services/insights-learning-bundle';
import type { JournalEntry } from '@/types';
import type { EQDimension } from '@/types/eq-assessment';
import type { GroundingMode } from '@/types/grounding';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const RECOVERY_TIMEOUT_MS = 8000;
const EQ_SCORES_TIMEOUT_MS = 8000;
const WEB_JOURNAL_TIMEOUT_MS = 8000;
const LEARNING_BUNDLE_TIMEOUT_MS = 10000;
const NATIVE_JOURNAL_RETRIES = 6;
const NATIVE_JOURNAL_RETRY_MS = 280;
const INSIGHTS_LOAD_SAFETY_MS = 20000;

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timed out')), ms)),
  ]);
}

async function loadAllJournalRows(userId: string, limit: number): Promise<JournalEntry[]> {
  if (Platform.OS === 'web') {
    return withTimeout(getJournalEntries(userId, limit), WEB_JOURNAL_TIMEOUT_MS);
  }
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < NATIVE_JOURNAL_RETRIES; attempt++) {
    try {
      return await getJournalEntries(userId, limit);
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      const msg = lastErr.message.toLowerCase();
      const maybeInitRace =
        msg.includes('not initialized') || msg.includes('database') || msg.includes('sqlite');
      if (!maybeInitRace || attempt === NATIVE_JOURNAL_RETRIES - 1) {
        throw lastErr;
      }
      await delay(NATIVE_JOURNAL_RETRY_MS);
    }
  }
  throw lastErr ?? new Error('Could not load journal');
}

function dimensionLabel(key: string): string {
  return DIMENSION_INFO[key as EQDimension]?.name ?? key.replace(/_/g, ' ');
}

function formatInsightDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function useInsightsData() {
  const { user, isLoading: authLoading } = useAuthStore();

  const [allJournalRows, setAllJournalRows] = useState<JournalEntry[]>([]);
  const [eqScores, setEqScores] = useState<Awaited<ReturnType<typeof getEQScores>>>([]);
  const [recoverySessions, setRecoverySessions] = useState<Awaited<ReturnType<typeof getRecoverySessions>>>([]);
  const [learningBundle, setLearningBundle] =
    useState<InsightsLearningBundle>(EMPTY_INSIGHTS_LEARNING_BUNDLE);
  /** False until first cloud learning/assist fetch finishes (avoids flashing zeros). */
  const [learningHydrated, setLearningHydrated] = useState(false);

  const [loadingMood, setLoadingMood] = useState(false);
  const [loadingEq, setLoadingEq] = useState(false);
  const [loadingLearning, setLoadingLearning] = useState(false);
  const [loadingRecover, setLoadingRecover] = useState(false);

  const [errorMood, setErrorMood] = useState<string | null>(null);
  const [errorEq, setErrorEq] = useState<string | null>(null);
  const [errorLearning, setErrorLearning] = useState<string | null>(null);
  const [errorRecover, setErrorRecover] = useState<string | null>(null);

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const cancelledRef = useRef(false);

  const patternEntries = useMemo(
    () =>
      allJournalRows.filter((e) => e.entrySource === 'reflect' || e.entrySource === 'inner_ally'),
    [allJournalRows]
  );

  const privateJournalCount = useMemo(
    () => allJournalRows.filter((e) => e.entrySource === 'journal_only').length,
    [allJournalRows]
  );

  useEffect(() => {
    if (authLoading) return;

    if (!user?.id) {
      setAllJournalRows([]);
      setEqScores([]);
      setRecoverySessions([]);
      setLearningBundle(EMPTY_INSIGHTS_LEARNING_BUNDLE);
      setLearningHydrated(false);
      setLoadingMood(false);
      setLoadingEq(false);
      setLoadingLearning(false);
      setLoadingRecover(false);
      setErrorMood(null);
      setErrorEq(null);
      setErrorLearning(null);
      setErrorRecover(null);
      return;
    }

    cancelledRef.current = false;
    setLearningHydrated(false);
    setLoadingMood(true);
    setLoadingEq(isSupabaseConfigured());
    setLoadingLearning(isSupabaseConfigured());
    setLoadingRecover(isSupabaseConfigured());
    setErrorMood(null);
    setErrorEq(null);
    setErrorLearning(null);
    setErrorRecover(null);

    const safetyTimer = setTimeout(() => {
      if (!cancelledRef.current) {
        setLoadingMood(false);
        setLoadingEq(false);
        setLoadingLearning(false);
        setLoadingRecover(false);
        setLearningHydrated(true);
      }
    }, INSIGHTS_LOAD_SAFETY_MS);

    loadAllJournalRows(user.id, 120)
      .then((rows) => {
        if (!cancelledRef.current) setAllJournalRows(rows || []);
      })
      .catch((e) => {
        if (!cancelledRef.current) {
          setAllJournalRows([]);
          setErrorMood(e?.message || 'Could not load mood data.');
        }
      })
      .finally(() => {
        if (!cancelledRef.current) setLoadingMood(false);
      });

    if (isSupabaseConfigured()) {
      withTimeout(getEQScores(user.id, 60), EQ_SCORES_TIMEOUT_MS)
        .then((scores) => {
          if (!cancelledRef.current) setEqScores(scores || []);
        })
        .catch((e) => {
          if (!cancelledRef.current) {
            setEqScores([]);
            setErrorEq(e?.message || 'Could not load EQ assessments.');
          }
        })
        .finally(() => {
          if (!cancelledRef.current) setLoadingEq(false);
        });

      withTimeout(loadInsightsLearningBundle(user.id), LEARNING_BUNDLE_TIMEOUT_MS)
        .then((b) => {
          if (!cancelledRef.current) setLearningBundle(b);
        })
        .catch((e) => {
          if (!cancelledRef.current) {
            setLearningBundle(EMPTY_INSIGHTS_LEARNING_BUNDLE);
            setErrorLearning(e?.message || 'Could not load learning activity.');
          }
        })
        .finally(() => {
          if (!cancelledRef.current) {
            setLoadingLearning(false);
            setLearningHydrated(true);
          }
        });

      withTimeout(getRecoverySessions(user.id, 50), RECOVERY_TIMEOUT_MS)
        .then((sessions) => {
          if (!cancelledRef.current) setRecoverySessions(sessions || []);
        })
        .catch((e) => {
          if (!cancelledRef.current) {
            setRecoverySessions([]);
            setErrorRecover(e?.message || 'Could not load Recover sessions.');
          }
        })
        .finally(() => {
          if (!cancelledRef.current) setLoadingRecover(false);
        });
    } else {
      setEqScores([]);
      setLearningBundle(EMPTY_INSIGHTS_LEARNING_BUNDLE);
      setLearningHydrated(true);
      setRecoverySessions([]);
      setLoadingEq(false);
      setLoadingLearning(false);
      setLoadingRecover(false);
    }

    return () => {
      cancelledRef.current = true;
      clearTimeout(safetyTimer);
    };
  }, [user?.id, refreshTrigger, authLoading]);

  const moodSummary = useMemo(() => {
    const journal = patternEntries;
    const n = journal.length;
    if (n === 0 && privateJournalCount === 0) return null;
    const allEmotions = journal.flatMap((e) => e.emotions ?? []);
    const counts: Record<string, number> = {};
    allEmotions.forEach((em) => {
      counts[em] = (counts[em] ?? 0) + 1;
    });
    const topEmotions = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([em]) => em);
    const withEnergy = journal.filter((e) => e.energyLevel != null && e.energyLevel > 0);
    const avgEnergy =
      withEnergy.length > 0
        ? withEnergy.reduce((s, e) => s + (e.energyLevel ?? 0), 0) / withEnergy.length
        : null;
    const now = Date.now();
    const last7 = journal.filter((e) => now - e.createdAt < 7 * ONE_DAY_MS).length;
    return {
      moodLogCount: n,
      privateJournalCount,
      topEmotions,
      avgEnergy,
      last7MoodLogs: last7,
    };
  }, [patternEntries, privateJournalCount]);

  const eqSummary = useMemo(() => {
    const scores = eqScores;
    const n = scores.length;
    if (n === 0) return null;
    const checkIns = scores.filter((s) => s.assessmentType === 'check_in');
    const fullTests = scores.filter((s) => s.assessmentType === 'full_test');
    const latest = scores[0];
    const now = Date.now();
    const last7 = scores.filter((s) => now - new Date(s.completedAt).getTime() < 7 * ONE_DAY_MS).length;
    const avgOverall =
      n > 0 ? scores.reduce((acc, s) => acc + s.overallScore, 0) / n : null;

    const dimEntries = latest?.dimensionScores
      ? Object.entries(latest.dimensionScores).filter(([, v]) => typeof v === 'number')
      : [];
    dimEntries.sort((a, b) => (b[1] as number) - (a[1] as number));
    const topDimensions = dimEntries.slice(0, 3).map(([k]) => ({ key: k, label: dimensionLabel(k) }));

    return {
      total: n,
      checkInCount: checkIns.length,
      fullTestCount: fullTests.length,
      latestOverall: latest.overallScore,
      avgOverall,
      last7,
      topDimensions,
    };
  }, [eqScores]);

  const assistActivity = useMemo(() => {
    if (!learningHydrated) return null;
    const b = learningBundle;
    if (b.assistInnerAllyMessages === 0 && b.assistCoachMessages === 0) return null;
    return {
      inner: b.assistInnerAllyMessages,
      coach: b.assistCoachMessages,
      lastAt: b.lastAssistMessageAt,
    };
  }, [learningHydrated, learningBundle]);

  const learningSummary = useMemo(() => {
    const b = learningBundle;
    const skillList = Object.values(b.skillProgress);
    const totalSkillSessions = skillList.reduce((s, p) => s + p.sessionsCompleted, 0);
    const totalScenarios = skillList.reduce((s, p) => s + p.scenariosAttempted, 0);
    const topSkills = [...skillList]
      .sort((a, b) => b.sessionsCompleted - a.sessionsCompleted)
      .slice(0, 6)
      .map((p) => ({
        id: p.skillId,
        name: skillDisplayName(p.skillId),
        completed: p.sessionsCompleted,
        attempted: p.scenariosAttempted,
        lastAt: p.lastPracticedAt,
      }));

    const anyLearning =
      b.catalogEpisodeRows > 0 ||
      b.catalogEpisodesEngaged > 0 ||
      b.legacyModuleRows > 0 ||
      totalSkillSessions > 0;

    return {
      emptyLearning: !anyLearning,
      catalogEpisodeRows: b.catalogEpisodeRows,
      catalogEpisodesCompleteBoth: b.catalogEpisodesCompleteBoth,
      catalogEpisodesEngaged: b.catalogEpisodesEngaged,
      catalogDetails: b.catalogDetails,
      legacyModuleRows: b.legacyModuleRows,
      legacyModulesWithCompletion: b.legacyModulesWithCompletion,
      moduleDetails: b.moduleDetails,
      totalSkillSessions,
      totalScenarios,
      topSkills,
    };
  }, [learningBundle]);

  const recoverySummary = useMemo(() => {
    const n = recoverySessions.length;
    if (n === 0) return null;
    const byMode: Record<GroundingMode, number> = {} as Record<GroundingMode, number>;
    recoverySessions.forEach((s) => {
      byMode[s.mode] = (byMode[s.mode] ?? 0) + 1;
    });
    const top = (Object.entries(byMode) as [GroundingMode, number][])
      .sort((a, b) => b[1] - a[1])[0];
    const topMode = top ? GROUNDING_MODES.find((m) => m.id === top[0])?.label ?? top[0] : null;
    const last7 = recoverySessions.filter((s) => {
      const t = new Date(s.startedAt).getTime();
      return Date.now() - t < 7 * ONE_DAY_MS;
    }).length;
    return { count: n, topMode, last7 };
  }, [recoverySessions]);

  const retry = () => setRefreshTrigger((t) => t + 1);

  return {
    user,
    authLoading,
    moodSummary,
    assistActivity,
    learningHydrated,
    eqSummary,
    learningSummary,
    recoverySummary,
    loadingMood,
    loadingEq,
    loadingLearning,
    loadingRecover,
    errorMood,
    errorEq,
    errorLearning,
    errorRecover,
    supabaseOn: isSupabaseConfigured(),
    retry,
  };
}

export default function InsightsScreen() {
  const router = useRouter();
  const colors = useColors();
  const [showSupportPrompt, setShowSupportPrompt] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const {
    user,
    authLoading,
    moodSummary,
    assistActivity,
    learningHydrated,
    eqSummary,
    learningSummary,
    recoverySummary,
    loadingMood,
    loadingEq,
    loadingLearning,
    loadingRecover,
    errorMood,
    errorEq,
    errorLearning,
    errorRecover,
    supabaseOn,
    retry,
  } = useInsightsData();

  const hasMoodOrAssistCard = !!(moodSummary || assistActivity);

  const onRefresh = () => {
    setRefreshing(true);
    retry();
    setTimeout(() => setRefreshing(false), 500);
  };

  const styles = createStyles(colors);

  const signedIn = !!user?.id && !authLoading;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Insights</Text>
        <Text style={styles.subtitle}>What you practice, made visible—not judged.</Text>
      </View>

      {showSupportPrompt && (
        <View style={[styles.supportCard, Shadows.md]}>
          <View style={styles.supportHeader}>
            <View style={styles.supportIcon}>
              <Ionicons name="heart-outline" size={24} color={colors.accentSoft} />
            </View>
            <View style={styles.supportText}>
              <Text style={styles.supportTitle}>
                If a difficult feeling keeps showing up, many people find it helpful to talk to someone.
              </Text>
            </View>
          </View>
          <View style={styles.supportActions}>
            <Button title="View Support Options" onPress={() => {}} size="md" variant="primary" />
            <TouchableOpacity onPress={() => setShowSupportPrompt(false)} style={styles.dismissButton}>
              <Text style={styles.dismissButtonText}>Not Right Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Mood & emotions ───────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeading icon="heart-outline" iconColor={colors.primary} title="Mood & emotions" />
        {loadingMood ? (
          <LoadingCard colors={colors} styles={styles} message="Loading mood logs…" />
        ) : !signedIn ? (
          <EmptyCard
            colors={colors}
            styles={styles}
            title="Sign in to see mood patterns"
            body="Reflect check-ins and Inner Ally tags are saved when you are logged in."
            onPress={() => router.push('/(auth)/sign-in')}
            cta="Sign in"
          />
        ) : signedIn && !moodSummary && supabaseOn && loadingLearning ? (
          <LoadingCard colors={colors} styles={styles} message="Loading Assist activity from the cloud…" />
        ) : hasMoodOrAssistCard ? (
          <View style={[styles.card, { borderColor: colors.borderLight }]}>
            {assistActivity && (
              <>
                <Text style={styles.cardTitle}>Assist (synced)</Text>
                <Text style={styles.bodyText}>
                  Inner Ally: {assistActivity.inner} message{assistActivity.inner !== 1 ? 's' : ''} · Coach:{' '}
                  {assistActivity.coach} message{assistActivity.coach !== 1 ? 's' : ''}
                </Text>
                {formatInsightDate(assistActivity.lastAt) && (
                  <Text style={styles.statLine}>Last Assist message · {formatInsightDate(assistActivity.lastAt)}</Text>
                )}
                <Text style={styles.hintText}>
                  Counts come from chat saved to your account in the cloud. If you only chatted offline or sync failed,
                  numbers stay at zero.
                </Text>
              </>
            )}
            {assistActivity && moodSummary && <View style={styles.subsectionRule} />}
            {moodSummary && moodSummary.privateJournalCount > 0 && (
              <Text style={styles.cardMeta}>
                {moodSummary.privateJournalCount} private journal{' '}
                {moodSummary.privateJournalCount !== 1 ? 'entries' : 'entry'} (Journal — prose never used on Insights)
              </Text>
            )}
            {moodSummary && moodSummary.moodLogCount > 0 && (
              <>
                <Text style={[styles.cardTitle, assistActivity ? { marginTop: Spacing.sm } : undefined]}>
                  {moodSummary.moodLogCount} structured log{moodSummary.moodLogCount !== 1 ? 's' : ''}{' '}
                  (Reflect & Inner Ally)
                </Text>
                {moodSummary.last7MoodLogs > 0 && (
                  <Text style={styles.statLine}>{moodSummary.last7MoodLogs} in the last 7 days</Text>
                )}
                {moodSummary.topEmotions.length > 0 && (
                  <Text style={styles.bodyText}>Common feelings: {moodSummary.topEmotions.join(', ')}</Text>
                )}
                {moodSummary.avgEnergy != null && (
                  <Text style={styles.bodyText}>Average energy (Reflect): {moodSummary.avgEnergy.toFixed(1)} / 5</Text>
                )}
              </>
            )}
            {moodSummary && moodSummary.moodLogCount === 0 && moodSummary.privateJournalCount > 0 && (
              <Text style={styles.bodyText}>
                Add a Reflect check-in or Inner Ally tags to see emotion trends; journal text stays private.
              </Text>
            )}
            {!moodSummary && assistActivity && (
              <Text style={[styles.bodyText, { marginTop: Spacing.sm }]}>
                Reflect check-ins add emotion trends here on this device or account.
              </Text>
            )}
            <View style={styles.rowActions}>
              <TouchableOpacity style={styles.linkChip} onPress={() => router.push('/(tabs)/reflect')}>
                <Text style={styles.linkChipText}>Reflect</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.linkChip} onPress={() => router.push('/(tabs)/assist')}>
                <Text style={styles.linkChipText}>Assist</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <EmptyCard
              colors={colors}
              styles={styles}
              title="No mood or Assist stats yet"
              body={
                Platform.OS === 'web'
                  ? 'Reflect and Inner Ally check-ins are stored for this browser session and your signed-in account. If this list is empty, you have not logged structured moods here yet—or data lives on another device. EQ assessments and Assist message counts use Supabase when configured.'
                  : 'Reflect and Inner Ally check-ins are stored locally on this phone. They do not automatically move to another device. Assist chat counts and EQ scores load from the cloud when Supabase is configured. Empty Insights usually means no rows for this storage yet, not a broken app.'
              }
              onPress={() => router.push('/(tabs)/reflect')}
              cta="Open Reflect"
            />
            <View style={[styles.rowActions, { marginTop: Spacing.sm }]}>
              <TouchableOpacity style={styles.linkChip} onPress={() => router.push('/(tabs)/assist')}>
                <Text style={styles.linkChipText}>Assist</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </>
        )}
        {errorMood && (
          <Text style={styles.errorText}>{errorMood} Pull down to retry.</Text>
        )}
      </View>

      {/* ── EQ assessments ──────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeading icon="analytics-outline" iconColor={colors.primary} title="EQ assessments" />
        {!supabaseOn ? (
          <View style={[styles.card, styles.mutedCard, { borderColor: colors.border }]}>
            <Text style={styles.bodyText}>
              EQ scores sync when the app is connected to Supabase (check your project URL and anon key in .env).
            </Text>
          </View>
        ) : loadingEq ? (
          <LoadingCard colors={colors} styles={styles} message="Loading EQ results…" />
        ) : eqSummary ? (
          <View style={[styles.card, { borderColor: colors.borderLight }]}>
            <Text style={styles.cardTitle}>
              {eqSummary.total} completed ({eqSummary.checkInCount} check-in
              {eqSummary.checkInCount !== 1 ? 's' : ''}
              {eqSummary.fullTestCount > 0
                ? ` · ${eqSummary.fullTestCount} full test${eqSummary.fullTestCount !== 1 ? 's' : ''}`
                : ''}
              )
            </Text>
            {eqSummary.last7 > 0 && <Text style={styles.statLine}>{eqSummary.last7} in the last 7 days</Text>}
            <Text style={styles.bodyText}>
              Latest overall: {eqSummary.latestOverall}
              {eqSummary.avgOverall != null && eqSummary.total > 1
                ? ` · Average: ${Math.round(eqSummary.avgOverall)}`
                : ''}
            </Text>
            {eqSummary.topDimensions.length > 0 && (
              <Text style={styles.bodyText}>
                Strongest areas (latest): {eqSummary.topDimensions.map((d) => d.label).join(' · ')}
              </Text>
            )}
            <TouchableOpacity style={styles.primaryCta} onPress={() => router.push('/(tabs)/home')} activeOpacity={0.85}>
              <Text style={styles.primaryCtaText}>EQ Check-in from Home</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.primaryForeground} />
            </TouchableOpacity>
          </View>
        ) : (
          <EmptyCard
            colors={colors}
            styles={styles}
            title="No EQ scores in your profile yet"
            body="With Supabase enabled, finished check-ins and assessments are stored for your account. This card stays empty until at least one is completed—not because your journal is missing."
            onPress={() => router.push('/(tabs)/home')}
            cta="EQ from Home"
          />
        )}
        {errorEq && <Text style={styles.errorText}>{errorEq}</Text>}
      </View>

      {/* ── Learning & Skill Lab ────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeading icon="school-outline" iconColor={colors.accentIndigo} title="Learning & Skill Lab" />
        {!supabaseOn ? (
          <View style={[styles.card, styles.mutedCard, { borderColor: colors.border }]}>
            <Text style={styles.bodyText}>
              Lesson and Skill Lab progress sync through Supabase. Configure EXPO_PUBLIC_SUPABASE_URL and key to see
              this section.
            </Text>
          </View>
        ) : loadingLearning ? (
          <LoadingCard colors={colors} styles={styles} message="Loading learning activity…" />
        ) : learningHydrated && learningSummary.emptyLearning ? (
          <EmptyCard
            colors={colors}
            styles={styles}
            title="No lesson or Skill Lab progress yet"
            body="Progress rows appear after you open episodes in Learn or finish practice in Skill Lab (stored in learning_content_progress, learning_progress, and skill stats). If you only use Assist or Reflect, this block can stay empty."
            onPress={() => router.push('/(tabs)/learn')}
            cta="Browse Learn"
          />
        ) : (
          <View style={[styles.card, { borderColor: colors.borderLight }]}>
            <Text style={styles.cardTitle}>Learn tab (lessons & audio)</Text>
            <Text style={styles.bodyText}>
              {learningSummary.catalogEpisodesEngaged} episode{learningSummary.catalogEpisodesEngaged !== 1 ? 's' : ''}{' '}
              with activity · {learningSummary.catalogEpisodesCompleteBoth} with both video & audio complete
            </Text>
            {learningSummary.catalogDetails.length > 0 && (
              <View style={styles.progressBlock}>
                <Text style={styles.progressBlockLabel}>Recent episodes</Text>
                {learningSummary.catalogDetails.map((ep) => (
                  <View key={ep.episodeKey} style={styles.progressRow}>
                    <Text style={styles.progressTitle} numberOfLines={2}>
                      {shortenEpisodeKey(ep.episodeKey)}
                    </Text>
                    <Text style={styles.progressMeta}>
                      Video {ep.videoPct}% {ep.videoDone ? '· done' : ''} · Audio {ep.audioPct}% {ep.audioDone ? '· done' : ''}
                    </Text>
                    {formatInsightDate(ep.lastAccessedAt) && (
                      <Text style={styles.progressHint}>Last open · {formatInsightDate(ep.lastAccessedAt)}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {(learningSummary.legacyModuleRows > 0 || learningSummary.moduleDetails.length > 0) && (
              <>
                <Text style={[styles.cardTitle, { marginTop: Spacing.md }]}>Modules (legacy)</Text>
                <Text style={styles.statLine}>
                  {learningSummary.legacyModuleRows} row{learningSummary.legacyModuleRows !== 1 ? 's' : ''} ·{' '}
                  {learningSummary.legacyModulesWithCompletion} with video or audio completed
                </Text>
                {learningSummary.moduleDetails.map((m) => (
                  <View key={m.moduleId} style={styles.progressRow}>
                    <Text style={styles.progressTitle} numberOfLines={2}>
                      {m.title}
                    </Text>
                    <Text style={styles.progressMeta}>
                      Video {m.videoPct}% {m.videoDone ? '· done' : ''} · Audio {m.audioPct}% {m.audioDone ? '· done' : ''}
                    </Text>
                    {formatInsightDate(m.lastAccessedAt) && (
                      <Text style={styles.progressHint}>Last open · {formatInsightDate(m.lastAccessedAt)}</Text>
                    )}
                  </View>
                ))}
              </>
            )}

            <Text style={[styles.cardTitle, { marginTop: Spacing.md }]}>Skill Lab (AI practice)</Text>
            <Text style={styles.bodyText}>
              {learningSummary.totalSkillSessions} practice round
              {learningSummary.totalSkillSessions !== 1 ? 's' : ''} completed
              {learningSummary.totalScenarios > 0
                ? ` · ${learningSummary.totalScenarios} scenario${learningSummary.totalScenarios !== 1 ? 's' : ''} started`
                : ''}
            </Text>
            {learningSummary.topSkills.some((s) => s.completed > 0 || s.attempted > 0) && (
              <View style={styles.bulletList}>
                {learningSummary.topSkills
                  .filter((s) => s.completed > 0 || s.attempted > 0)
                  .map((s) => (
                    <Text key={s.id} style={styles.bulletItem}>
                      · {s.name}: {s.completed} completed
                      {s.attempted > 0 ? ` · ${s.attempted} tried` : ''}
                      {formatInsightDate(s.lastAt) ? ` · last ${formatInsightDate(s.lastAt)}` : ''}
                    </Text>
                  ))}
              </View>
            )}

            <View style={styles.rowActions}>
              <TouchableOpacity style={styles.linkChip} onPress={() => router.push('/(tabs)/learn')}>
                <Text style={styles.linkChipText}>Learn</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.linkChip} onPress={() => router.push('/skill-lab')}>
                <Text style={styles.linkChipText}>Skill Lab</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        {errorLearning && <Text style={styles.errorText}>{errorLearning}</Text>}
      </View>

      {/* ── Recover ───────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeading icon="pulse-outline" iconColor={colors.accentCalm} title="Recover & grounding" />
        {!supabaseOn ? (
          <View style={[styles.card, styles.mutedCard, { borderColor: colors.border }]}>
            <Text style={styles.bodyText}>Recover session history syncs when Supabase is configured.</Text>
          </View>
        ) : loadingRecover ? (
          <LoadingCard colors={colors} styles={styles} message="Loading Recover…" />
        ) : recoverySummary ? (
          <View style={[styles.card, { borderColor: colors.borderLight }]}>
            <Text style={styles.cardTitle}>
              {recoverySummary.count} session{recoverySummary.count !== 1 ? 's' : ''}
            </Text>
            {recoverySummary.last7 > 0 && (
              <Text style={styles.statLine}>{recoverySummary.last7} in the last 7 days</Text>
            )}
            {recoverySummary.topMode && (
              <Text style={styles.bodyText}>Most used: {recoverySummary.topMode}</Text>
            )}
            <Text style={styles.hintText}>Regular grounding supports regulation over time.</Text>
            <TouchableOpacity style={styles.linkChip} onPress={() => router.push('/(tabs)/recover')}>
              <Text style={styles.linkChipText}>Open Recover</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <EmptyCard
            colors={colors}
            styles={styles}
            title="No Recover sessions yet"
            body="Finish a breathing or grounding flow from the Recover tab to see summaries here."
            onPress={() => router.push('/(tabs)/recover')}
            cta="Go to Recover"
          />
        )}
        {errorRecover && <Text style={styles.errorText}>{errorRecover}</Text>}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Insights use structured fields only (tags, scores, completion flags). Private journal writing stays on your
          device or in your account as you chose — it is not used for this screen.
        </Text>
      </View>
    </ScrollView>
  );
}

function SectionHeading({
  icon,
  iconColor,
  title,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
}) {
  const colors = useColors();
  const styles = createStyles(colors);
  return (
    <View style={styles.sectionHeadingRow}>
      <View style={[styles.sectionIcon, { backgroundColor: iconColor + '22' }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function LoadingCard({
  colors,
  styles,
  message,
}: {
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
  message: string;
}) {
  return (
    <View style={[styles.card, styles.loadingCard, { borderColor: colors.border }]}>
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
}

function EmptyCard({
  colors,
  styles,
  title,
  body,
  cta,
  onPress,
}: {
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
  title: string;
  body: string;
  cta: string;
  onPress: () => void;
}) {
  return (
    <View style={[styles.card, styles.emptyCard, { borderColor: colors.borderLight }]}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.bodyText}>{body}</Text>
      <TouchableOpacity style={styles.primaryCta} onPress={onPress} activeOpacity={0.85}>
        <Text style={styles.primaryCtaText}>{cta}</Text>
        <Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />
      </TouchableOpacity>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingBottom: Spacing['2xl'],
      paddingHorizontal: Spacing.md,
    },
    header: {
      paddingTop: Platform.OS === 'ios' ? 56 : Spacing.xl,
      marginBottom: Spacing.lg,
    },
    title: {
      fontSize: Typography.fontSize['2xl'],
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
      marginBottom: Spacing.xs,
    },
    subtitle: {
      fontSize: Typography.fontSize.sm,
      lineHeight: Typography.fontSize.sm * 1.45,
      color: colors.textSecondary,
    },
    section: {
      marginBottom: Spacing.xl,
    },
    sectionHeadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    sectionIcon: {
      width: 36,
      height: 36,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionTitle: {
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
    },
    card: {
      borderRadius: Radius.lg,
      borderWidth: 1,
      padding: Spacing.md,
      backgroundColor: colors.surface,
    },
    mutedCard: {
      backgroundColor: colors.surface,
    },
    emptyCard: {
      alignItems: 'stretch',
    },
    loadingCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    loadingText: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
    },
    cardTitle: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      marginBottom: Spacing.xs,
    },
    cardMeta: {
      fontSize: Typography.fontSize.xs,
      color: colors.textMuted,
      marginBottom: Spacing.sm,
    },
    statLine: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      marginBottom: Spacing.xs,
    },
    bodyText: {
      fontSize: Typography.fontSize.sm,
      lineHeight: Typography.fontSize.sm * 1.45,
      color: colors.textSecondary,
      marginBottom: Spacing.xs,
    },
    hintText: {
      fontSize: Typography.fontSize.xs,
      color: colors.textMuted,
      marginTop: Spacing.xs,
      marginBottom: Spacing.sm,
    },
    subsectionRule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginVertical: Spacing.md,
    },
    progressBlock: {
      marginTop: Spacing.sm,
    },
    progressBlockLabel: {
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textMuted,
      marginBottom: Spacing.xs,
      letterSpacing: 0.3,
    },
    progressRow: {
      paddingVertical: Spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderLight,
    },
    progressTitle: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.medium,
      color: colors.textPrimary,
      marginBottom: 2,
    },
    progressMeta: {
      fontSize: Typography.fontSize.xs,
      color: colors.textSecondary,
    },
    progressHint: {
      fontSize: Typography.fontSize.xs,
      color: colors.textMuted,
      marginTop: 2,
    },
    bulletList: {
      marginTop: Spacing.xs,
      marginBottom: Spacing.sm,
    },
    bulletItem: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    rowActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
      marginTop: Spacing.md,
    },
    linkChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: Radius.full,
      backgroundColor: colors.floating,
      borderWidth: 1,
      borderColor: colors.border,
    },
    linkChipText: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.medium,
      color: colors.primary,
    },
    primaryCta: {
      marginTop: Spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.md,
    },
    primaryCtaText: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.primaryForeground,
    },
    errorText: {
      fontSize: Typography.fontSize.xs,
      color: colors.destructive,
      marginTop: Spacing.xs,
    },
    supportCard: {
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.lg,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    supportHeader: { flexDirection: 'row', gap: Spacing.md },
    supportIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.accentSoft + '30',
      alignItems: 'center',
      justifyContent: 'center',
    },
    supportText: { flex: 1 },
    supportTitle: { fontSize: Typography.fontSize.sm, color: colors.textPrimary, lineHeight: 20 },
    supportActions: { marginTop: Spacing.md, gap: Spacing.sm },
    dismissButton: { paddingVertical: Spacing.sm, alignItems: 'center' },
    dismissButtonText: { fontSize: Typography.fontSize.sm, color: colors.textMuted },
    footer: {
      marginTop: Spacing.md,
      paddingHorizontal: Spacing.xs,
    },
    footerText: {
      fontSize: Typography.fontSize.xs,
      lineHeight: 16,
      color: colors.textMuted,
      textAlign: 'center',
    },
  });
}
