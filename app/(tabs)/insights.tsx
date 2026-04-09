/**
 * Insights Screen
 *
 * Structured data only (no journal prose analysis):
 * - Reflect + Inner Ally rows (emotions, energy) from journal_entries
 * - EQ Check-in / full test scores from eq_scores
 * - Recover sessions from recovery_sessions (requires Supabase)
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
import { useAuthStore } from '@/stores/auth-store';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getJournalEntries } from '@/services/journal-storage';
import { getRecoverySessions } from '@/services/recovery-storage';
import { getEQScores } from '@/services/eq-storage';
import type { JournalEntry } from '@/types';
import type { GroundingMode } from '@/types/grounding';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const RECOVERY_TIMEOUT_MS = 7000;
const EQ_SCORES_TIMEOUT_MS = 7000;
const WEB_JOURNAL_TIMEOUT_MS = 8000;
const NATIVE_JOURNAL_RETRIES = 6;
const NATIVE_JOURNAL_RETRY_MS = 280;
/** Never leave Insights spinners stuck if a promise misbehaves. */
const INSIGHTS_LOAD_SAFETY_MS = 18000;

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timed out')), ms)),
  ]);
}

/** Native: retry briefly while SQLite finishes init. Web: timeout against slow network. */
async function loadReflectJournalEntries(userId: string, limit: number): Promise<JournalEntry[]> {
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
        msg.includes('not initialized') ||
        msg.includes('database') ||
        msg.includes('sqlite');
      if (!maybeInitRace || attempt === NATIVE_JOURNAL_RETRIES - 1) {
        throw lastErr;
      }
      await delay(NATIVE_JOURNAL_RETRY_MS);
    }
  }
  throw lastErr ?? new Error('Could not load reflections');
}

function useInsightsData() {
  const { user, isLoading: authLoading } = useAuthStore();
  /** All journal rows (Reflect, Inner Ally, private journal) for Insights. */
  const [allJournalRows, setAllJournalRows] = useState<JournalEntry[]>([]);
  const [eqScores, setEqScores] = useState<
    Awaited<ReturnType<typeof getEQScores>>
  >([]);
  const [recoverySessions, setRecoverySessions] = useState<Awaited<ReturnType<typeof getRecoverySessions>>>([]);
  const [loadingEq, setLoadingEq] = useState(false);
  const [loadingWellbeing, setLoadingWellbeing] = useState(false);
  const [errorEq, setErrorEq] = useState<string | null>(null);
  const [errorEqScores, setErrorEqScores] = useState<string | null>(null);
  const [errorWellbeing, setErrorWellbeing] = useState<string | null>(null);
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
    if (authLoading) {
      return;
    }

    if (!user?.id) {
      setAllJournalRows([]);
      setEqScores([]);
      setRecoverySessions([]);
      setLoadingEq(false);
      setLoadingWellbeing(false);
      setErrorEq(null);
      setErrorEqScores(null);
      setErrorWellbeing(null);
      return;
    }

    cancelledRef.current = false;
    setLoadingEq(true);
    setLoadingWellbeing(true);
    setErrorEq(null);
    setErrorEqScores(null);
    setErrorWellbeing(null);

    const safetyTimer = setTimeout(() => {
      if (!cancelledRef.current) {
        setLoadingEq(false);
        setLoadingWellbeing(false);
      }
    }, INSIGHTS_LOAD_SAFETY_MS);

    let eqLoadsPending = isSupabaseConfigured() ? 2 : 1;
    const markEqLoadDone = () => {
      eqLoadsPending -= 1;
      if (eqLoadsPending <= 0 && !cancelledRef.current) {
        setLoadingEq(false);
      }
    };

    loadReflectJournalEntries(user.id, 100)
      .then((entries) => {
        if (cancelledRef.current) return;
        setAllJournalRows(entries || []);
      })
      .catch((e) => {
        if (!cancelledRef.current) {
          setAllJournalRows([]);
          setErrorEq(e?.message || 'Couldn’t load. Pull to retry.');
        }
      })
      .finally(markEqLoadDone);

    if (isSupabaseConfigured()) {
      withTimeout(getEQScores(user.id, 50), EQ_SCORES_TIMEOUT_MS)
        .then((scores) => {
          if (cancelledRef.current) return;
          setEqScores(scores || []);
        })
        .catch((e) => {
          if (!cancelledRef.current) {
            setEqScores([]);
            setErrorEqScores(e?.message || 'Couldn’t load EQ results.');
          }
        })
        .finally(markEqLoadDone);
    } else {
      setEqScores([]);
      markEqLoadDone();
    }

    if (isSupabaseConfigured()) {
      withTimeout(getRecoverySessions(user.id, 40), RECOVERY_TIMEOUT_MS)
        .then((sessions) => {
          if (cancelledRef.current) return;
          setRecoverySessions(sessions || []);
        })
        .catch((e) => {
          if (!cancelledRef.current) {
            setRecoverySessions([]);
            setErrorWellbeing(e?.message || 'Couldn’t load. Pull to retry.');
          }
        })
        .finally(() => {
          if (!cancelledRef.current) setLoadingWellbeing(false);
        });
    } else {
      setRecoverySessions([]);
      setLoadingWellbeing(false);
    }

    return () => {
      cancelledRef.current = true;
      clearTimeout(safetyTimer);
    };
  }, [user?.id, refreshTrigger, authLoading]);

  const eqSummary = useMemo(() => {
    const journal = patternEntries;
    const scores = eqScores;
    const nJ = journal.length;
    const nS = scores.length;
    const nPrivate = privateJournalCount;
    if (nJ === 0 && nS === 0 && nPrivate === 0) return null;

    const allEmotions = journal.flatMap((e) => e.emotions ?? []);
    const counts: Record<string, number> = {};
    allEmotions.forEach((em) => {
      counts[em] = (counts[em] ?? 0) + 1;
    });
    const topEmotions = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([em]) => em);
    const withEnergy = journal.filter((e) => e.energyLevel != null && e.energyLevel > 0);
    const avgEnergy =
      withEnergy.length > 0
        ? withEnergy.reduce((s, e) => s + (e.energyLevel ?? 0), 0) / withEnergy.length
        : null;
    const now = Date.now();
    const last7Journal = journal.filter((e) => now - e.createdAt < 7 * ONE_DAY_MS).length;

    const checkIns = scores.filter((s) => s.assessmentType === 'check_in');
    const fullTests = scores.filter((s) => s.assessmentType === 'full_test');
    const last7Scores = scores.filter(
      (s) => now - new Date(s.completedAt).getTime() < 7 * ONE_DAY_MS
    ).length;
    const latestScore = nS > 0 ? scores[0].overallScore : null;
    const avgScore =
      nS > 0 ? scores.reduce((acc, s) => acc + s.overallScore, 0) / nS : null;

    return {
      journalCount: nJ,
      privateJournalCount: nPrivate,
      scoreCount: nS,
      checkInCount: checkIns.length,
      fullTestCount: fullTests.length,
      topEmotions,
      avgEnergy,
      last7Journal,
      last7Scores,
      latestScore,
      avgScore,
    };
  }, [patternEntries, privateJournalCount, eqScores]);

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

  const eqBusy = authLoading || loadingEq;
  const wellbeingBusy = authLoading || loadingWellbeing;

  return {
    loadingEq: eqBusy,
    loadingWellbeing: wellbeingBusy,
    eqSummary,
    recoverySummary,
    errorEq,
    errorEqScores,
    errorWellbeing,
    retry,
  };
}

export default function InsightsScreen() {
  const router = useRouter();
  const colors = useColors();
  const [showSupportPrompt, setShowSupportPrompt] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const {
    loadingEq,
    loadingWellbeing,
    eqSummary,
    recoverySummary,
    errorEq,
    errorEqScores,
    errorWellbeing,
    retry,
  } = useInsightsData();

  const onRefresh = () => {
    setRefreshing(true);
    retry();
    setTimeout(() => setRefreshing(false), 600);
  };

  const styles = createStyles(colors);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Insights</Text>
        <Text style={styles.subtitle}>
          Mood check-ins, EQ assessments, Inner Ally tags, and Recover — Learn tab has lessons and podcasts.
        </Text>
      </View>

      {showSupportPrompt && (
        <View style={[styles.supportCard, Shadows.md]}>
          <View style={styles.supportHeader}>
            <View style={styles.supportIcon}>
              <Ionicons name="heart-outline" size={24} color={colors.accentSoft} />
            </View>
            <View style={styles.supportText}>
              <Text style={styles.supportTitle}>
                This feeling has been showing up for a while. Many people find it helpful to talk to someone.
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mood & EQ</Text>
        {loadingEq ? (
          <View style={[styles.emptyInsightsCard, styles.insightsCardLoading]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Loading your data…</Text>
          </View>
        ) : eqSummary ? (
          <View style={[styles.insightsCard, { borderColor: colors.borderLight }]}>
            <View style={[styles.emptyInsightsIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="analytics-outline" size={32} color={colors.primary} />
            </View>
            {eqSummary.privateJournalCount > 0 && (
              <Text style={styles.insightsDescription}>
                {eqSummary.privateJournalCount} private journal{' '}
                {eqSummary.privateJournalCount !== 1 ? 'entries' : 'entry'} (Journal tab — not shown in mood tags below)
              </Text>
            )}
            {eqSummary.journalCount > 0 && (
              <>
                <Text
                  style={[
                    styles.emptyInsightsTitle,
                    eqSummary.privateJournalCount > 0 && { marginTop: Spacing.md },
                  ]}
                >
                  {eqSummary.journalCount} mood log{eqSummary.journalCount !== 1 ? 's' : ''} (Reflect & Inner Ally)
                </Text>
                {eqSummary.last7Journal > 0 && (
                  <Text style={styles.summaryStat}>{eqSummary.last7Journal} in the last 7 days</Text>
                )}
                {eqSummary.topEmotions.length > 0 && (
                  <Text style={styles.insightsDescription}>
                    Most common feelings: {eqSummary.topEmotions.join(', ')}
                  </Text>
                )}
                {eqSummary.avgEnergy != null && (
                  <Text style={styles.insightsDescription}>
                    Average energy: {eqSummary.avgEnergy.toFixed(1)} / 5
                  </Text>
                )}
              </>
            )}
            {eqSummary.scoreCount > 0 && (
              <>
                <Text
                  style={[
                    styles.emptyInsightsTitle,
                    eqSummary.journalCount > 0 && { marginTop: Spacing.md },
                  ]}
                >
                  EQ assessments: {eqSummary.scoreCount} completed
                  {eqSummary.checkInCount > 0 && eqSummary.fullTestCount > 0
                    ? ` (${eqSummary.checkInCount} check-in · ${eqSummary.fullTestCount} full)`
                    : eqSummary.checkInCount > 0
                      ? ` (${eqSummary.checkInCount} check-in${eqSummary.checkInCount !== 1 ? 's' : ''})`
                      : ''}
                </Text>
                {eqSummary.last7Scores > 0 && (
                  <Text style={styles.summaryStat}>{eqSummary.last7Scores} in the last 7 days</Text>
                )}
                {eqSummary.latestScore != null && (
                  <Text style={styles.insightsDescription}>
                    Latest overall score: {eqSummary.latestScore}
                    {eqSummary.avgScore != null && eqSummary.scoreCount > 1
                      ? ` · Average: ${Math.round(eqSummary.avgScore)}`
                      : ''}
                  </Text>
                )}
              </>
            )}
            {(eqSummary.journalCount > 0 || eqSummary.scoreCount > 0 || eqSummary.privateJournalCount > 0) && (
              <Text style={styles.insightsHint}>
                Keep logging in Reflect, EQ Check-in, Inner Ally, or Journal to deepen these patterns.
              </Text>
            )}
            {errorEqScores && eqSummary.scoreCount === 0 && eqSummary.journalCount > 0 && (
              <Text style={[styles.insightsHint, { color: colors.textSecondary }]}>
                EQ scores didn’t load ({errorEqScores}). Pull to refresh.
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.emptyInsightsCard}>
            <View style={[styles.emptyInsightsIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="analytics-outline" size={32} color={colors.primary} />
            </View>
            <Text style={styles.emptyInsightsTitle}>Your insights will appear here</Text>
            <Text style={styles.emptyInsightsDescription}>
              Complete a Reflect check-in (heart tab), an EQ Check-in from Home, or a few Inner Ally chats — or finish an EQ
              assessment. We only use structured fields (emotions, energy, scores), never your private journal prose.
            </Text>
            {(errorEq || errorEqScores) && (
              <TouchableOpacity style={styles.ctaButton} onPress={() => retry()} activeOpacity={0.8}>
                <Text style={styles.ctaButtonText}>Try again</Text>
                <Ionicons name="refresh-outline" size={18} color={colors.primaryForeground} />
              </TouchableOpacity>
            )}
            {!errorEq && !errorEqScores && (
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => router.push('/(tabs)/reflect')}
                activeOpacity={0.8}
              >
                <Text style={styles.ctaButtonText}>Go to Reflect</Text>
                <Ionicons name="heart-outline" size={18} color={colors.primaryForeground} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Wellbeing patterns</Text>
        {loadingWellbeing ? (
          <View style={[styles.emptyInsightsCard, styles.insightsCardLoading]}>
            <ActivityIndicator size="small" color={colors.accentCalm} />
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        ) : recoverySummary ? (
          <View style={[styles.insightsCard, { borderColor: colors.borderLight }]}>
            <View style={[styles.emptyInsightsIcon, { backgroundColor: colors.accentCalm + '20' }]}>
              <Ionicons name="pulse-outline" size={32} color={colors.accentCalm} />
            </View>
            <Text style={styles.emptyInsightsTitle}>
              {recoverySummary.count} Recover session{recoverySummary.count !== 1 ? 's' : ''}
            </Text>
            {recoverySummary.last7 > 0 && (
              <Text style={styles.summaryStat}>{recoverySummary.last7} in the last 7 days</Text>
            )}
            {recoverySummary.topMode && (
              <Text style={styles.insightsDescription}>Most used: {recoverySummary.topMode}</Text>
            )}
            <Text style={styles.insightsHint}>
              Breathing and grounding help regulate your nervous system over time.
            </Text>
          </View>
        ) : (
          <View style={styles.emptyInsightsCard}>
            <View style={[styles.emptyInsightsIcon, { backgroundColor: colors.accentCalm + '20' }]}>
              <Ionicons name="pulse-outline" size={32} color={colors.accentCalm} />
            </View>
            <Text style={styles.emptyInsightsTitle}>Patterns as you go</Text>
            <Text style={styles.emptyInsightsDescription}>
              {isSupabaseConfigured()
                ? 'After you use Recover (breathing & grounding), session summaries appear here.'
                : 'Recover insights sync when the app is connected to Supabase (check your .env / build).'}
            </Text>
            {(errorWellbeing || !recoverySummary) && (
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => (errorWellbeing ? retry() : router.push('/(tabs)/recover'))}
                activeOpacity={0.8}
              >
                <Text style={styles.ctaButtonText}>{errorWellbeing ? 'Try again' : 'Go to Recover'}</Text>
                <Ionicons name={errorWellbeing ? 'refresh-outline' : 'fitness-outline'} size={18} color={colors.primaryForeground} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <View style={styles.noteCard}>
        <Ionicons name="shield-checkmark-outline" size={16} color={colors.textMuted} />
        <Text style={styles.noteText}>
          Mood insights use Reflect, Inner Ally tags, and EQ assessment scores. Recover uses session metadata only. Private
          journal entries are not read for this screen.
        </Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: Spacing.lg,
      paddingTop: Platform.OS === 'ios' ? 52 : Spacing.lg,
      paddingBottom: Spacing['2xl'],
    },
    header: {
      marginBottom: Spacing.lg,
    },
    title: {
      fontSize: Typography.fontSize['3xl'],
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      fontFamily: Typography.fontFamily.heading,
    },
    subtitle: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      marginTop: Spacing.xs,
      lineHeight: Typography.fontSize.sm * 1.45,
      fontFamily: Typography.fontFamily.primary,
    },
    supportCard: {
      backgroundColor: colors.floating,
      borderRadius: Radius.xl,
      padding: Spacing.lg,
      marginBottom: Spacing.xl,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    supportHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.md,
      marginBottom: Spacing.md,
    },
    supportIcon: {
      width: 40,
      height: 40,
      borderRadius: Radius.full,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    supportText: {
      flex: 1,
    },
    supportTitle: {
      fontSize: Typography.fontSize.base,
      color: colors.textPrimary,
      lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
      fontFamily: Typography.fontFamily.primary,
    },
    supportActions: {
      gap: Spacing.sm,
    },
    dismissButton: {
      paddingVertical: Spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dismissButtonText: {
      fontSize: Typography.fontSize.base,
      color: colors.textPrimary,
      fontWeight: Typography.fontWeight.medium,
      fontFamily: Typography.fontFamily.primary,
    },
    section: {
      marginBottom: Spacing.lg,
    },
    sectionTitle: {
      fontSize: Typography.fontSize.xs,
      color: colors.textMuted,
      fontWeight: Typography.fontWeight.semibold,
      marginBottom: Spacing.sm,
      fontFamily: Typography.fontFamily.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    emptyInsightsCard: {
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    insightsCard: {
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      alignItems: 'center',
      borderWidth: 1,
    },
    insightsCardLoading: {
      flexDirection: 'row',
      gap: Spacing.md,
      justifyContent: 'center',
    },
    loadingText: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      fontFamily: Typography.fontFamily.primary,
    },
    summaryStat: {
      fontSize: Typography.fontSize.sm,
      color: colors.primary,
      fontWeight: Typography.fontWeight.medium,
      marginBottom: Spacing.sm,
      fontFamily: Typography.fontFamily.primary,
    },
    insightsDescription: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: Spacing.xs,
      fontFamily: Typography.fontFamily.primary,
    },
    insightsHint: {
      fontSize: Typography.fontSize.xs,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: Spacing.sm,
      fontFamily: Typography.fontFamily.primary,
    },
    ctaButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginTop: Spacing.md,
      backgroundColor: colors.primary,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.lg,
      borderRadius: Radius.md,
    },
    ctaButtonText: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.primaryForeground,
      fontFamily: Typography.fontFamily.primary,
    },
    emptyInsightsIcon: {
      width: 48,
      height: 48,
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.md,
    },
    emptyInsightsTitle: {
      fontSize: Typography.fontSize.sm,
      color: colors.textPrimary,
      fontWeight: Typography.fontWeight.semibold,
      marginBottom: Spacing.xs,
      textAlign: 'center',
      fontFamily: Typography.fontFamily.primary,
    },
    emptyInsightsDescription: {
      fontSize: Typography.fontSize.xs,
      color: colors.textSecondary,
      lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.xs,
      textAlign: 'center',
      fontFamily: Typography.fontFamily.primary,
    },
    noteCard: {
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.sm,
    },
    noteText: {
      flex: 1,
      fontSize: Typography.fontSize.xs,
      color: colors.textMuted,
      lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.xs,
      fontFamily: Typography.fontFamily.primary,
    },
  });
