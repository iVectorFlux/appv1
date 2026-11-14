/**
 * Learn EQ - Enterprise Instructional Design & Adaptive Curriculum
 *
 * - Ordered strictly across 4 Domains -> 12 Competencies:
 *   1. Self-Awareness: Emotional Self-Awareness
 *   2. Self-Management: Emotional Balance -> Positive Outlook -> Adaptability -> Achievement Orientation
 *   3. Social Awareness: Empathy -> Organizational Awareness
 *   4. Relationship Management: Influence -> Coach & Mentor -> Conflict Management -> Teamwork -> Inspirational Leadership
 * - Score >= 65 on Full EQ Test unlocks Free Browse across all modules.
 * - Score < 65 (or no test yet) enforces Guided Sequential progression until each prior lesson completes.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import { GlassBackground } from '@/components/ui/glass-background';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Badge, ProgressBar } from '@/components/ui/shadcn-primitives';
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
  formatPlaybackSeconds,
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
  const { episodes, loading, error, reload } = useLearningCatalog(audience);
  const [selectedDomain, setSelectedDomain] = useState<B2BDomainKey | 'all'>('all');
  const [progressByKey, setProgressByKey] = useState<Record<string, LearningContentProgressRow>>({});
  const [latestEqScore, setLatestEqScore] = useState<number | null>(null);
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);
  const [viewOverride, setViewOverride] = useState<'free' | 'guided'>('free');

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
      // Non-fatal; fallback keeps sequential defaults cleanly
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      void loadLearnerState();
    }, [loadLearnerState])
  );

  const sequenced = useMemo(() => {
    const rawList = loading ? [] : episodes;
    return buildSequencedCatalog(rawList, progressByKey, latestEqScore);
  }, [loading, episodes, progressByKey, latestEqScore]);

  const filteredItems = useMemo(() => {
    if (audience !== 'B2B' || selectedDomain === 'all') return sequenced.items;
    return sequenced.items.filter(
      (item) => normalizeB2bCatalogKey(item.episode.domain) === selectedDomain
    );
  }, [audience, sequenced.items, selectedDomain]);

  // Group into domains when showing B2B curriculum
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
          `Complete the previous lesson first (or score ${GOOD_EQ_SCORE_THRESHOLD}+ on the Full EQ Test for Free Browse).`
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
            isLocked && { opacity: 0.72 },
            isCurrentNext && !completed && { borderColor: colors.primary },
          ]}
        >
          {/* Card top bar: sequence step + status badge */}
          <View style={styles.cardTopRow}>
            <View style={styles.stepPillRow}>
              <View
                style={[
                  styles.stepNumCircle,
                  {
                    backgroundColor: completed
                      ? colors.success + '18'
                      : unlocked
                        ? colors.primary + '18'
                        : colors.surface,
                  },
                ]}
              >
                {completed ? (
                  <Ionicons name="checkmark" size={14} color={colors.success} />
                ) : isLocked ? (
                  <Ionicons name="lock-closed" size={13} color={colors.textMuted} />
                ) : (
                  <Text style={[styles.stepNumText, { color: colors.primary }]}>
                    {sequenceNumber}
                  </Text>
                )}
              </View>
              <Text style={[styles.competencyLabel, { color: colors.primary }]} numberOfLines={1}>
                {dimTitle}
              </Text>
            </View>

            {completed ? (
              <Badge label="Completed" variant="success" icon="checkmark-circle-outline" />
            ) : isLocked ? (
              <Badge label="Locked" variant="outline" icon="lock-closed-outline" />
            ) : isCurrentNext ? (
              <Badge label="Up Next" variant="default" icon="play-circle-outline" />
            ) : (
              <Badge label="Available" variant="secondary" />
            )}
          </View>

          <Text style={[styles.lessonTitle, { color: colors.textPrimary }]} numberOfLines={2}>
            {episode.title}
          </Text>
          <Text style={[styles.lessonSummary, { color: colors.textSecondary }]} numberOfLines={3}>
            {episode.shortContent || guide.shortSummary}
          </Text>

          {/* Progress bar if started */}
          {item.progressPct > 0 && !completed ? (
            <View style={styles.inlineProg}>
              <ProgressBar value={item.progressPct} height={5} />
              <Text style={[styles.inlineProgText, { color: colors.textMuted }]}>
                {item.progressPct}% viewed
              </Text>
            </View>
          ) : null}

          {/* Media & Reading metadata footer */}
          <View style={styles.cardFooter}>
            <View style={styles.metaPills}>
              <View style={[styles.metaChip, { backgroundColor: colors.surface }]}>
                <Ionicons name="document-text-outline" size={12} color={colors.textSecondary} />
                <Text style={[styles.metaChipText, { color: colors.textSecondary }]}>
                  {episode.estimatedReadMinutes ?? guide.estimatedReadMinutes}m brief
                </Text>
              </View>
              {episode.videoUrl ? (
                <View style={[styles.metaChip, { backgroundColor: colors.surface }]}>
                  <Ionicons
                    name={item.videoCompleted ? 'checkmark-circle' : 'videocam-outline'}
                    size={12}
                    color={item.videoCompleted ? colors.success : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.metaChipText,
                      { color: item.videoCompleted ? colors.success : colors.textSecondary },
                    ]}
                  >
                    Video{!item.videoCompleted && item.videoPositionSeconds >= 3 ? ` · ${formatPlaybackSeconds(item.videoPositionSeconds)}` : ''}
                  </Text>
                </View>
              ) : null}
              {episode.audioUrl ? (
                <View style={[styles.metaChip, { backgroundColor: colors.surface }]}>
                  <Ionicons
                    name={item.audioCompleted ? 'checkmark-circle' : 'headset-outline'}
                    size={12}
                    color={item.audioCompleted ? colors.success : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.metaChipText,
                      { color: item.audioCompleted ? colors.success : colors.textSecondary },
                    ]}
                  >
                    Audio{!item.audioCompleted && item.audioPositionSeconds >= 3 ? ` · ${formatPlaybackSeconds(item.audioPositionSeconds)}` : ''}
                  </Text>
                </View>
              ) : null}
            </View>

            <Ionicons
              name={isLocked ? 'lock-closed-outline' : 'arrow-forward'}
              size={16}
              color={isLocked ? colors.textLight : colors.primary}
            />
          </View>

          {isLocked && item.lockedReason ? (
            <Text style={[styles.lockedHint, { color: colors.textMuted }]} numberOfLines={2}>
              {item.lockedReason}
            </Text>
          ) : null}
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
          {/* Mobile top header bar if narrow */}
          {!isDesktop ? (
            <View style={styles.mobileTopBar}>
              <TouchableOpacity onPress={() => router.replace('/(tabs)/home')} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.mobileHeaderTitle, { color: colors.textPrimary }]}>Learn EQ</Text>
              <View style={{ width: 36 }} />
            </View>
          ) : null}

          {/* Page Title Row */}
          <View style={styles.pageHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
                Emotional Intelligence Curriculum
              </Text>
              <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
                Structured 4-domain instructional design with first-principles briefs, video lessons, and audio deep dives.
              </Text>
            </View>
            <View style={styles.trackSwitch}>
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
                      {
                        backgroundColor: active ? colors.primary : colors.floating,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.trackBtnText,
                        { color: active ? '#FFFFFF' : colors.textSecondary },
                      ]}
                    >
                      {track === 'B2B' ? '12 Competencies' : 'Foundations'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Adaptive Pathway Status Card */}
          <GlassCard style={styles.pathwayCard}>
            <View style={[styles.pathwayGrid, isDesktop && styles.pathwayGridDesktop]}>
              <View style={{ flex: 1, gap: 6 }}>
                <View style={styles.pathwayBadgeRow}>
                  {isFreeBrowse ? (
                    <Badge
                      label={`EQ Score ${latestEqScore} · Free Browse Unlocked`}
                      variant="success"
                      icon="lock-open-outline"
                    />
                  ) : latestEqScore !== null ? (
                    <Badge
                      label={`EQ Score ${latestEqScore} · Guided Sequential Path`}
                      variant="warning"
                      icon="trail-sign-outline"
                    />
                  ) : (
                    <Badge
                      label="No EQ Assessment Yet · Guided Sequential Path"
                      variant="default"
                      icon="compass-outline"
                    />
                  )}
                  <Badge
                    label={`${sequenced.completedCount}/${sequenced.totalCount} Completed`}
                    variant="secondary"
                  />
                </View>

                <Text style={[styles.pathwayHeadline, { color: colors.textPrimary }]}>
                  {isFreeBrowse
                    ? 'Self-paced exploration across all competencies'
                    : 'Step-by-step mastery sequence active'}
                </Text>
                <Text style={[styles.pathwayDesc, { color: colors.textSecondary }]}>
                  {isFreeBrowse
                    ? `Because you scored ${latestEqScore} (>= ${GOOD_EQ_SCORE_THRESHOLD}) on the Full EQ Test, you can open any domain or lesson in any order—or follow the recommended curriculum sequence.`
                    : `Each lesson unlocks after you finish the previous step in sequence. Score ${GOOD_EQ_SCORE_THRESHOLD}+ on the Full EQ Assessment anytime to unlock free browsing across all courses.`}
                </Text>

                <View style={styles.pathwayProgressWrap}>
                  <ProgressBar value={sequenced.completionRatePct} height={7} />
                  <Text style={[styles.pathwayPct, { color: colors.textMuted }]}>
                    {sequenced.completionRatePct}% complete
                  </Text>
                </View>
              </View>

              <View style={styles.pathwayActions}>
                {sequenced.nextUnlockedRouteId ? (
                  <Button
                    title={sequenced.completedCount > 0 ? 'Continue Next Lesson' : 'Start Lesson 1'}
                    icon="play-outline"
                    size="md"
                    onPress={() =>
                      router.push(
                        `/learning-detail?id=${encodeURIComponent(sequenced.nextUnlockedRouteId!)}`
                      )
                    }
                  />
                ) : null}
                <Button
                  title={latestEqScore !== null ? 'Retake EQ Test' : 'Take Full EQ Test'}
                  variant="outline"
                  size="md"
                  icon="analytics-outline"
                  onPress={() => router.push('/full-eq-test')}
                />
                {isFreeBrowse ? (
                  <View style={styles.browseModeRow}>
                    <TouchableOpacity
                      onPress={() => setViewOverride('free')}
                      style={[
                        styles.modeMiniBtn,
                        {
                          backgroundColor: viewOverride === 'free' ? colors.surfaceAccent : colors.surface,
                          borderColor: viewOverride === 'free' ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.modeMiniText,
                          { color: viewOverride === 'free' ? colors.primary : colors.textSecondary },
                        ]}
                      >
                        Free Browse
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setViewOverride('guided')}
                      style={[
                        styles.modeMiniBtn,
                        {
                          backgroundColor: viewOverride === 'guided' ? colors.surfaceAccent : colors.surface,
                          borderColor: viewOverride === 'guided' ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.modeMiniText,
                          { color: viewOverride === 'guided' ? colors.primary : colors.textSecondary },
                        ]}
                      >
                        Ordered Path
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            </View>
          </GlassCard>

          {lockedNotice ? (
            <GlassCard style={[styles.noticeCard, { borderColor: colors.warning + '55', backgroundColor: colors.warning + '10' }]}>
              <View style={styles.noticeRow}>
                <Ionicons name="lock-closed" size={18} color={colors.warning} />
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

          {/* Domain filter pills for B2B */}
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
                    backgroundColor: selectedDomain === 'all' ? colors.primary : colors.floating,
                    borderColor: selectedDomain === 'all' ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: selectedDomain === 'all' ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  All Domains (12 Competencies)
                </Text>
              </TouchableOpacity>
              {B2B_DOMAIN_ORDER.map((domKey, i) => {
                const active = selectedDomain === domKey;
                return (
                  <TouchableOpacity
                    key={domKey}
                    onPress={() => setSelectedDomain(domKey)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: active ? colors.primary : colors.floating,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: active ? '#FFFFFF' : colors.textSecondary },
                      ]}
                    >
                      {`${i + 1}. ${B2B_DOMAIN_LABELS[domKey]}`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                Loading EQ curriculum…
              </Text>
            </View>
          ) : audience === 'B2B' ? (
            <View style={styles.domainsStack}>
              {domainGroups.map((group) => (
                <View key={group.domainKey} style={styles.domainSection}>
                  <View style={styles.domainHeader}>
                    <Text style={[styles.domainTitle, { color: colors.textPrimary }]}>
                      {group.label}
                    </Text>
                    <Badge
                      label={`${group.items.filter((x) => x.completed).length}/${group.items.length} done`}
                      variant="secondary"
                    />
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
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: 110,
  },
  scrollContentDesktop: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: 60,
  },
  inner: { width: '100%', alignSelf: 'center', gap: Spacing.md },
  innerDesktop: { maxWidth: 1200 },
  mobileTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  backBtn: { padding: 6 },
  mobileHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Typography.fontFamily.heading,
  },
  pageHeaderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    fontFamily: Typography.fontFamily.heading,
  },
  pageSubtitle: {
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
    maxWidth: 680,
    fontFamily: Typography.fontFamily.primary,
  },
  trackSwitch: {
    flexDirection: 'row',
    gap: 8,
  },
  trackBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : undefined),
  },
  trackBtnText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Typography.fontFamily.primary,
  },
  pathwayCard: {},
  pathwayGrid: { gap: Spacing.md },
  pathwayGridDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xl,
  },
  pathwayBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pathwayHeadline: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: Typography.fontFamily.heading,
  },
  pathwayDesc: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: Typography.fontFamily.primary,
  },
  pathwayProgressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  pathwayPct: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 85,
    fontFamily: Typography.fontFamily.primary,
  },
  pathwayActions: {
    gap: 8,
    minWidth: 210,
  },
  browseModeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  modeMiniBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  modeMiniText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Typography.fontFamily.primary,
  },
  noticeCard: {},
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
    gap: 8,
    paddingVertical: 4,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : undefined),
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Typography.fontFamily.primary,
  },
  loadingWrap: {
    paddingVertical: 56,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.primary,
  },
  domainsStack: {
    gap: Spacing.xl,
    marginTop: 4,
  },
  domainSection: {
    gap: 12,
  },
  domainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  domainTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    fontFamily: Typography.fontFamily.heading,
  },
  cardsGrid: {
    gap: 12,
  },
  cardsGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  cardCell: {
    width: '100%',
  },
  cardCellDesktop: {
    width: '48.8%',
  },
  lessonCard: {
    height: '100%',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  stepPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  stepNumCircle: {
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
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    flex: 1,
    fontFamily: Typography.fontFamily.primary,
  },
  lessonTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 6,
    fontFamily: Typography.fontFamily.heading,
  },
  lessonSummary: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
    fontFamily: Typography.fontFamily.primary,
  },
  inlineProg: {
    gap: 4,
    marginBottom: 10,
  },
  inlineProgText: {
    fontSize: 11,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingTop: 4,
  },
  metaPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  lockedHint: {
    fontSize: 11,
    marginTop: 8,
    fontStyle: 'italic',
  },
});
