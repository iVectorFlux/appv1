/**
 * Learn EQ — Clean, Airy Curriculum Browser
 *
 * Minimalist card layout: generous spacing, subtle step/status icons,
 * crisp font scale, and zero noisy pills or loading stalls.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import { GlassBackground } from '@/components/ui/glass-background';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/shadcn-primitives';
import { useAuthStore } from '@/stores/auth-store';
import { useWebLaptopLayout } from '@/hooks/useWebLaptopLayout';
import { useLearningCatalog, type LearningCatalogAudienceFilter } from '@/hooks/useLearningCatalog';
import {
  B2B_DOMAIN_LABELS,
  B2B_DOMAIN_ORDER,
  normalizeB2bCatalogKey,
  type B2BDomainKey,
} from '@/data/learning-b2b-taxonomy';
import { DIMENSION_INFO } from '@/data/learning-content';
import { getEQScores } from '@/services/eq-storage';
import {
  fetchUserLearningContentProgress,
  type LearningContentProgressRow,
} from '@/services/learning-content-progress';
import {
  buildSequencedCatalog,
  GOOD_EQ_SCORE_THRESHOLD,
  type SequencedEpisode,
} from '@/services/learning-sequence';

export default function LearnScreen() {
  const router = useRouter();
  const colors = useColors();
  const isDesktop = useWebLaptopLayout();
  const { user } = useAuthStore();

  const [audience, setAudience] = useState<LearningCatalogAudienceFilter>('B2B');
  const { episodes, error, reload } = useLearningCatalog(audience);
  const [selectedDomain, setSelectedDomain] = useState<B2BDomainKey | 'all'>('all');
  const [progressByKey, setProgressByKey] = useState<Record<string, LearningContentProgressRow>>({});
  const [latestEqScore, setLatestEqScore] = useState<number | null>(null);
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);

  const loadLearnerState = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [progressMap, scores] = await Promise.all([
        fetchUserLearningContentProgress(user.id),
        getEQScores(user.id),
      ]);
      setProgressByKey(progressMap);
      const latest = scores.length > 0 ? scores[0]! : null;
      setLatestEqScore(latest ? Math.round(latest.overallScore) : null);
    } catch {
      // Non-fatal; sequential defaults remain responsive
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      void loadLearnerState();
    }, [loadLearnerState])
  );

  const sequenced = useMemo(() => {
    return buildSequencedCatalog(episodes, progressByKey, latestEqScore);
  }, [episodes, progressByKey, latestEqScore]);

  const filteredItems = useMemo(() => {
    if (audience !== 'B2B' || selectedDomain === 'all') return sequenced.items;
    return sequenced.items.filter(
      (item) => normalizeB2bCatalogKey(item.episode.domain) === selectedDomain
    );
  }, [audience, sequenced.items, selectedDomain]);

  const domainGroups = useMemo(() => {
    if (audience !== 'B2B') return [];
    const domainsToShow =
      selectedDomain === 'all' ? B2B_DOMAIN_ORDER : ([selectedDomain] as readonly B2BDomainKey[]);
    return domainsToShow
      .map((domKey) => ({
        domainKey: domKey,
        label: B2B_DOMAIN_LABELS[domKey],
        items: filteredItems.filter(
          (i) => normalizeB2bCatalogKey(i.episode.domain) === domKey
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [audience, selectedDomain, filteredItems]);

  const handleOpenEpisode = (item: SequencedEpisode) => {
    if (!item.unlocked) {
      setLockedNotice(
        item.lockedReason ??
          `Complete the previous lesson first (or score ${GOOD_EQ_SCORE_THRESHOLD}+ on the EQ Assessment to unlock all).`
      );
      return;
    }
    setLockedNotice(null);
    router.push(`/learning-detail?id=${encodeURIComponent(item.episode.routeId)}`);
  };

  const renderLessonCard = (item: SequencedEpisode) => {
    const { episode, guide, sequenceNumber, completed, unlocked, isCurrentNext } = item;
    const isLocked = !unlocked;
    const dimTitle =
      episode.eqType === 'B2B' ? guide.title : DIMENSION_INFO[episode.dimension]?.name ?? guide.title;

    return (
      <View
        key={episode.episodeKey}
        style={[
          styles.cardCell,
          isDesktop && styles.cardCellDesktop,
        ]}
      >
        <GlassCard
          onPress={() => handleOpenEpisode(item)}
          style={[
            styles.lessonCard,
            isLocked && { opacity: 0.65 },
            isCurrentNext && !completed && { borderColor: colors.primary },
          ]}
        >
          {/* Minimal header row: step/icon + competency */}
          <View style={styles.cardTopRow}>
            <View style={styles.stepRow}>
              <View
                style={[
                  styles.stepBadge,
                  {
                    backgroundColor: completed
                      ? colors.success + '14'
                      : unlocked
                        ? colors.primary + '14'
                        : colors.surface,
                  },
                ]}
              >
                {completed ? (
                  <Ionicons name="checkmark" size={14} color={colors.success} />
                ) : isLocked ? (
                  <Ionicons name="lock-closed" size={12} color={colors.textMuted} />
                ) : (
                  <Text style={[styles.stepNumText, { color: colors.primary }]}>
                    {sequenceNumber}
                  </Text>
                )}
              </View>
              <Text style={[styles.competencyLabel, { color: colors.textMuted }]} numberOfLines={1}>
                {dimTitle}
              </Text>
            </View>

            <Ionicons
              name={completed ? 'checkmark-circle' : isLocked ? 'lock-closed-outline' : 'chevron-forward'}
              size={17}
              color={completed ? colors.success : isLocked ? colors.textLight : colors.textMuted}
            />
          </View>

          <Text style={[styles.lessonTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {episode.title}
          </Text>
          <Text style={[styles.lessonSummary, { color: colors.textSecondary }]} numberOfLines={2}>
            {episode.shortContent || guide.shortSummary}
          </Text>

          {item.progressPct > 0 && !completed ? (
            <View style={styles.inlineProg}>
              <ProgressBar value={item.progressPct} height={4} />
            </View>
          ) : null}

          {/* Clean icon-only media indicators */}
          <View style={styles.cardFooter}>
            <View style={styles.iconRow}>
              <Ionicons name="book-outline" size={14} color={colors.textMuted} />
              {episode.videoUrl ? (
                <Ionicons
                  name={item.videoCompleted ? 'videocam' : 'videocam-outline'}
                  size={14}
                  color={item.videoCompleted ? colors.success : colors.textMuted}
                />
              ) : null}
              {episode.audioUrl ? (
                <Ionicons
                  name={item.audioCompleted ? 'headset' : 'headset-outline'}
                  size={14}
                  color={item.audioCompleted ? colors.success : colors.textMuted}
                />
              ) : null}
            </View>
            {isCurrentNext && !completed ? (
              <Text style={[styles.upNextText, { color: colors.primary }]}>Up next</Text>
            ) : null}
          </View>
        </GlassCard>
      </View>
    );
  };

  const isFreeBrowse = sequenced.accessMode === 'free_browse';

  return (
    <GlassBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.inner, isDesktop && styles.innerDesktop]}>
          {!isDesktop ? (
            <View style={styles.mobileTopBar}>
              <TouchableOpacity onPress={() => router.replace('/(tabs)/home')} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.mobileHeaderTitle, { color: colors.textPrimary }]}>Curriculum</Text>
              <View style={{ width: 34 }} />
            </View>
          ) : null}

          {/* Clean Header */}
          <View style={styles.pageHeaderRow}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.pageTitle, isDesktop && styles.pageTitleDesktop, { color: colors.textPrimary }]}>
                Curriculum
              </Text>
              <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>
                {sequenced.completedCount} of {sequenced.totalCount} completed ·{' '}
                {isFreeBrowse ? 'Free browse' : 'Guided sequence'}
              </Text>
            </View>

            <View style={[styles.trackSwitch, { backgroundColor: colors.surface }]}>
              {(['B2B', 'B2C'] as const).map((track) => {
                const active = audience === track;
                return (
                  <TouchableOpacity
                    key={track}
                    onPress={() => {
                      setAudience(track);
                      setSelectedDomain('all');
                      setLockedNotice(null);
                    }}
                    style={[
                      styles.trackBtn,
                      active && {
                        backgroundColor: colors.floating,
                        shadowColor: '#000',
                        shadowOpacity: 0.05,
                        shadowRadius: 3,
                        elevation: 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.trackBtnText,
                        { color: active ? colors.textPrimary : colors.textMuted },
                      ]}
                    >
                      {track === 'B2B' ? 'Competencies' : 'Foundations'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Compact Progress Strip */}
          <GlassCard style={styles.summaryStrip}>
            <View style={styles.summaryRow}>
              <View style={{ flex: 1, gap: 8 }}>
                <ProgressBar value={sequenced.completionRatePct} height={6} />
                <Text style={[styles.summaryMeta, { color: colors.textSecondary }]}>
                  {latestEqScore !== null
                    ? `EQ Score ${latestEqScore}/100`
                    : `Take the Baseline EQ Test (${GOOD_EQ_SCORE_THRESHOLD}+ unlocks all)`}
                </Text>
              </View>
              {sequenced.nextUnlockedRouteId ? (
                <Button
                  title={sequenced.completedCount > 0 ? 'Continue' : 'Start'}
                  icon="play"
                  size="sm"
                  onPress={() =>
                    router.push(
                      `/learning-detail?id=${encodeURIComponent(sequenced.nextUnlockedRouteId!)}`
                    )
                  }
                />
              ) : null}
            </View>
          </GlassCard>

          {lockedNotice ? (
            <GlassCard style={[styles.noticeCard, { borderColor: colors.warning + '55', backgroundColor: colors.warning + '10' }]}>
              <View style={styles.noticeRow}>
                <Ionicons name="lock-closed" size={16} color={colors.warning} />
                <Text style={[styles.noticeText, { color: colors.textPrimary }]}>{lockedNotice}</Text>
                <TouchableOpacity onPress={() => setLockedNotice(null)}>
                  <Ionicons name="close" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </GlassCard>
          ) : null}

          {error ? (
            <GlassCard style={styles.noticeCard}>
              <View style={styles.noticeRow}>
                <Text style={[styles.noticeText, { color: colors.destructive }]}>{error}</Text>
                <Button title="Retry" size="sm" variant="outline" onPress={reload} />
              </View>
            </GlassCard>
          ) : null}

          {/* Clean Domain Filter Pills */}
          {audience === 'B2B' ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              <TouchableOpacity
                onPress={() => setSelectedDomain('all')}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: selectedDomain === 'all' ? colors.textPrimary : colors.floating,
                    borderColor: selectedDomain === 'all' ? colors.textPrimary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: selectedDomain === 'all' ? colors.background : colors.textSecondary },
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              {B2B_DOMAIN_ORDER.map((domKey) => {
                const active = selectedDomain === domKey;
                return (
                  <TouchableOpacity
                    key={domKey}
                    onPress={() => setSelectedDomain(domKey)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: active ? colors.textPrimary : colors.floating,
                        borderColor: active ? colors.textPrimary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: active ? colors.background : colors.textSecondary },
                      ]}
                    >
                      {B2B_DOMAIN_LABELS[domKey]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}

          {/* Lesson Cards */}
          {audience === 'B2B' ? (
            <View style={styles.domainsStack}>
              {domainGroups.map((group) => (
                <View key={group.domainKey} style={styles.domainSection}>
                  <View style={styles.domainHeader}>
                    <Text style={[styles.domainTitle, { color: colors.textPrimary }]}>
                      {group.label}
                    </Text>
                    <Text style={[styles.domainCount, { color: colors.textMuted }]}>
                      {group.items.filter((x) => x.completed).length}/{group.items.length}
                    </Text>
                  </View>
                  <View style={[styles.cardsGrid, isDesktop && styles.cardsGridDesktop]}>
                    {group.items.map(renderLessonCard)}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.cardsGrid, isDesktop && styles.cardsGridDesktop]}>
              {filteredItems.map(renderLessonCard)}
            </View>
          )}
        </View>
      </ScrollView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 120,
  },
  scrollContentDesktop: {
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing['2xl'],
    paddingBottom: 72,
  },
  inner: { width: '100%', alignSelf: 'center', gap: 24 },
  innerDesktop: { maxWidth: 1080, gap: 28 },
  mobileTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  backBtn: { padding: 6 },
  mobileHeaderTitle: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: Typography.fontFamily.heading,
  },
  pageHeaderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.7,
    fontFamily: Typography.fontFamily.heading,
  },
  pageTitleDesktop: {
    fontSize: 34,
    letterSpacing: -0.9,
  },
  pageSubtitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.primary,
  },
  trackSwitch: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: Radius.lg,
    gap: 4,
  },
  trackBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.md,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : undefined),
  },
  trackBtnText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Typography.fontFamily.primary,
  },
  summaryStrip: {
    padding: 18,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.lg,
  },
  summaryMeta: {
    fontSize: 12,
    fontWeight: '500',
  },
  noticeCard: {
    padding: 16,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    fontFamily: Typography.fontFamily.primary,
  },
  filterRow: {
    gap: 10,
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : undefined),
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Typography.fontFamily.primary,
  },
  domainsStack: {
    gap: 32,
  },
  domainSection: {
    gap: 14,
  },
  domainHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  domainTitle: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
    fontFamily: Typography.fontFamily.heading,
  },
  domainCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  cardsGrid: {
    gap: 16,
  },
  cardsGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },
  cardCell: {
    width: '100%',
  },
  cardCellDesktop: {
    width: '48.8%',
  },
  lessonCard: {
    height: '100%',
    padding: 20,
    gap: 8,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Typography.fontFamily.primary,
  },
  competencyLabel: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    fontFamily: Typography.fontFamily.primary,
  },
  lessonTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.25,
    fontFamily: Typography.fontFamily.heading,
  },
  lessonSummary: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
    fontFamily: Typography.fontFamily.primary,
  },
  inlineProg: {
    marginBottom: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingTop: 6,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  upNextText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
