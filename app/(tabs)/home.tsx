/**
 * Home - Enterprise Emotional Intelligence Dashboard
 *
 * - Responsive Shadcn-inspired Bento layout for desktop (>= 1024px) and mobile
 * - Adaptive Pathway Readiness Card showing EQ score, Free Browse vs Guided mode, and next lesson CTA
 * - Quick access to Learn EQ, AI Companion, Recover, Assessments, and Enterprise Admin (for admins)
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth-store';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import { GlassBackground } from '@/components/ui/glass-background';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Badge, ProgressBar, SectionHeading } from '@/components/ui/shadcn-primitives';
import { AddToHomeScreenBanner } from '@/components/web/add-to-home-screen-banner';
import { useWebLaptopLayout } from '@/hooks/useWebLaptopLayout';
import { useLearningCatalog } from '@/hooks/useLearningCatalog';
import { getEQScores } from '@/services/eq-storage';
import {
  fetchUserLearningContentProgress,
  type LearningContentProgressRow,
} from '@/services/learning-content-progress';
import {
  buildSequencedCatalog,
  GOOD_EQ_SCORE_THRESHOLD,
} from '@/services/learning-sequence';
import { buildHomeRecommendations } from '@/services/learning-recommendations';

interface PlatformAction {
  key: string;
  title: string;
  description: string;
  badge: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  route: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const colors = useColors();
  const isDesktop = useWebLaptopLayout();

  const { episodes } = useLearningCatalog('B2B');
  const [latestEqScore, setLatestEqScore] = useState<number | null>(null);
  const [latestDimensionScores, setLatestDimensionScores] = useState<Record<string, number> | null>(null);
  const [progressByKey, setProgressByKey] = useState<Record<string, LearningContentProgressRow>>({});

  const loadSnapshot = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [scores, progress] = await Promise.all([
        getEQScores(user.id),
        fetchUserLearningContentProgress(user.id),
      ]);
      const latest = scores.length > 0 ? scores[0]! : null;
      setLatestEqScore(latest ? Math.round(latest.overallScore) : null);
      setLatestDimensionScores(latest?.dimensionScores ?? null);
      setProgressByKey(progress);
    } catch {
      // Non-fatal fallback keeps UI interactive
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      void loadSnapshot();
    }, [loadSnapshot])
  );

  const sequenced = useMemo(
    () => buildSequencedCatalog(episodes, progressByKey, latestEqScore),
    [episodes, progressByKey, latestEqScore]
  );

  const homeFeed = useMemo(
    () => buildHomeRecommendations(sequenced, latestDimensionScores),
    [sequenced, latestDimensionScores]
  );

  const nextLesson = useMemo(() => {
    return (
      sequenced.items.find((item) => item.unlocked && !item.completed) ??
      sequenced.items[0] ??
      null
    );
  }, [sequenced.items]);

  const completionPct =
    sequenced.totalCount > 0
      ? Math.round((sequenced.completedCount / sequenced.totalCount) * 100)
      : 0;

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    const base = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    const rawName = user?.displayName?.trim() || user?.username;
    if (!rawName) return base;
    return `${base}, ${rawName.charAt(0).toUpperCase()}${rawName.slice(1)}`;
  }, [user?.displayName, user?.username]);

  const exploreActions = useMemo<PlatformAction[]>(() => {
    const base: PlatformAction[] = [
      {
        key: 'learn',
        title: 'Learn EQ Curriculum',
        description: '4 EI domains, 12 competencies, video lessons, audio briefings & first-principles guides.',
        badge: `${sequenced.completedCount}/${sequenced.totalCount || 24} done`,
        icon: 'library-outline',
        accent: colors.primary,
        route: '/(tabs)/learn',
      },
      {
        key: 'companion',
        title: 'AI EQ Companion',
        description: 'Coach through workplace situations, difficult conversations, and leadership decisions.',
        badge: 'Interactive Coach',
        icon: 'chatbubble-ellipses-outline',
        accent: colors.accentIndigo,
        route: '/(tabs)/companion',
      },
      {
        key: 'recover',
        title: 'Recover & Grounding',
        description: 'Guided somatic and breathing resets between high-stakes meetings.',
        badge: '3-5 min reset',
        icon: 'leaf-outline',
        accent: colors.success,
        route: '/grounding',
      },
    ];
    if (user?.role === 'admin') {
      base.push({
        key: 'admin',
        title: 'Enterprise Admin Analytics',
        description: 'Monitor employee video/audio completion, EQ baselines, and manage company admins.',
        badge: 'Admin Only',
        icon: 'shield-checkmark-outline',
        accent: colors.warning,
        route: '/admin',
      });
    }
    return base;
  }, [colors, sequenced.completedCount, sequenced.totalCount, user?.role]);

  const assessmentActions = useMemo(
    () => [
      {
        key: 'full-eq',
        title: 'Full EQ Assessment',
        subtitle: 'Comprehensive 12-competency baseline · unlocks adaptive pathway',
        icon: 'analytics-outline' as const,
        accent: colors.primary,
        route: '/full-eq-test',
        cta: latestEqScore !== null ? 'Retake Test' : 'Take Test',
      },
      {
        key: 'big5',
        title: 'Big Five Personality',
        subtitle: 'IPIP 50 OCEAN profile · saved directly to your enterprise progress',
        icon: 'color-wand-outline' as const,
        accent: colors.accentIndigo,
        route: '/big5-test',
        cta: 'Open Test',
      },
      {
        key: 'progress',
        title: 'My Progress & Reports',
        subtitle: 'EQ dimension radar, Big Five scores, and completed lessons history',
        icon: 'stats-chart-outline' as const,
        accent: colors.success,
        route: '/(tabs)/progress',
        cta: 'View Progress',
      },
    ],
    [colors, latestEqScore]
  );

  const st = createStyles(colors);

  const openNextLesson = () => {
    if (!nextLesson) {
      router.push('/(tabs)/learn');
      return;
    }
    router.push({
      pathname: '/learning-detail',
      params: { id: nextLesson.episode.routeId },
    });
  };

  return (
    <GlassBackground>
      <ScrollView
        style={st.scroll}
        contentContainerStyle={[st.content, isDesktop && st.contentDesktop]}
        showsVerticalScrollIndicator={false}
      >
        {Platform.OS === 'web' ? <AddToHomeScreenBanner /> : null}

        {/* Top Header */}
        <View style={st.headerRow}>
          <View style={{ flex: 1 }}>
            <View style={st.headerBadges}>
              <Badge
                label={user?.companyName ? user.companyName : 'Enterprise EQ Platform'}
                variant="outline"
                icon="business-outline"
              />
              {user?.role === 'admin' ? (
                <Badge label="Company Admin" variant="default" icon="shield-checkmark-outline" />
              ) : null}
            </View>
            <Text style={[st.greeting, isDesktop && st.greetingDesktop]}>{greeting}</Text>
            <Text style={st.tagline}>
              Structured Emotional Intelligence training, baseline assessments, and measurable leadership habits.
            </Text>
          </View>

          <View style={st.headerActions}>
            {user?.role === 'admin' ? (
              <Button
                title="Admin Console"
                size="sm"
                variant="outline"
                icon="analytics-outline"
                onPress={() => router.push('/admin')}
              />
            ) : null}
            {!isDesktop ? (
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/profile')}
                style={[st.profileBtn, { backgroundColor: colors.floating, borderColor: colors.border }]}
                activeOpacity={0.75}
                accessibilityLabel="Open profile"
              >
                <Ionicons name="person-outline" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Desktop Bento Row: Pathway Readiness + Curriculum Quick-Start */}
        <View style={[st.bentoRow, isDesktop && st.bentoRowDesktop]}>
          <GlassCard style={[st.heroCard, isDesktop && st.heroCardDesktop]}>
            <View style={st.heroTopRow}>
              <Badge
                label={
                  sequenced.accessMode === 'free_browse'
                    ? `Free Browse Unlocked (EQ ${latestEqScore}/100)`
                    : latestEqScore !== null
                    ? `Guided Sequential (EQ ${latestEqScore}/100)`
                    : 'Guided Sequential Pathway'
                }
                variant={sequenced.accessMode === 'free_browse' ? 'success' : 'warning'}
                icon={sequenced.accessMode === 'free_browse' ? 'lock-open-outline' : 'git-branch-outline'}
              />
              <Text style={st.eqBenchmarkText}>Benchmark: {GOOD_EQ_SCORE_THRESHOLD}+</Text>
            </View>

            <Text style={st.heroTitle}>
              {sequenced.accessMode === 'free_browse'
                ? 'Full Curriculum Access Enabled'
                : 'Your Guided EQ Mastery Path'}
            </Text>
            <Text style={st.heroDesc}>
              {sequenced.accessMode === 'free_browse'
                ? 'Your EQ score meets the leadership benchmark. Explore any domain freely across Self-Awareness, Self-Management, Social Awareness, and Relationship Management.'
                : latestEqScore !== null
                ? `Scores under ${GOOD_EQ_SCORE_THRESHOLD} follow structured step-by-step lessons so foundational Emotional Self-Awareness skills lock in before advanced modules.`
                : `Start lesson by lesson or take the Full EQ Assessment (${GOOD_EQ_SCORE_THRESHOLD}+ unlocks Free Browse across all 12 competencies).`}
            </Text>

            <View style={st.progressBlock}>
              <View style={st.progressRow}>
                <Text style={st.progressLabel}>Curriculum Progress</Text>
                <Text style={st.progressMetric}>
                  {sequenced.completedCount} / {sequenced.totalCount || 24} lessons ({completionPct}%)
                </Text>
              </View>
              <ProgressBar value={completionPct} height={8} />
            </View>

            <View style={st.heroActions}>
              <Button
                title={nextLesson ? `Continue: ${nextLesson.episode.competency}` : 'Open Learn EQ'}
                icon="play-circle-outline"
                onPress={openNextLesson}
              />
              {latestEqScore === null ? (
                <Button
                  title="Take Baseline EQ Test"
                  variant="outline"
                  icon="analytics-outline"
                  onPress={() => router.push('/full-eq-test')}
                />
              ) : (
                <Button
                  title="Browse All Modules"
                  variant="outline"
                  onPress={() => router.push('/(tabs)/learn')}
                />
              )}
            </View>
          </GlassCard>

          <GlassCard style={[st.eqMetricCard, isDesktop && st.eqMetricCardDesktop]}>
            <View style={st.eqHeader}>
              <Text style={st.eqLabel}>Latest EQ Score</Text>
              <View style={[st.eqIconCircle, { backgroundColor: colors.primary + '16' }]}>
                <Ionicons name="pulse-outline" size={18} color={colors.primary} />
              </View>
            </View>
            <Text style={st.eqBigValue}>
              {latestEqScore !== null ? latestEqScore : '—'}
              <Text style={st.eqOutOf}>{latestEqScore !== null ? ' / 100' : ''}</Text>
            </Text>
            <Text style={st.eqCaption}>
              {latestEqScore === null
                ? 'Complete the Full EQ Assessment to benchmark your 4 domains & 12 competencies.'
                : latestEqScore >= GOOD_EQ_SCORE_THRESHOLD
                ? 'Strong EQ baseline — all 12 competencies are unlocked for independent browsing.'
                : 'Sequential mode active — complete each video or audio lesson to unlock the next.'}
            </Text>
            <View style={st.eqFooter}>
              <Button
                title={latestEqScore !== null ? 'View EQ Report' : 'Start Assessment'}
                size="sm"
                variant="secondary"
                fullWidth
                onPress={() => router.push(latestEqScore !== null ? '/(tabs)/progress' : '/full-eq-test')}
              />
            </View>
          </GlassCard>
        </View>

        {/* Incomplete Lessons ("Complete This") */}
        {homeFeed.incompleteItems.length > 0 ? (
          <View style={st.sectionBlock}>
            <SectionHeading
              title="Complete This — Pick Up Where You Left Off"
              description="Your watch and listen timestamps are saved automatically so you can continue anytime or start over."
            />
            <View style={[st.cardsGrid, isDesktop && st.cardsGridDesktop]}>
              {homeFeed.incompleteItems.slice(0, 3).map((item) => (
                <GlassCard
                  key={`${item.episodeKey}-${item.kind}`}
                  style={[st.incompleteCard, isDesktop && st.featureCardDesktop, { borderColor: colors.warning + '55' }]}
                >
                  <View style={st.featureTop}>
                    <Badge
                      label={item.kind === 'video' ? 'Unfinished Video' : 'Unfinished Audio'}
                      variant="warning"
                      icon={item.kind === 'video' ? 'videocam-outline' : 'headset-outline'}
                    />
                    <Text style={[st.incompletePct, { color: colors.textPrimary }]}>{item.progressPct}%</Text>
                  </View>
                  <Text style={st.recCompetency}>{item.competency}</Text>
                  <Text style={st.cardTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={st.cardDesc}>{item.statusLabel}</Text>
                  <ProgressBar value={item.progressPct} height={6} color={colors.warning} />
                  <View style={st.incompleteActions}>
                    <Button
                      title={item.ctaLabel}
                      size="sm"
                      icon="play"
                      onPress={() =>
                        router.push(`/learning-detail?id=${encodeURIComponent(item.routeId)}&mode=${item.kind}`)
                      }
                    />
                    <Button
                      title="Start Over"
                      size="sm"
                      variant="outline"
                      icon="refresh"
                      onPress={() =>
                        router.push(
                          `/learning-detail?id=${encodeURIComponent(item.routeId)}&mode=${item.kind}&restart=1`
                        )
                      }
                    />
                  </View>
                </GlassCard>
              ))}
            </View>
          </View>
        ) : null}

        {/* Recommended Video, Reading & Audio on Login */}
        {homeFeed.recommendations.length > 0 ? (
          <View style={st.sectionBlock}>
            <SectionHeading
              title="Recommended for You"
              description="Curated Video, First-Principles Reading, and Audio recommendations tailored to your EQ progress."
            />
            <View style={[st.cardsGrid, isDesktop && st.cardsGridDesktop]}>
              {homeFeed.recommendations.map((rec) => {
                const iconName =
                  rec.type === 'video'
                    ? 'videocam-outline'
                    : rec.type === 'reading'
                      ? 'book-outline'
                      : 'headset-outline';
                const accent =
                  rec.type === 'video'
                    ? colors.primary
                    : rec.type === 'reading'
                      ? colors.accentIndigo
                      : colors.success;
                const badgeLabel =
                  rec.type === 'video'
                    ? 'Video Recommendation'
                    : rec.type === 'reading'
                      ? 'Reading Recommendation'
                      : 'Audio Recommendation';

                return (
                  <GlassCard
                    key={`${rec.type}-${rec.episodeKey}`}
                    onPress={() =>
                      router.push(`/learning-detail?id=${encodeURIComponent(rec.routeId)}&mode=${rec.type}`)
                    }
                    style={[st.featureCard, isDesktop && st.featureCardDesktop]}
                  >
                    <View style={st.featureTop}>
                      <View style={[st.iconWrap, { backgroundColor: accent + '16' }]}>
                        <Ionicons name={iconName} size={20} color={accent} />
                      </View>
                      <Badge
                        label={badgeLabel}
                        variant={rec.inProgress ? 'warning' : 'secondary'}
                      />
                    </View>
                    <Text style={st.recCompetency}>
                      {rec.domain} • {rec.competency}
                    </Text>
                    <Text style={st.cardTitle} numberOfLines={2}>
                      {rec.title}
                    </Text>
                    <Text style={st.cardDesc} numberOfLines={3}>
                      {rec.summary}
                    </Text>
                    <View style={st.recFooter}>
                      <Text style={[st.recMeta, { color: colors.textMuted }]}>{rec.metaLabel}</Text>
                      <Text style={[st.cardCtaText, { color: accent }]}>{rec.ctaLabel} →</Text>
                    </View>
                  </GlassCard>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Explore Platform */}
        <View style={st.sectionBlock}>
          <SectionHeading
            title="Explore Platform"
            description="Training modules, coaching companion, and enterprise administration."
          />
          <View style={[st.cardsGrid, isDesktop && st.cardsGridDesktop]}>
            {exploreActions.map((item) => (
              <GlassCard
                key={item.key}
                onPress={() => router.push(item.route as never)}
                style={[st.featureCard, isDesktop && st.featureCardDesktop]}
              >
                <View style={st.featureTop}>
                  <View style={[st.iconWrap, { backgroundColor: item.accent + '16' }]}>
                    <Ionicons name={item.icon} size={20} color={item.accent} />
                  </View>
                  <Badge label={item.badge} variant="secondary" />
                </View>
                <Text style={st.cardTitle}>{item.title}</Text>
                <Text style={st.cardDesc}>{item.description}</Text>
              </GlassCard>
            ))}
          </View>
        </View>

        {/* Assessments & Analytics */}
        <View style={st.sectionBlock}>
          <SectionHeading
            title="Assessments & Progress"
            description="All assessment submissions save directly to your enterprise profile and analytics."
          />
          <View style={[st.cardsGrid, isDesktop && st.cardsGridDesktop]}>
            {assessmentActions.map((a) => (
              <GlassCard
                key={a.key}
                onPress={() => router.push(a.route as never)}
                style={[st.featureCard, isDesktop && st.featureCardDesktop]}
              >
                <View style={st.featureTop}>
                  <View style={[st.iconWrap, { backgroundColor: a.accent + '16' }]}>
                    <Ionicons name={a.icon} size={20} color={a.accent} />
                  </View>
                  <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
                </View>
                <Text style={st.cardTitle}>{a.title}</Text>
                <Text style={st.cardDesc}>{a.subtitle}</Text>
                <View style={st.cardCtaRow}>
                  <Text style={[st.cardCtaText, { color: colors.primary }]}>{a.cta}</Text>
                </View>
              </GlassCard>
            ))}
          </View>
        </View>

        <View style={st.footer}>
          <Ionicons name="shield-checkmark-outline" size={14} color={colors.textMuted} />
          <Text style={st.footerText}>Enterprise security enabled • Private & encrypted team data</Text>
        </View>
      </ScrollView>
    </GlassBackground>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    scroll: { flex: 1 },
    content: {
      paddingHorizontal: Spacing.md,
      paddingTop: Platform.OS === 'ios' ? 56 : Spacing.lg,
      paddingBottom: 120,
      gap: Spacing.xl,
    },
    contentDesktop: {
      maxWidth: 1220,
      width: '100%',
      alignSelf: 'center',
      paddingHorizontal: Spacing['2xl'],
      paddingTop: Spacing.xl,
      paddingBottom: Spacing['3xl'],
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: Spacing.md,
    },
    headerBadges: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
      marginBottom: Spacing.xs,
    },
    greeting: {
      fontSize: Typography.fontSize['2xl'],
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    greetingDesktop: {
      fontSize: 30,
      letterSpacing: -0.7,
    },
    tagline: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      marginTop: 4,
      lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    profileBtn: {
      width: 40,
      height: 40,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    bentoRow: {
      gap: Spacing.md,
    },
    bentoRowDesktop: {
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    heroCard: {
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    heroCardDesktop: {
      flex: 2,
    },
    heroTopRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.sm,
    },
    eqBenchmarkText: {
      fontSize: Typography.fontSize.xs,
      color: colors.textMuted,
      fontWeight: Typography.fontWeight.medium,
    },
    heroTitle: {
      fontSize: Typography.fontSize.xl,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
    },
    heroDesc: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
    },
    progressBlock: {
      gap: 6,
    },
    progressRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    progressLabel: {
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textSecondary,
    },
    progressMetric: {
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
    },
    heroActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
      marginTop: Spacing.xs,
    },
    eqMetricCard: {
      padding: Spacing.lg,
      justifyContent: 'space-between',
      gap: Spacing.md,
    },
    eqMetricCardDesktop: {
      flex: 1,
    },
    eqHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    eqLabel: {
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    eqIconCircle: {
      width: 34,
      height: 34,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    eqBigValue: {
      fontSize: 36,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
      letterSpacing: -1,
    },
    eqOutOf: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.medium,
      color: colors.textMuted,
    },
    eqCaption: {
      fontSize: Typography.fontSize.xs,
      color: colors.textSecondary,
      lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.xs,
    },
    eqFooter: {
      marginTop: Spacing.xs,
    },
    sectionBlock: {
      gap: Spacing.sm,
    },
    cardsGrid: {
      gap: Spacing.md,
    },
    cardsGridDesktop: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    featureCard: {
      padding: Spacing.lg,
      gap: Spacing.sm,
    },
    featureCardDesktop: {
      width: '32%' as any,
      minWidth: 260,
      flexGrow: 1,
    },
    featureTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitle: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
    },
    cardDesc: {
      fontSize: Typography.fontSize.xs,
      color: colors.textSecondary,
      lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.xs,
    },
    cardCtaRow: {
      marginTop: Spacing.xs,
    },
    cardCtaText: {
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.semibold,
    },
    incompleteCard: {
      padding: Spacing.lg,
      gap: Spacing.sm,
      borderWidth: 1,
    },
    incompletePct: {
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.bold,
    },
    incompleteActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
      marginTop: 4,
    },
    recCompetency: {
      fontSize: 11,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.primary,
    },
    recFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.sm,
      marginTop: Spacing.xs,
    },
    recMeta: {
      fontSize: 11,
      fontWeight: Typography.fontWeight.medium,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      marginTop: Spacing.md,
    },
    footerText: {
      fontSize: Typography.fontSize.xs,
      color: colors.textMuted,
    },
  });
