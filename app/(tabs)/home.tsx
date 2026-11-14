/**
 * Home — Minimal, Focused EQ Workspace
 *
 * Clean visual hierarchy: open whitespace, concise copy, icon-led navigation,
 * and immediate zero-spinner loading across mobile and desktop.
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

interface WorkspaceTile {
  key: string;
  title: string;
  hint: string;
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

  const workspaceTiles = useMemo<WorkspaceTile[]>(() => {
    const tiles: WorkspaceTile[] = [
      {
        key: 'learn',
        title: 'Curriculum',
        hint: `${sequenced.completedCount}/${sequenced.totalCount || 24} completed`,
        icon: 'compass-outline',
        accent: colors.primary,
        route: '/(tabs)/learn',
      },
      {
        key: 'companion',
        title: 'Inner Ally',
        hint: 'Reflect & reset',
        icon: 'sparkles-outline',
        accent: colors.accentIndigo,
        route: '/(tabs)/companion',
      },
      {
        key: 'recover',
        title: 'Breathe',
        hint: '3 min calm reset',
        icon: 'leaf-outline',
        accent: colors.success,
        route: '/grounding',
      },
      {
        key: 'full-eq',
        title: latestEqScore !== null ? 'EQ Assessment' : 'Baseline EQ Test',
        hint: latestEqScore !== null ? `Score ${latestEqScore}/100` : '25 min check-in',
        icon: 'analytics-outline',
        accent: colors.primary,
        route: '/full-eq-test',
      },
      {
        key: 'big5',
        title: 'Personality',
        hint: 'Big Five traits',
        icon: 'shapes-outline',
        accent: colors.accentIndigo,
        route: '/big5-test',
      },
      {
        key: 'progress',
        title: 'Progress',
        hint: 'Insights & reports',
        icon: 'stats-chart-outline',
        accent: colors.success,
        route: '/(tabs)/progress',
      },
    ];
    if (user?.role === 'admin') {
      tiles.push({
        key: 'admin',
        title: 'Team Analytics',
        hint: 'Admin overview',
        icon: 'shield-checkmark-outline',
        accent: colors.warning,
        route: '/admin',
      });
    }
    return tiles;
  }, [colors, latestEqScore, sequenced.completedCount, sequenced.totalCount, user?.role]);

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

        {/* Minimal Header */}
        <View style={st.headerRow}>
          <View style={st.headerLeft}>
            <Text style={[st.greeting, isDesktop && st.greetingDesktop]}>{greeting}</Text>
            {user?.companyName ? (
              <Text style={st.companySubtitle}>{user.companyName}</Text>
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
                <Ionicons name="person-outline" size={19} color={colors.textPrimary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Focused Hero Card */}
        <GlassCard style={st.heroCard}>
          <View style={st.heroTopRow}>
            <View style={[st.statusChip, { backgroundColor: colors.surface }]}>
              <View
                style={[
                  st.statusDot,
                  {
                    backgroundColor:
                      sequenced.accessMode === 'free_browse'
                        ? colors.success
                        : colors.primary,
                  },
                ]}
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
                style={[st.scoreChip, { backgroundColor: colors.primary + '12' }]}
                activeOpacity={0.75}
              >
                <Text style={[st.scoreChipText, { color: colors.primary }]}>
                  EQ {latestEqScore}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <Text style={[st.heroTitle, isDesktop && st.heroTitleDesktop]}>
            {latestEqScore === null
              ? 'Take Baseline EQ Test'
              : nextLesson
                ? formatCatalogLabel(nextLesson.episode.competency) || nextLesson.episode.title
                : 'Your EQ Path'}
          </Text>

          <Text style={st.heroDesc}>
            {latestEqScore === null
              ? 'A short baseline assessment to personalize your learning path.'
              : latestEqScore >= GOOD_EQ_SCORE_THRESHOLD
                ? 'Explore any competency freely or follow the recommended sequence.'
                : 'Complete each step in sequence to build lasting mastery.'}
          </Text>

          <View style={st.progressBlock}>
            <ProgressBar value={completionPct} height={6} />
            <Text style={st.progressMeta}>
              {sequenced.completedCount} of {sequenced.totalCount || 24} completed
            </Text>
          </View>

          <View style={st.heroActions}>
            {latestEqScore === null ? (
              <>
                <Button
                  title="Start EQ Test"
                  icon="arrow-forward"
                  onPress={() => router.push('/full-eq-test')}
                />
                <Button
                  title="Browse Modules"
                  variant="ghost"
                  onPress={() => router.push('/(tabs)/learn')}
                />
              </>
            ) : (
              <>
                <Button
                  title="Continue"
                  icon="play"
                  onPress={openNextLesson}
                />
                <Button
                  title="All Modules"
                  variant="ghost"
                  onPress={() => router.push('/(tabs)/learn')}
                />
              </>
            )}
          </View>
        </GlassCard>

        {/* Resume In-Progress (Only when active) */}
        {homeFeed.incompleteItems.length > 0 ? (
          <View style={st.sectionBlock}>
            <Text style={st.sectionTitle}>Pick up where you left off</Text>
            <View style={[st.grid, isDesktop && st.gridDesktop]}>
              {homeFeed.incompleteItems.slice(0, 2).map((item) => (
                <GlassCard
                  key={`${item.episodeKey}-${item.kind}`}
                  onPress={() =>
                    router.push(`/learning-detail?id=${encodeURIComponent(item.routeId)}&mode=${item.kind}`)
                  }
                  style={[st.compactCard, isDesktop && st.halfCardDesktop]}
                >
                  <View style={st.tileRow}>
                    <View style={[st.iconSquircle, { backgroundColor: colors.warning + '16' }]}>
                      <Ionicons
                        name={item.kind === 'video' ? 'play-outline' : 'headset-outline'}
                        size={19}
                        color={colors.warning}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={st.tileTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={st.tileSubtitle} numberOfLines={1}>
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
                      <Ionicons name="refresh-outline" size={16} color={colors.textSecondary} />
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
            <Text style={st.sectionTitle}>Recommended</Text>
            <View style={[st.grid, isDesktop && st.gridDesktop]}>
              {homeFeed.recommendations.slice(0, 3).map((rec) => {
                const iconName: keyof typeof Ionicons.glyphMap =
                  rec.type === 'video'
                    ? 'play-outline'
                    : rec.type === 'reading'
                      ? 'book-outline'
                      : 'headset-outline';
                const accent =
                  rec.type === 'video'
                    ? colors.primary
                    : rec.type === 'reading'
                      ? colors.accentIndigo
                      : colors.success;

                return (
                  <GlassCard
                    key={`${rec.type}-${rec.episodeKey}`}
                    onPress={() =>
                      router.push(`/learning-detail?id=${encodeURIComponent(rec.routeId)}&mode=${rec.type}`)
                    }
                    style={[st.compactCard, isDesktop && st.thirdCardDesktop]}
                  >
                    <View style={st.tileTop}>
                      <View style={[st.iconSquircle, { backgroundColor: accent + '14' }]}>
                        <Ionicons name={iconName} size={19} color={accent} />
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
                    </View>
                    <Text style={st.tileTitle} numberOfLines={1}>
                      {rec.title}
                    </Text>
                    <Text style={st.tileSubtitle} numberOfLines={1}>
                      {rec.competency}
                    </Text>
                  </GlassCard>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Clean Icon-Led Workspace Tiles */}
        <View style={st.sectionBlock}>
          <Text style={st.sectionTitle}>Workspace</Text>
          <View style={[st.grid, isDesktop && st.gridDesktop]}>
            {workspaceTiles.map((tile) => (
              <GlassCard
                key={tile.key}
                onPress={() => router.push(tile.route as never)}
                style={[st.compactCard, isDesktop && st.thirdCardDesktop]}
              >
                <View style={st.tileTop}>
                  <View style={[st.iconSquircle, { backgroundColor: tile.accent + '14' }]}>
                    <Ionicons name={tile.icon} size={20} color={tile.accent} />
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
                </View>
                <Text style={st.tileTitle}>{tile.title}</Text>
                <Text style={st.tileSubtitle}>{tile.hint}</Text>
              </GlassCard>
            ))}
          </View>
        </View>
      </ScrollView>
    </GlassBackground>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    scroll: { flex: 1 },
    content: {
      paddingHorizontal: Spacing.lg,
      paddingTop: Platform.OS === 'ios' ? 60 : Spacing.xl,
      paddingBottom: 120,
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
      gap: Spacing.md,
    },
    headerLeft: {
      flex: 1,
      gap: 4,
    },
    greeting: {
      fontSize: 28,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
      letterSpacing: -0.7,
    },
    greetingDesktop: {
      fontSize: 34,
      letterSpacing: -0.9,
    },
    companySubtitle: {
      fontSize: Typography.fontSize.sm,
      color: colors.textMuted,
      fontWeight: Typography.fontWeight.medium,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    profileBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    heroCard: {
      padding: 24,
      gap: 16,
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
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: Radius.full,
    },
    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    statusChipText: {
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textSecondary,
    },
    scoreChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: Radius.full,
    },
    scoreChipText: {
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.bold,
    },
    heroTitle: {
      fontSize: 22,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    heroTitleDesktop: {
      fontSize: 26,
      letterSpacing: -0.7,
    },
    heroDesc: {
      fontSize: Typography.fontSize.base,
      color: colors.textSecondary,
      lineHeight: 22,
      maxWidth: 560,
    },
    progressBlock: {
      gap: 8,
      marginTop: 2,
    },
    progressMeta: {
      fontSize: Typography.fontSize.xs,
      color: colors.textMuted,
      fontWeight: Typography.fontWeight.medium,
    },
    heroActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: Spacing.sm,
      marginTop: 4,
    },
    sectionBlock: {
      gap: 14,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      letterSpacing: -0.3,
    },
    grid: {
      gap: 14,
    },
    gridDesktop: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 18,
    },
    compactCard: {
      padding: 20,
      gap: 10,
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
    tileTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    tileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    iconSquircle: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tileTitle: {
      fontSize: 16,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      letterSpacing: -0.2,
    },
    tileSubtitle: {
      fontSize: 13,
      color: colors.textMuted,
      fontWeight: Typography.fontWeight.normal,
    },
    miniIconBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
