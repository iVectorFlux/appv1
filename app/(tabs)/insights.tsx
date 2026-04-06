/**
 * Insights Screen
 * 
 * Insights derived ONLY from structured data:
 * - EQ check-in patterns
 * - Emotion + energy + reason patterns
 * 
 * NEVER from journal text content.
 * 
 * Also includes quick access to Learn content.
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
import { SectionHeaderCard } from '@/components/ui/section-header-card';
import { AudioRowCard } from '@/components/ui/audio-row-card';
import { useColors, Spacing, Typography, Radius, Shadows } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import { DIMENSION_INFO } from '@/data/learning-content';
import { useLearningCatalog } from '@/hooks/useLearningCatalog';
import { staticModulesAsEpisodes } from '@/services/learning-content-catalog';
import { GROUNDING_MODES } from '@/data/grounding-content';
import { useAuthStore } from '@/stores/auth-store';
import { getJournalEntries } from '@/services/journal-storage';
import { getRecoverySessions } from '@/services/recovery-storage';
import type { JournalEntry } from '@/types';
import type { GroundingMode } from '@/types/grounding';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const PER_SOURCE_TIMEOUT_MS = 10_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timed out')), ms)),
  ]);
}

function useInsightsData() {
  const { user } = useAuthStore();
  const [reflectEntries, setReflectEntries] = useState<JournalEntry[]>([]);
  const [recoverySessions, setRecoverySessions] = useState<Awaited<ReturnType<typeof getRecoverySessions>>>([]);
  const [loadingEq, setLoadingEq] = useState(true);
  const [loadingWellbeing, setLoadingWellbeing] = useState(true);
  const [errorEq, setErrorEq] = useState<string | null>(null);
  const [errorWellbeing, setErrorWellbeing] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const cancelledRef = useRef(false);

  useEffect(() => {
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

    // Load Reflect (EQ) data independently — journal_entries / SQLite
    withTimeout(getJournalEntries(user.id, 100), PER_SOURCE_TIMEOUT_MS)
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

    // Load Recover (Wellbeing) data independently — recovery_sessions / Supabase
    withTimeout(getRecoverySessions(user.id, 50), PER_SOURCE_TIMEOUT_MS)
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

    return () => { cancelledRef.current = true; };
  }, [user?.id, refreshTrigger]);

  const eqSummary = useMemo(() => {
    const n = reflectEntries.length;
    if (n === 0) return null;
    const allEmotions = reflectEntries.flatMap((e) => e.emotions ?? []);
    const counts: Record<string, number> = {};
    allEmotions.forEach((em) => { counts[em] = (counts[em] ?? 0) + 1; });
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
    recoverySessions.forEach((s) => { byMode[s.mode] = (byMode[s.mode] ?? 0) + 1; });
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
    loadingEq,
    loadingWellbeing,
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
  const [activeTab, setActiveTab] = useState<'insights' | 'learn'>('insights');
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

  const learnPreview = useLearningCatalog();
  const learnPreviewList = learnPreview.hasRemote ? learnPreview.episodes : staticModulesAsEpisodes();
  const recommendedPreview = learnPreviewList.slice(0, 3);
  const podcastPreview = learnPreviewList.slice(0, 2);

  const onRefresh = () => {
    setRefreshing(true);
    retry();
    setTimeout(() => setRefreshing(false), 800);
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Insights & Learn</Text>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'insights' && styles.tabActive]}
          onPress={() => setActiveTab('insights')}
        >
          <Ionicons 
            name="analytics-outline" 
            size={18} 
            color={activeTab === 'insights' ? colors.primary : colors.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'insights' && styles.tabTextActive]}>
            Insights
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'learn' && styles.tabActive]}
          onPress={() => setActiveTab('learn')}
        >
          <Ionicons 
            name="book-outline" 
            size={18} 
            color={activeTab === 'learn' ? colors.primary : colors.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'learn' && styles.tabTextActive]}>
            Learn
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'insights' ? (
        <>
          {/* Conditional Support Prompt */}
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
                <Button
                  title="View Support Options"
                  onPress={() => {}}
                  size="md"
                  variant="primary"
                />
                <TouchableOpacity
                  onPress={() => setShowSupportPrompt(false)}
                  style={styles.dismissButton}
                >
                  <Text style={styles.dismissButtonText}>Not Right Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* EQ skills — from Reflect check-ins (emotions, energy) */}
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
                <Text style={styles.insightsHint}>
                  Keep using Reflect to see stronger patterns over time.
                </Text>
              </View>
            ) : (
              <View style={styles.emptyInsightsCard}>
                <View style={[styles.emptyInsightsIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="analytics-outline" size={32} color={colors.primary} />
                </View>
                <Text style={styles.emptyInsightsTitle}>Your insights will appear here</Text>
                <Text style={styles.emptyInsightsDescription}>
                  Insights are based on your Reflect check-ins (emotions, energy). Use the heart tab to log how you feel; after a few check-ins we’ll show your patterns here.
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

          {/* Wellbeing patterns — from Recover (breathing & grounding) sessions */}
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
                  <Text style={styles.insightsDescription}>
                    Most used: {recoverySummary.topMode}
                  </Text>
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
                  Insights are based on your Recover sessions (breathing & grounding). Use Recover a few times and we’ll show your patterns here.
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
        </>
      ) : (
        <>
          {/* Learn Tab – Deep Dive Podcasts style (section header + audio rows) */}
          <View style={styles.section}>
            <SectionHeaderCard
              title="Recommended for you"
              subtitle="Video lessons and podcasts for your EQ journey"
              icon="book-outline"
            />
            {recommendedPreview.map((ep) => (
              <AudioRowCard
                key={ep.episodeKey}
                onPress={() =>
                  router.push(`/learning-detail?id=${encodeURIComponent(ep.routeId)}`)
                }
                title={ep.title}
                subtitle={`${DIMENSION_INFO[ep.dimension].name} • Video lesson`}
                icon={ep.icon as any}
                iconBackgroundColor={ep.color + '20'}
                iconColor={ep.color}
              />
            ))}
          </View>

          <View style={styles.section}>
            <SectionHeaderCard
              title="Deep dive podcasts"
              subtitle="Extended audio sessions for deeper learning"
              icon="headset"
            />
            {podcastPreview.map((ep) => (
              <AudioRowCard
                key={`podcast-${ep.episodeKey}`}
                onPress={() =>
                  router.push(`/learning-detail?id=${encodeURIComponent(ep.routeId)}`)
                }
                title={ep.title}
                subtitle={`${DIMENSION_INFO[ep.dimension].name} • Podcast`}
                icon={ep.icon as any}
                iconBackgroundColor={ep.color + '20'}
                iconColor={ep.color}
              />
            ))}
          </View>

          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => router.push('/(tabs)/learn')}
          >
            <Text style={styles.viewAllText}>View All Learning Content</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.primary} />
          </TouchableOpacity>
        </>
      )}

      {/* Understanding note */}
      <View style={styles.noteCard}>
        <Ionicons name="shield-checkmark-outline" size={16} color={colors.textMuted} />
        <Text style={styles.noteText}>
          Insights are based on your Reflect check-ins (emotions, energy) and your Recover sessions (breathing & grounding). Journal text is never used—your writing stays private.
        </Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xs,
    marginBottom: Spacing['2xl'],
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  tabActive: {
    backgroundColor: colors.floating,
  },
  tabText: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.primary,
  },
  tabTextActive: {
    color: colors.primary,
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
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  viewAllText: {
    fontSize: Typography.fontSize.base,
    color: colors.primary,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.primary,
  },
  diagnosticCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  diagnosticTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: Spacing.sm,
    fontFamily: Typography.fontFamily.primary,
  },
  diagnosticText: {
    fontSize: Typography.fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.xs,
    fontFamily: Typography.fontFamily.primary,
  },
  errorCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  errorText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.primary,
  },
  retryBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
  },
  retryBtnText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.primaryForeground,
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
