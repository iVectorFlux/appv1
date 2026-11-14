/**
 * Home — Minimal, High-Clarity EQ Workspace
 *
 * Designed for crisp mobile & desktop readability:
 * clear typography contrast, generous vertical breathing room,
 * zero awkward half-line wrapping, and vibrant multi-tone gradients.
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
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth-store';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import { GlassBackground } from '@/components/ui/glass-background';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/shadcn-primitives';
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
import { formatCatalogLabel } from '@/data/eq-curriculum';

type GradientPair = readonly [string, string];

interface WorkspaceTile {
  key: string;
  title: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: GradientPair;
  cardWashLight: GradientPair;
  cardWashDark: GradientPair;
  route: string;
}

const RECOMMENDATION_STYLES: Record<
  'video' | 'reading' | 'audio',
  {
    icon: keyof typeof Ionicons.glyphMap;
    gradient: GradientPair;
    washLight: GradientPair;
    washDark: GradientPair;
  }
> = {
  video: {
    icon: 'play',
    gradient: ['#2563EB', '#4F46E5'],
    washLight: ['#FFFFFF', '#F5F7FF'],
    washDark: ['#18181B', '#172554'],
  },
  reading: {
    icon: 'book',
    gradient: ['#7C3AED', '#EC4899'],
    washLight: ['#FFFFFF', '#FAF5FF'],
    washDark: ['#18181B', '#2E1065'],
  },
  audio: {
    icon: 'headset',
    gradient: ['#059669', '#0EA5E9'],
    washLight: ['#FFFFFF', '#F0FDF9'],
    washDark: ['#18181B', '#064E3B'],
  },
};

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const colors = useColors();
  const isDark = colors.glassTint === 'dark';
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

  const workspaceTiles = useMemo<WorkspaceTile[]>(() => {
    const tiles: WorkspaceTile[] = [
      {
        key: 'learn',
        title: 'Curriculum',
        hint: `${sequenced.completedCount} of ${sequenced.totalCount || 24} modules`,
        icon: 'compass',
        gradient: ['#2563EB', '#4F46E5'],
        cardWashLight: ['#FFFFFF', '#F5F8FF'],
        cardWashDark: ['#18181B', '#172554'],
        route: '/(tabs)/learn',
      },
      {
        key: 'companion',
        title: 'Inner Ally',
        hint: 'Reflect & reset with AI',
        icon: 'sparkles',
        gradient: ['#6366F1', '#9333EA'],
        cardWashLight: ['#FFFFFF', '#F8F5FF'],
        cardWashDark: ['#18181B', '#2E1065'],
        route: '/(tabs)/companion',
      },
      {
        key: 'recover',
        title: 'Breathe',
        hint: '3 min calm reset',
        icon: 'leaf',
        gradient: ['#10B981', '#0D9488'],
        cardWashLight: ['#FFFFFF', '#F0FDF9'],
        cardWashDark: ['#18181B', '#064E3B'],
        route: '/grounding',
      },
      {
        key: 'full-eq',
        title: latestEqScore !== null ? 'EQ Assessment' : 'Baseline EQ Test',
        hint: latestEqScore !== null ? `Latest score ${latestEqScore}/100` : '20 min check-in',
        icon: 'analytics',
        gradient: ['#0284C7', '#2563EB'],
        cardWashLight: ['#FFFFFF', '#F0F9FF'],
        cardWashDark: ['#18181B', '#0C4A6E'],
        route: '/full-eq-test',
      },
      {
        key: 'big5',
        title: 'Personality',
        hint: 'Big Five profile',
        icon: 'shapes',
        gradient: ['#F59E0B', '#EC4899'],
        cardWashLight: ['#FFFFFF', '#FFF7ED'],
        cardWashDark: ['#18181B', '#451A03'],
        route: '/big5-test',
      },
      {
        key: 'progress',
        title: 'Progress',
        hint: 'Insights & reports',
        icon: 'stats-chart',
        gradient: ['#0D9488', '#0284C7'],
        cardWashLight: ['#FFFFFF', '#F0FDFA'],
        cardWashDark: ['#18181B', '#134E4A'],
        route: '/(tabs)/progress',
      },
    ];
    if (user?.role === 'admin') {
      tiles.push({
        key: 'admin',
        title: 'Team Analytics',
        hint: 'Company overview',
        icon: 'shield-checkmark',
        gradient: ['#F59E0B', '#EA580C'],
        cardWashLight: ['#FFFFFF', '#FFFBEB'],
        cardWashDark: ['#18181B', '#451A03'],
        route: '/admin',
      });
    }
    return tiles;
  }, [latestEqScore, sequenced.completedCount, sequenced.totalCount, user?.role]);

  const st = createStyles(colors, isDesktop);

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

        {/* Minimal Header */}
        <View style={st.headerRow}>
          <View style={st.headerLeft}>
            <Text style={[st.greeting, isDesktop && st.greetingDesktop]} numberOfLines={1}>
              {greeting}
            </Text>
            {user?.companyName ? (
              <Text style={st.companySubtitle} numberOfLines={1}>
                {user.companyName}
              </Text>
            ) : null}
          </View>

          <View style={st.headerActions}>
            {user?.role === 'admin' ? (
              <Button
                title="Admin"
                size="sm"
                variant="outline"
                icon="shield-checkmark-outline"
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
                <Ionicons name="person-outline" size={17} color={colors.textPrimary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Hero Card with Gradient Wash & High Hierarchy Contrast */}
        <GlassCard
          style={[st.heroCard, isDesktop && st.heroCardDesktop]}
          gradientColors={
            isDark
              ? ['#172554', '#1E1B4B', '#18181B']
              : ['#EEF2FF', '#F0F9FF', '#FFFFFF']
          }
          borderColor={isDark ? 'rgba(99, 102, 241, 0.35)' : 'rgba(79, 70, 229, 0.22)'}
        >
          <View style={st.heroTopRow}>
            <View
              style={[
                st.statusChip,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.85)',
                  borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(79, 70, 229, 0.14)',
                },
              ]}
            >
              <LinearGradient
                colors={
                  sequenced.accessMode === 'free_browse'
                    ? ['#10B981', '#0D9488']
                    : ['#2563EB', '#7C3AED']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={st.statusDot}
              />
              <Text style={st.statusChipText}>
                {latestEqScore === null
                  ? 'Step 1 · Baseline'
                  : sequenced.accessMode === 'free_browse'
                    ? 'Free Browse Unlocked'
                    : 'Guided Pathway'}
              </Text>
            </View>

            {latestEqScore !== null ? (
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/progress')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#2563EB', '#4F46E5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={st.scoreChip}
                >
                  <Text style={st.scoreChipText}>EQ {latestEqScore}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={st.heroTextGroup}>
            <Text style={[st.heroTitle, isDesktop && st.heroTitleDesktop]}>
              {latestEqScore === null
                ? 'Take Baseline EQ Test'
                : nextLesson
                  ? formatCatalogLabel(nextLesson.episode.competency) || nextLesson.episode.title
                  : 'Your EQ Path'}
            </Text>

            <Text style={[st.heroDesc, isDesktop && st.heroDescDesktop]}>
              {latestEqScore === null
                ? 'Measure your baseline to unlock a personalized path.'
                : latestEqScore >= GOOD_EQ_SCORE_THRESHOLD
                  ? 'Explore all competencies freely or continue in sequence.'
                  : 'Complete each competency step by step.'}
            </Text>
          </View>

          <View style={st.progressBlock}>
            <ProgressBar
              value={completionPct}
              height={7}
              gradientColors={['#2563EB', '#6366F1', '#0EA5E9']}
              trackColor={isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.08)'}
            />
            <Text style={st.progressMeta}>
              {sequenced.completedCount} of {sequenced.totalCount || 24} completed
            </Text>
          </View>

          <View style={st.heroActions}>
            {latestEqScore === null ? (
              <>
                <Button
                  title="Start EQ Test"
                  size={isDesktop ? 'md' : 'sm'}
                  icon="arrow-forward"
                  onPress={() => router.push('/full-eq-test')}
                />
                <Button
                  title="Explore"
                  size={isDesktop ? 'md' : 'sm'}
                  variant="ghost"
                  onPress={() => router.push('/(tabs)/learn')}
                />
              </>
            ) : (
              <>
                <Button
                  title="Continue"
                  size={isDesktop ? 'md' : 'sm'}
                  icon="play"
                  onPress={openNextLesson}
                />
                <Button
                  title="All Modules"
                  size={isDesktop ? 'md' : 'sm'}
                  variant="ghost"
                  onPress={() => router.push('/(tabs)/learn')}
                />
              </>
            )}
          </View>
        </GlassCard>

        {/* Resume In-Progress */}
        {homeFeed.incompleteItems.length > 0 ? (
          <View style={st.sectionBlock}>
            <Text style={[st.sectionTitle, isDesktop && st.sectionTitleDesktop]}>
              Continue where you left off
            </Text>
            <View style={[st.grid, isDesktop && st.gridDesktop]}>
              {homeFeed.incompleteItems.slice(0, 2).map((item) => (
                <GlassCard
                  key={`${item.episodeKey}-${item.kind}`}
                  onPress={() =>
                    router.push(`/learning-detail?id=${encodeURIComponent(item.routeId)}&mode=${item.kind}`)
                  }
                  gradientColors={
                    isDark ? ['#18181B', '#2E1A07'] : ['#FFFFFF', '#FFFBEB']
                  }
                  style={[st.rowCard, isDesktop && st.halfCardDesktop]}
                >
                  <View style={st.tileRow}>
                    <LinearGradient
                      colors={['#F59E0B', '#EA580C']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={st.iconSquircle}
                    >
                      <Ionicons
                        name={item.kind === 'video' ? 'play' : 'headset'}
                        size={18}
                        color="#FFFFFF"
                      />
                    </LinearGradient>
                    <View style={st.rowTextCol}>
                      <Text style={[st.tileTitle, isDesktop && st.tileTitleDesktop]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={[st.tileSubtitle, isDesktop && st.tileSubtitleDesktop]} numberOfLines={1}>
                        {item.competency} · {item.progressPct}%
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation?.();
                        router.push(
                          `/learning-detail?id=${encodeURIComponent(item.routeId)}&mode=${item.kind}&restart=1`
                        );
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      accessibilityLabel="Restart lesson"
                      style={[st.miniIconBtn, { backgroundColor: colors.surface }]}
                    >
                      <Ionicons name="refresh-outline" size={15} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </GlassCard>
              ))}
            </View>
          </View>
        ) : null}

        {/* Minimal Recommendations */}
        {homeFeed.recommendations.length > 0 ? (
          <View style={st.sectionBlock}>
            <Text style={[st.sectionTitle, isDesktop && st.sectionTitleDesktop]}>
              Recommended
            </Text>
            <View style={[st.grid, isDesktop && st.gridDesktop]}>
              {homeFeed.recommendations.slice(0, 3).map((rec) => {
                const palette = RECOMMENDATION_STYLES[rec.type];

                return (
                  <GlassCard
                    key={`${rec.type}-${rec.episodeKey}`}
                    onPress={() =>
                      router.push(`/learning-detail?id=${encodeURIComponent(rec.routeId)}&mode=${rec.type}`)
                    }
                    gradientColors={isDark ? palette.washDark : palette.washLight}
                    style={[st.rowCard, isDesktop && st.thirdCardDesktop]}
                  >
                    {isDesktop ? (
                      <View style={st.desktopTileInner}>
                        <View style={st.tileTop}>
                          <LinearGradient
                            colors={palette.gradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={st.iconSquircleDesktop}
                          >
                            <Ionicons name={palette.icon} size={19} color="#FFFFFF" />
                          </LinearGradient>
                          <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
                        </View>
                        <View style={st.desktopTileCopy}>
                          <Text style={st.tileTitleDesktop} numberOfLines={1}>
                            {rec.title}
                          </Text>
                          <Text style={st.tileSubtitleDesktop} numberOfLines={1}>
                            {rec.competency}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View style={st.tileRow}>
                        <LinearGradient
                          colors={palette.gradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={st.iconSquircle}
                        >
                          <Ionicons name={palette.icon} size={17} color="#FFFFFF" />
                        </LinearGradient>
                        <View style={st.rowTextCol}>
                          <Text style={st.tileTitle} numberOfLines={1}>
                            {rec.title}
                          </Text>
                          <Text style={st.tileSubtitle} numberOfLines={1}>
                            {rec.competency}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
                      </View>
                    )}
                  </GlassCard>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Clean Gradient-Icon Workspace Tiles */}
        <View style={st.sectionBlock}>
          <Text style={[st.sectionTitle, isDesktop && st.sectionTitleDesktop]}>
            Workspace
          </Text>
          <View style={[st.grid, isDesktop && st.gridDesktop]}>
            {workspaceTiles.map((tile) => (
              <GlassCard
                key={tile.key}
                onPress={() => router.push(tile.route as never)}
                gradientColors={isDark ? tile.cardWashDark : tile.cardWashLight}
                style={[st.rowCard, isDesktop && st.thirdCardDesktop]}
              >
                {isDesktop ? (
                  <View style={st.desktopTileInner}>
                    <View style={st.tileTop}>
                      <LinearGradient
                        colors={tile.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={st.iconSquircleDesktop}
                      >
                        <Ionicons name={tile.icon} size={19} color="#FFFFFF" />
                      </LinearGradient>
                      <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
                    </View>
                    <View style={st.desktopTileCopy}>
                      <Text style={st.tileTitleDesktop} numberOfLines={1}>
                        {tile.title}
                      </Text>
                      <Text style={st.tileSubtitleDesktop} numberOfLines={1}>
                        {tile.hint}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={st.tileRow}>
                    <LinearGradient
                      colors={tile.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={st.iconSquircle}
                    >
                      <Ionicons name={tile.icon} size={17} color="#FFFFFF" />
                    </LinearGradient>
                    <View style={st.rowTextCol}>
                      <Text style={st.tileTitle} numberOfLines={1}>
                        {tile.title}
                      </Text>
                      <Text style={st.tileSubtitle} numberOfLines={1}>
                        {tile.hint}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
                  </View>
                )}
              </GlassCard>
            ))}
          </View>
        </View>
      </ScrollView>
    </GlassBackground>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>, isDesktop: boolean) =>
  StyleSheet.create({
    scroll: { flex: 1 },
    content: {
      paddingHorizontal: Spacing.md,
      paddingTop: Platform.OS === 'ios' ? 54 : Spacing.lg,
      paddingBottom: 112,
      gap: 28,
    },
    contentDesktop: {
      maxWidth: 1080,
      width: '100%',
      alignSelf: 'center',
      paddingHorizontal: Spacing['2xl'],
      paddingTop: Spacing['2xl'],
      paddingBottom: Spacing['4xl'],
      gap: 36,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    headerLeft: {
      flex: 1,
      gap: 4,
    },
    greeting: {
      fontSize: 20,
      lineHeight: 26,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
      letterSpacing: -0.4,
    },
    greetingDesktop: {
      fontSize: 32,
      lineHeight: 38,
      letterSpacing: -0.8,
    },
    companySubtitle: {
      fontSize: isDesktop ? 13 : 12,
      color: colors.textMuted,
      fontWeight: Typography.fontWeight.medium,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    profileBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    heroCard: {
      padding: 18,
      gap: 18,
    },
    heroCardDesktop: {
      padding: 28,
      gap: 22,
    },
    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.sm,
    },
    statusChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: Radius.full,
      borderWidth: 1,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    statusChipText: {
      fontSize: 11,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textSecondary,
      letterSpacing: 0.1,
    },
    scoreChip: {
      paddingHorizontal: 11,
      paddingVertical: 5,
      borderRadius: Radius.full,
    },
    scoreChipText: {
      fontSize: 11,
      fontWeight: Typography.fontWeight.bold,
      color: '#FFFFFF',
    },
    heroTextGroup: {
      gap: 8,
    },
    heroTitle: {
      fontSize: 21,
      lineHeight: 27,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
      letterSpacing: -0.4,
    },
    heroTitleDesktop: {
      fontSize: 30,
      lineHeight: 36,
      letterSpacing: -0.8,
    },
    heroDesc: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.textSecondary,
      maxWidth: 540,
    },
    heroDescDesktop: {
      fontSize: 15,
      lineHeight: 22,
    },
    progressBlock: {
      gap: 8,
    },
    progressMeta: {
      fontSize: isDesktop ? 13 : 11.5,
      color: colors.textMuted,
      fontWeight: Typography.fontWeight.medium,
    },
    heroActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 10,
    },
    sectionBlock: {
      gap: isDesktop ? 16 : 12,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
      letterSpacing: -0.2,
    },
    sectionTitleDesktop: {
      fontSize: 18,
      letterSpacing: -0.35,
    },
    grid: {
      gap: 12,
    },
    gridDesktop: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 18,
    },
    rowCard: {
      padding: isDesktop ? 20 : 14,
    },
    halfCardDesktop: {
      width: '48.5%' as any,
      minWidth: 280,
      flexGrow: 1,
    },
    thirdCardDesktop: {
      width: '31.5%' as any,
      minWidth: 240,
      flexGrow: 1,
    },
    tileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 13,
    },
    rowTextCol: {
      flex: 1,
      gap: 4,
    },
    desktopTileInner: {
      gap: 14,
    },
    desktopTileCopy: {
      gap: 5,
    },
    tileTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    iconSquircle: {
      width: 38,
      height: 38,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconSquircleDesktop: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tileTitle: {
      fontSize: 14,
      lineHeight: 19,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      letterSpacing: -0.15,
    },
    tileTitleDesktop: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      letterSpacing: -0.25,
    },
    tileSubtitle: {
      fontSize: 12,
      lineHeight: 16,
      color: colors.textMuted,
    },
    tileSubtitleDesktop: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.textMuted,
    },
    miniIconBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
