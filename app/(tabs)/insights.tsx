/**
 * Insights Screen
 *
 * Derived only from structured data: Reflect check-ins (journal_entries, reflect)
 * and Recover sessions. Never from journal text content.
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
import { getJournalEntries } from '@/services/journal-storage';
import { getRecoverySessions } from '@/services/recovery-storage';
import type { JournalEntry } from '@/types';
import type { GroundingMode } from '@/types/grounding';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const RECOVERY_TIMEOUT_MS = 7000;
const WEB_JOURNAL_TIMEOUT_MS = 8000;
const NATIVE_JOURNAL_RETRIES = 6;
const NATIVE_JOURNAL_RETRY_MS = 280;

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
  const [reflectEntries, setReflectEntries] = useState<JournalEntry[]>([]);
  const [recoverySessions, setRecoverySessions] = useState<Awaited<ReturnType<typeof getRecoverySessions>>>([]);
  const [loadingEq, setLoadingEq] = useState(false);
  const [loadingWellbeing, setLoadingWellbeing] = useState(false);
  const [errorEq, setErrorEq] = useState<string | null>(null);
  const [errorWellbeing, setErrorWellbeing] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const cancelledRef = useRef(false);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user?.id) {
      setReflectEntries([]);
      setRecoverySessions([]);
      setLoadingEq(false);
      setLoadingWellbeing(false);
      setErrorEq(null);
      setErrorWellbeing(null);
      return;
    }

    cancelledRef.current = false;
    setLoadingEq(true);
    setLoadingWellbeing(true);
    setErrorEq(null);
    setErrorWellbeing(null);

    loadReflectJournalEntries(user.id, 80)
      .then((entries) => {
        if (cancelledRef.current) return;
        const reflect = (entries || []).filter((e) => e.entrySource === 'reflect');
        setReflectEntries(reflect);
      })
      .catch((e) => {
        if (!cancelledRef.current) {
          setReflectEntries([]);
          setErrorEq(e?.message || 'Couldn’t load. Pull to retry.');
        }
      })
      .finally(() => {
        if (!cancelledRef.current) setLoadingEq(false);
      });

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

    return () => {
      cancelledRef.current = true;
    };
  }, [user?.id, refreshTrigger, authLoading]);

  const eqSummary = useMemo(() => {
    const n = reflectEntries.length;
    if (n === 0) return null;
    const allEmotions = reflectEntries.flatMap((e) => e.emotions ?? []);
    const counts: Record<string, number> = {};
    allEmotions.forEach((em) => {
      counts[em] = (counts[em] ?? 0) + 1;
    });
    const topEmotions = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([em]) => em);
    const withEnergy = reflectEntries.filter((e) => e.energyLevel != null && e.energyLevel > 0);
    const avgEnergy =
      withEnergy.length > 0
        ? withEnergy.reduce((s, e) => s + (e.energyLevel ?? 0), 0) / withEnergy.length
        : null;
    const now = Date.now();
    const last7 = reflectEntries.filter((e) => now - e.createdAt < 7 * ONE_DAY_MS).length;
    return { count: n, topEmotions, avgEnergy, last7 };
  }, [reflectEntries]);

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
          Patterns from Reflect and Recover — use the Learn tab for lessons and podcasts.
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
        <Text style={styles.sectionTitle}>EQ skills</Text>
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
            <Text style={styles.emptyInsightsTitle}>
              {eqSummary.count} reflection{eqSummary.count !== 1 ? 's' : ''} so far
            </Text>
            {eqSummary.last7 > 0 && (
              <Text style={styles.summaryStat}>{eqSummary.last7} in the last 7 days</Text>
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
            <Text style={styles.insightsHint}>Keep using Reflect to see stronger patterns over time.</Text>
          </View>
        ) : (
          <View style={styles.emptyInsightsCard}>
            <View style={[styles.emptyInsightsIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="analytics-outline" size={32} color={colors.primary} />
            </View>
            <Text style={styles.emptyInsightsTitle}>Your insights will appear here</Text>
            <Text style={styles.emptyInsightsDescription}>
              Insights are based on your Reflect check-ins (emotions, energy). Use the heart tab to log how you feel;
              after a few check-ins we’ll show your patterns here.
            </Text>
            {(errorEq || !eqSummary) && (
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => (errorEq ? retry() : router.push('/(tabs)/reflect'))}
                activeOpacity={0.8}
              >
                <Text style={styles.ctaButtonText}>{errorEq ? 'Try again' : 'Go to Reflect'}</Text>
                <Ionicons name={errorEq ? 'refresh-outline' : 'heart-outline'} size={18} color={colors.primaryForeground} />
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
              Insights are based on your Recover sessions (breathing & grounding). Use Recover a few times and we’ll show
              your patterns here.
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
          Insights use only Reflect check-ins and Recover sessions. Journal text is never used — your writing stays private.
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
