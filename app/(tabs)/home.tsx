/**
 * Home — Minimal, High-Clarity EQ Workspace
 *
 * Designed for crisp mobile & desktop readability:
 * clear typography contrast, generous vertical breathing room,
 * zero awkward half-line wrapping, and vibrant multi-tone gradients.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth-store';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import { GlassBackground } from '@/components/ui/glass-background';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/shadcn-primitives';
import { AddToHomeScreenBanner } from '@/components/web/add-to-home-screen-banner';
import { useWebLaptopLayout } from '@/hooks/useWebLaptopLayout';
import { useEqTestAvailability } from '@/hooks/useEqTestAvailability';
import { GOOD_EQ_SCORE_THRESHOLD } from '@/services/learning-sequence';
import {
  buildHomeRecommendations,
  loadOnboardingFocusGoals,
  subscribeOnboardingGoals,
} from '@/services/learning-recommendations';
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
  borderLight: string;
  borderDark: string;
  route: string;
}

const RECOMMENDATION_STYLES: Record<
  'video' | 'reading' | 'audio',
  {
    icon: keyof typeof Ionicons.glyphMap;
    gradient: GradientPair;
    washLight: GradientPair;
    washDark: GradientPair;
    borderLight: string;
    borderDark: string;
  }
> = {
  video: {
    icon: 'play',
    gradient: ['#2563EB', '#0284C7'],
    washLight: ['#EFF6FF', '#FFFFFF'],
    washDark: ['#0F2942', '#18181B'],
    borderLight: 'rgba(37, 99, 235, 0.16)',
    borderDark: 'rgba(59, 130, 246, 0.28)',
  },
  reading: {
    icon: 'book',
    gradient: ['#D97706', '#EA580C'],
    washLight: ['#FFFBEB', '#FFFFFF'],
    washDark: ['#451A03', '#18181B'],
    borderLight: 'rgba(217, 119, 6, 0.18)',
    borderDark: 'rgba(245, 158, 11, 0.28)',
  },
  audio: {
    icon: 'headset',
    gradient: ['#059669', '#0D9488'],
    washLight: ['#ECFDF5', '#FFFFFF'],
    washDark: ['#064E3B', '#18181B'],
    borderLight: 'rgba(5, 150, 105, 0.16)',
    borderDark: 'rgba(16, 185, 129, 0.28)',
  },
};

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const colors = useColors();
  const isDark = colors.glassTint === 'dark';
  const isDesktop = useWebLaptopLayout();

  const {
    availability: eqAvailability,
    sequenced,
    latestEqScore,
    latestDimensionScores,
  } = useEqTestAvailability();

  const [preferredGoals, setPreferredGoals] = useState<string[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    const syncGoals = () => {
      void loadOnboardingFocusGoals(user.id).then((goals) => {
        if (active) setPreferredGoals(goals);
      });
    };
    syncGoals();
    const unsub = subscribeOnboardingGoals(syncGoals);
    return () => {
      active = false;
      unsub();
    };
  }, [user?.id]);

  const homeFeed = useMemo(
    () => buildHomeRecommendations(sequenced, latestDimensionScores, preferredGoals),
    [sequenced, latestDimensionScores, preferredGoals]
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
        hint: `${sequenced.completedCount} of ${sequenced.totalCount || 24} modules completed`,
        icon: 'compass',
        gradient: ['#2563EB', '#0284C7'],
        cardWashLight: ['#EFF6FF', '#FFFFFF'],
        cardWashDark: ['#0F2942', '#18181B'],
        borderLight: 'rgba(37, 99, 235, 0.16)',
        borderDark: 'rgba(59, 130, 246, 0.28)',
        route: '/(tabs)/learn',
      },
      {
        key: 'companion',
        title: 'Inner Ally',
        hint: 'Reflect, reframe & calm reset',
        icon: 'sparkles',
        gradient: ['#0D9488', '#0284C7'],
        cardWashLight: ['#F0FDFA', '#FFFFFF'],
        cardWashDark: ['#0F292E', '#18181B'],
        borderLight: 'rgba(13, 148, 136, 0.16)',
        borderDark: 'rgba(20, 184, 166, 0.28)',
        route: '/(tabs)/companion',
      },
      {
        key: 'recover',
        title: 'Breathe',
        hint: '3 min guided nervous-system reset',
        icon: 'leaf',
        gradient: ['#10B981', '#0D9488'],
        cardWashLight: ['#ECFDF5', '#FFFFFF'],
        cardWashDark: ['#064E3B', '#18181B'],
        borderLight: 'rgba(16, 185, 129, 0.16)',
        borderDark: 'rgba(16, 185, 129, 0.28)',
        route: '/grounding',
      },
      ...(eqAvailability.isAvailable
        ? [
            {
              key: 'full-eq',
              title: eqAvailability.title,
              hint:
                eqAvailability.kind === 'resume'
                  ? `Question ${eqAvailability.draftCurrentQuestion} of ${eqAvailability.draftTotalQuestions} · Resume`
                  : eqAvailability.kind === 'mid_learning'
                    ? 'Check your EQ growth'
                    : '20 min EQ assessment',
              icon: 'analytics' as const,
              gradient: ['#0284C7', '#2563EB'] as GradientPair,
              cardWashLight: ['#F0F9FF', '#FFFFFF'] as GradientPair,
              cardWashDark: ['#0C4A6E', '#18181B'] as GradientPair,
              borderLight: 'rgba(2, 132, 199, 0.16)',
              borderDark: 'rgba(14, 165, 233, 0.28)',
              route: eqAvailability.route,
            },
          ]
        : []),
      {
        key: 'big5',
        title: 'Personality',
        hint: 'Explore your Big Five profile',
        icon: 'shapes',
        gradient: ['#D97706', '#EA580C'],
        cardWashLight: ['#FFF7ED', '#FFFFFF'],
        cardWashDark: ['#451A03', '#18181B'],
        borderLight: 'rgba(245, 158, 11, 0.18)',
        borderDark: 'rgba(245, 158, 11, 0.28)',
        route: '/big5-test',
      },
      {
        key: 'progress',
        title: 'Progress',
        hint: 'View insights & reports',
        icon: 'stats-chart',
        gradient: ['#0D9488', '#0284C7'],
        cardWashLight: ['#F0FDFA', '#FFFFFF'],
        cardWashDark: ['#134E4A', '#18181B'],
        borderLight: 'rgba(13, 148, 136, 0.16)',
        borderDark: 'rgba(20, 184, 166, 0.28)',
        route: '/(tabs)/progress',
      },
    ];
    if (user?.role === 'admin') {
      tiles.push({
        key: 'admin',
        title: 'Team Analytics',
        hint: 'Company completion overview',
        icon: 'shield-checkmark',
        gradient: ['#F59E0B', '#EA580C'],
        cardWashLight: ['#FFFBEB', '#FFFFFF'],
        cardWashDark: ['#451A03', '#18181B'],
        borderLight: 'rgba(234, 88, 12, 0.18)',
        borderDark: 'rgba(245, 158, 11, 0.28)',
        route: '/admin',
      });
    }
    return tiles;
  }, [eqAvailability, sequenced.completedCount, sequenced.totalCount, user?.role]);

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
              ? ['#0F172A', '#0C2340', '#18181B']
              : ['#F0F9FF', '#EFF6FF', '#FFFFFF']
          }
          borderColor={isDark ? 'rgba(56, 189, 248, 0.28)' : 'rgba(2, 132, 199, 0.18)'}
        >
          <View style={st.heroTopRow}>
            <View
              style={[
                st.statusChip,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.85)',
                  borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(2, 132, 199, 0.16)',
                },
              ]}
            >
              <LinearGradient
                colors={
                  sequenced.accessMode === 'free_browse'
                    ? ['#10B981', '#0D9488']
                    : ['#2563EB', '#0284C7']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={st.statusDot}
              />
              <Text style={st.statusChipText}>
                {eqAvailability.kind === 'resume'
                  ? 'EQ Test In Progress'
                  : eqAvailability.kind === 'initial'
                    ? 'Step 1 · EQ Test'
                    : eqAvailability.kind === 'final'
                      ? 'Curriculum Complete'
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
                  colors={['#2563EB', '#0284C7']}
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
              {eqAvailability.kind === 'resume'
                ? 'Complete EQ Test'
                : eqAvailability.kind === 'initial'
                  ? 'Take EQ Test'
                  : eqAvailability.kind === 'final'
                    ? 'Take Final EQ Test'
                    : nextLesson
                      ? formatCatalogLabel(nextLesson.episode.competency) || nextLesson.episode.title
                      : 'Your EQ Path'}
            </Text>

            <Text style={[st.heroDesc, isDesktop && st.heroDescDesktop]}>
              {eqAvailability.kind === 'resume'
                ? eqAvailability.subtitle
                : eqAvailability.kind === 'initial'
                  ? eqAvailability.subtitle
                  : eqAvailability.kind === 'final'
                    ? eqAvailability.subtitle
                    : latestEqScore !== null && latestEqScore >= GOOD_EQ_SCORE_THRESHOLD
                      ? 'Explore all competencies freely or continue in sequence.'
                      : 'Complete each competency step by step.'}
            </Text>
          </View>

          <View style={st.progressBlock}>
            <ProgressBar
              value={completionPct}
              height={7}
              gradientColors={['#2563EB', '#0284C7', '#0D9488']}
              trackColor={isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.08)'}
            />
            <Text style={st.progressMeta}>
              {sequenced.completedCount} of {sequenced.totalCount || 24} completed
            </Text>
          </View>

          <View style={st.heroActions}>
            {eqAvailability.kind === 'resume' ||
            eqAvailability.kind === 'initial' ||
            eqAvailability.kind === 'final' ? (
              <>
                <Button
                  title={eqAvailability.ctaLabel}
                  size={isDesktop ? 'md' : 'sm'}
                  icon="arrow-forward"
                  onPress={() => router.push(eqAvailability.route as never)}
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
                    router.push(`/learning-detail?id=${encodeURIComponent(item.routeId)}`)
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
                          `/learning-detail?id=${encodeURIComponent(item.routeId)}&restart=1`
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
                      router.push(`/learning-detail?id=${encodeURIComponent(rec.routeId)}`)
                    }
                    gradientColors={isDark ? palette.washDark : palette.washLight}
                    borderColor={isDark ? palette.borderDark : palette.borderLight}
                    style={[st.rowCard, isDesktop && st.thirdCardDesktop]}
                  >
                    <View style={st.desktopTileInner}>
                      <View style={st.tileTop}>
                        <LinearGradient
                          colors={palette.gradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={isDesktop ? st.iconSquircleDesktop : st.iconSquircle}
                        >
                          <Ionicons name={palette.icon} size={isDesktop ? 19 : 18} color="#FFFFFF" />
                        </LinearGradient>
                        <View
                          style={[
                            st.chevronPill,
                            {
                              backgroundColor: isDark
                                ? 'rgba(255,255,255,0.08)'
                                : 'rgba(15,23,42,0.05)',
                            },
                          ]}
                        >
                          <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
                        </View>
                      </View>
                      <View style={st.desktopTileCopy}>
                        <Text
                          style={isDesktop ? st.tileTitleDesktop : st.tileTitle}
                          numberOfLines={1}
                        >
                          {rec.title}
                        </Text>
                        <Text
                          style={isDesktop ? st.tileSubtitleDesktop : st.tileSubtitle}
                          numberOfLines={1}
                        >
                          {rec.competency}
                        </Text>
                      </View>
                    </View>
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
                borderColor={isDark ? tile.borderDark : tile.borderLight}
                style={[st.rowCard, isDesktop && st.thirdCardDesktop]}
              >
                <View style={st.desktopTileInner}>
                  <View style={st.tileTop}>
                    <LinearGradient
                      colors={tile.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={isDesktop ? st.iconSquircleDesktop : st.iconSquircle}
                    >
                      <Ionicons name={tile.icon} size={isDesktop ? 19 : 18} color="#FFFFFF" />
                    </LinearGradient>
                    <View
                      style={[
                        st.chevronPill,
                        {
                          backgroundColor: isDark
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(15,23,42,0.05)',
                        },
                      ]}
                    >
                      <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
                    </View>
                  </View>
                  <View style={st.desktopTileCopy}>
                    <Text
                      style={isDesktop ? st.tileTitleDesktop : st.tileTitle}
                      numberOfLines={1}
                    >
                      {tile.title}
                    </Text>
                    <Text
                      style={isDesktop ? st.tileSubtitleDesktop : st.tileSubtitle}
                      numberOfLines={1}
                    >
                      {tile.hint}
                    </Text>
                  </View>
                </View>
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
      gap: isDesktop ? 16 : 14,
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
      gap: 16,
    },
    gridDesktop: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 18,
    },
    rowCard: {
      padding: isDesktop ? 20 : 18,
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
      gap: isDesktop ? 14 : 13,
    },
    desktopTileCopy: {
      gap: 5,
    },
    tileTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    chevronPill: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconSquircle: {
      width: 40,
      height: 40,
      borderRadius: 12,
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
      fontSize: 15,
      lineHeight: 20,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      letterSpacing: -0.2,
    },
    tileTitleDesktop: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      letterSpacing: -0.25,
    },
    tileSubtitle: {
      fontSize: 12.5,
      lineHeight: 17,
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
