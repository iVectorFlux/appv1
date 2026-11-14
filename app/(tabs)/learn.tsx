/**
 * Learn EQ — Clean, Color-Graded Curriculum Browser
 *
 * Distinct domain gradients, refined mobile-first typography scale,
 * genuine internal card spacing, and clean icon-only media indicators.
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
import { LinearGradient } from 'expo-linear-gradient';
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

type GradientPair = readonly [string, string];

const DOMAIN_GRADIENTS: Record<
  B2BDomainKey,
  { accent: GradientPair; washLight: GradientPair; washDark: GradientPair }
> = {
  SELF_AWARENESS_DOMAIN: {
    accent: ['#2563EB', '#4F46E5'],
    washLight: ['#FFFFFF', '#F5F8FF'],
    washDark: ['#18181B', '#172554'],
  },
  SELF_MANAGEMENT_DOMAIN: {
    accent: ['#059669', '#0D9488'],
    washLight: ['#FFFFFF', '#F0FDF9'],
    washDark: ['#18181B', '#064E3B'],
  },
  SOCIAL_AWARENESS_DOMAIN: {
    accent: ['#7C3AED', '#C026D3'],
    washLight: ['#FFFFFF', '#FAF5FF'],
    washDark: ['#18181B', '#2E1065'],
  },
  RELATIONSHIP_MANAGEMENT_DOMAIN: {
    accent: ['#EA580C', '#E11D48'],
    washLight: ['#FFFFFF', '#FFF7ED'],
    washDark: ['#18181B', '#451A03'],
  },
};

export default function LearnScreen() {
  const router = useRouter();
  const colors = useColors();
  const isDark = colors.glassTint === 'dark';
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
    const domKey = normalizeB2bCatalogKey(episode.domain) as B2BDomainKey;
    const palette = DOMAIN_GRADIENTS[domKey] ?? DOMAIN_GRADIENTS.SELF_AWARENESS_DOMAIN;

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
          gradientColors={
            isLocked
              ? undefined
              : isDark
                ? palette.washDark
                : palette.washLight
          }
          borderColor={
            isCurrentNext && !completed
              ? palette.accent[0]
              : undefined
          }
          style={[
            styles.lessonCard,
            isDesktop && styles.lessonCardDesktop,
            isLocked && { opacity: 0.65 },
          ]}
        >
          {/* Minimal header row: step gradient badge + competency */}
          <View style={styles.cardTopRow}>
            <View style={styles.stepRow}>
              {completed ? (
                <LinearGradient
                  colors={['#10B981', '#0D9488']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.stepBadge}
                >
                  <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                </LinearGradient>
              ) : isLocked ? (
                <View style={[styles.stepBadge, { backgroundColor: colors.surface }]}>
                  <Ionicons name="lock-closed" size={11} color={colors.textMuted} />
                </View>
              ) : (
                <LinearGradient
                  colors={palette.accent}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.stepBadge}
                >
                  <Text style={styles.stepNumText}>{sequenceNumber}</Text>
                </LinearGradient>
              )}
              <Text style={[styles.competencyLabel, { color: colors.textMuted }]} numberOfLines={1}>
                {dimTitle}
              </Text>
            </View>

            <Ionicons
              name={completed ? 'checkmark-circle' : isLocked ? 'lock-closed-outline' : 'chevron-forward'}
              size={16}
              color={completed ? colors.success : isLocked ? colors.textLight : colors.textMuted}
            />
          </View>

          <View style={styles.cardCopyBlock}>
            <Text
              style={[
                styles.lessonTitle,
                isDesktop && styles.lessonTitleDesktop,
                { color: colors.textPrimary },
              ]}
              numberOfLines={1}
            >
              {episode.title}
            </Text>
            <Text
              style={[
                styles.lessonSummary,
                isDesktop && styles.lessonSummaryDesktop,
                { color: colors.textSecondary },
              ]}
              numberOfLines={2}
            >
              {episode.shortContent || guide.shortSummary}
            </Text>
          </View>

          {item.progressPct > 0 && !completed ? (
            <ProgressBar value={item.progressPct} height={4} gradientColors={palette.accent} />
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
              <LinearGradient
                colors={palette.accent}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.upNextPill}
              >
                <Text style={styles.upNextText}>Up next</Text>
              </LinearGradient>
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
                <Ionicons name="chevron-back" size={21} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.mobileHeaderTitle, { color: colors.textPrimary }]}>Curriculum</Text>
              <View style={{ width: 32 }} />
            </View>
          ) : null}

          {/* Header */}
          <View style={styles.pageHeaderRow}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.pageTitle, isDesktop && styles.pageTitleDesktop, { color: colors.textPrimary }]}>
                Curriculum
              </Text>
              <Text style={[styles.pageSubtitle, isDesktop && styles.pageSubtitleDesktop, { color: colors.textMuted }]}>
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

          {/* Gradient Progress Strip */}
          <GlassCard
            style={[styles.summaryStrip, isDesktop && styles.summaryStripDesktop]}
            gradientColors={
              isDark ? ['#172554', '#1E1B4B'] : ['#EFF6FF', '#F5F3FF', '#FFFFFF']
            }
            borderColor={isDark ? 'rgba(99,102,241,0.3)' : 'rgba(79,70,229,0.18)'}
          >
            <View style={styles.summaryRow}>
              <View style={{ flex: 1, gap: 8 }}>
                <ProgressBar
                  value={sequenced.completionRatePct}
                  height={6}
                  gradientColors={['#2563EB', '#6366F1', '#0D9488']}
                />
                <Text style={[styles.summaryMeta, { color: colors.textSecondary }]}>
                  {latestEqScore !== null
                    ? `EQ Score ${latestEqScore}/100`
                    : `Score ${GOOD_EQ_SCORE_THRESHOLD}+ on the EQ Test to unlock all`}
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

          {/* Gradient Domain Filter Pills */}
          {audience === 'B2B' ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              <TouchableOpacity
                onPress={() => setSelectedDomain('all')}
                activeOpacity={0.8}
                style={[
                  styles.filterChip,
                  {
                    overflow: 'hidden',
                    backgroundColor: selectedDomain === 'all' ? 'transparent' : colors.floating,
                    borderColor: selectedDomain === 'all' ? 'transparent' : colors.border,
                  },
                ]}
              >
                {selectedDomain === 'all' ? (
                  <LinearGradient
                    colors={['#2563EB', '#4F46E5']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                ) : null}
                <Text
                  style={[
                    styles.filterChipText,
                    { color: selectedDomain === 'all' ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              {B2B_DOMAIN_ORDER.map((domKey) => {
                const active = selectedDomain === domKey;
                const domPalette = DOMAIN_GRADIENTS[domKey];
                return (
                  <TouchableOpacity
                    key={domKey}
                    onPress={() => setSelectedDomain(domKey)}
                    activeOpacity={0.8}
                    style={[
                      styles.filterChip,
                      {
                        overflow: 'hidden',
                        backgroundColor: active ? 'transparent' : colors.floating,
                        borderColor: active ? 'transparent' : colors.border,
                      },
                    ]}
                  >
                    {active ? (
                      <LinearGradient
                        colors={domPalette.accent}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                    ) : null}
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: active ? '#FFFFFF' : colors.textSecondary },
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
              {domainGroups.map((group) => {
                const palette = DOMAIN_GRADIENTS[group.domainKey] ?? DOMAIN_GRADIENTS.SELF_AWARENESS_DOMAIN;
                return (
                  <View key={group.domainKey} style={styles.domainSection}>
                    <View style={styles.domainHeader}>
                      <View style={styles.domainTitleRow}>
                        <LinearGradient
                          colors={palette.accent}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.domainDot}
                        />
                        <Text
                          style={[
                            styles.domainTitle,
                            isDesktop && styles.domainTitleDesktop,
                            { color: colors.textPrimary },
                          ]}
                        >
                          {group.label}
                        </Text>
                      </View>
                      <Text style={[styles.domainCount, { color: colors.textMuted }]}>
                        {group.items.filter((x) => x.completed).length}/{group.items.length}
                      </Text>
                    </View>
                    <View style={[styles.cardsGrid, isDesktop && styles.cardsGridDesktop]}>
                      {group.items.map(renderLessonCard)}
                    </View>
                  </View>
                );
              })}
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
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'ios' ? 50 : Spacing.md,
    paddingBottom: 112,
  },
  scrollContentDesktop: {
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing['2xl'],
    paddingBottom: 72,
  },
  inner: { width: '100%', alignSelf: 'center', gap: 20 },
  innerDesktop: { maxWidth: 1080, gap: 28 },
  mobileTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  backBtn: { padding: 6 },
  mobileHeaderTitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Typography.fontFamily.heading,
  },
  pageHeaderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  pageTitle: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '700',
    letterSpacing: -0.4,
    fontFamily: Typography.fontFamily.heading,
  },
  pageTitleDesktop: {
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.8,
  },
  pageSubtitle: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.primary,
  },
  pageSubtitleDesktop: {
    fontSize: 14,
  },
  trackSwitch: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: Radius.lg,
    gap: 4,
  },
  trackBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.md,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : undefined),
  },
  trackBtnText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Typography.fontFamily.primary,
  },
  summaryStrip: {
    padding: 16,
  },
  summaryStripDesktop: {
    padding: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  summaryMeta: {
    fontSize: 12,
    fontWeight: '500',
  },
  noticeCard: {
    padding: 14,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  noticeText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '500',
    fontFamily: Typography.fontFamily.primary,
  },
  filterRow: {
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : undefined),
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Typography.fontFamily.primary,
  },
  domainsStack: {
    gap: 28,
  },
  domainSection: {
    gap: 12,
  },
  domainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  domainTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  domainDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  domainTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    fontFamily: Typography.fontFamily.heading,
  },
  domainTitleDesktop: {
    fontSize: 18,
    letterSpacing: -0.35,
  },
  domainCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardsGrid: {
    gap: 12,
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
    padding: 16,
    gap: 12,
  },
  lessonCardDesktop: {
    padding: 20,
    gap: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flex: 1,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Typography.fontFamily.primary,
  },
  competencyLabel: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    fontFamily: Typography.fontFamily.primary,
  },
  cardCopyBlock: {
    gap: 5,
  },
  lessonTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: -0.2,
    fontFamily: Typography.fontFamily.heading,
  },
  lessonTitleDesktop: {
    fontSize: 17,
    lineHeight: 23,
    letterSpacing: -0.3,
  },
  lessonSummary: {
    fontSize: 12.5,
    lineHeight: 18,
    fontFamily: Typography.fontFamily.primary,
  },
  lessonSummaryDesktop: {
    fontSize: 13.5,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingTop: 2,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  upNextPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  upNextText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
