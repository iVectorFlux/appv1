/**
 * Learn Screen — Learning dashboard (bento, forest hero)
 *
 * Design: warm editorial + dark forest green hero per spec; catalog from Supabase.
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors, Spacing, Typography, Radius, Layout } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import { GlassBackground } from '@/components/ui/glass-background';
import { ScreenHeader } from '@/components/ui/screen-header';
import { DIMENSION_INFO, LEARNING_MODULES, getModuleById } from '@/data/learning-content';
import type { EQDimension } from '@/types/eq-assessment';
import { useLearningCatalog } from '@/hooks/useLearningCatalog';
import { isIntroEpisodeTitle } from '@/services/learning-content-catalog';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';

const DIMENSION_FILTERS: (EQDimension | 'all')[] = [
  'all',
  'self_awareness',
  'self_regulation',
  'empathy',
  'social_skills',
  'motivation',
  'resilience',
];

/** Four primary competency tiles (spec alignment). */
const COMPETENCY_BENTO: {
  dim: EQDimension;
  title: string;
  subtitle: string;
  dot: string;
}[] = [
  {
    dim: 'self_awareness',
    title: 'Self Awareness',
    subtitle: 'Understand your emotions',
    dot: '#5C6BC0',
  },
  {
    dim: 'self_regulation',
    title: 'Self Management',
    subtitle: 'Master emotional regulation',
    dot: '#3D8B6E',
  },
  {
    dim: 'empathy',
    title: 'Social Awareness',
    subtitle: 'Read the room',
    dot: '#E07A5F',
  },
  {
    dim: 'social_skills',
    title: 'Relationships',
    subtitle: 'Lead effectively',
    dot: '#C4A484',
  },
];

export default function LearnScreen() {
  const router = useRouter();
  const colors = useColors();
  const { width } = useWindowDimensions();
  const { user } = useAuthStore();
  const { episodes, loading, error, reload, emptyRemote } = useLearningCatalog();
  const [selectedDimension, setSelectedDimension] = useState<EQDimension | 'all'>('all');

  const firstName = (user?.displayName?.trim() || user?.username || '').split(' ')[0];
  const displayFirst = firstName
    ? firstName.charAt(0).toUpperCase() + firstName.slice(1)
    : 'there';

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const baseEpisodes = useMemo(() => (loading ? [] : episodes), [loading, episodes]);
  const filteredEpisodes = useMemo(() => {
    if (selectedDimension === 'all') return baseEpisodes;
    return baseEpisodes.filter((e) => e.dimension === selectedDimension);
  }, [baseEpisodes, selectedDimension]);

  const heroEpisode = baseEpisodes[0];
  const heroModule = heroEpisode ? getModuleById(heroEpisode.routeId) : null;
  const heroFallback = LEARNING_MODULES[0];
  const heroTitle = heroEpisode?.title ?? heroFallback.title;
  const heroDescription =
    (heroEpisode?.description?.trim() || heroModule?.description || heroFallback.description).slice(0, 160);
  const heroRouteId = heroEpisode?.routeId ?? heroFallback.id;
  const hasCatalog = baseEpisodes.length > 0;
  const heroProgress = hasCatalog ? 45 : 0;
  const heroMinLeft = hasCatalog ? 12 : 0;

  const countsByDim = useMemo(() => {
    const m: Partial<Record<EQDimension, number>> = {};
    for (const e of baseEpisodes) {
      m[e.dimension] = (m[e.dimension] ?? 0) + 1;
    }
    return m;
  }, [baseEpisodes]);

  const getDimensionName = (dim: EQDimension | 'all') =>
    dim === 'all' ? 'All skills' : DIMENSION_INFO[dim].name;

  const getEpisodeSubtitle = (title: string, dimension: EQDimension) =>
    isIntroEpisodeTitle(title) ? 'Introduction' : DIMENSION_INFO[dimension].name;

  const handleOpenEpisode = (routeId: string) => {
    router.push(`/learning-detail?id=${encodeURIComponent(routeId)}`);
  };

  const contentMaxWidth = Math.min(width, Layout.maxWidth);
  const horizontalPad = Math.min(Spacing.xl, Layout.paddingHorizontal);

  const st = createStyles(colors);

  return (
    <GlassBackground>
      <ScrollView
        style={st.container}
        contentContainerStyle={[st.scrollInner, { paddingBottom: 120, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader backFallbackHref="/(tabs)/home" showHomeButton />
        <View style={[st.shellPad, { paddingHorizontal: horizontalPad }]}>
          <View style={st.brandRow}>
            <Text style={st.brandText} accessibilityRole="header">
              lumi<Text style={{ color: colors.accentWarmTan }}>6</Text>
            </Text>
          </View>

          {/* Greeting */}
          <View style={st.greetBlock}>
            <Text style={st.heroGreeting} numberOfLines={2}>
              {greeting}, {displayFirst}
            </Text>
            <Text style={st.greetSub}>
              {hasCatalog
                ? "You're building momentum — pick up where you left off."
                : 'Start a lesson to begin your EQ journey.'}
            </Text>
          </View>

          {error ? (
            <View style={[st.banner, { borderColor: colors.border }]}>
              <Text style={st.bannerText}>{error}</Text>
              <TouchableOpacity onPress={reload}>
                <Text style={st.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!loading && !error && emptyRemote ? (
            <View style={[st.banner, { borderColor: colors.border }]}>
              <Text style={st.bannerText}>No learning content found. Run migrations in Supabase.</Text>
              <TouchableOpacity onPress={reload}>
                <Text style={st.retryText}>Reload</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!loading && !error && !isSupabaseConfigured() ? (
            <View style={[st.banner, { borderColor: colors.border }]}>
              <Text style={st.bannerText}>Supabase not configured. Set env variables and restart.</Text>
            </View>
          ) : null}

          {loading ? (
            <View style={st.loadingBlock}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={st.loadingHint}>Loading lessons…</Text>
            </View>
          ) : (
            <>
              {/* Hero + stats row (stacked on narrow; stats side-by-side) */}
              <View style={st.bentoCol}>
                <TouchableOpacity
                  activeOpacity={0.92}
                  onPress={() => handleOpenEpisode(heroRouteId)}
                  style={st.heroCard}
                >
                  <View style={st.heroGlow} />
                  <View style={st.heroTop}>
                    <View style={st.heroBadge}>
                      <View style={st.heroBadgeDot} />
                      <Text style={st.heroBadgeText}>Currently learning</Text>
                    </View>
                    <Text style={st.heroTitle} numberOfLines={3}>
                      {heroTitle}
                    </Text>
                    <Text style={st.heroBody} numberOfLines={4}>
                      {heroDescription}
                      {heroDescription.length >= 160 ? '…' : ''}
                    </Text>
                  </View>
                  <View>
                    <View style={st.heroMetaRow}>
                      <View style={st.heroMetaItem}>
                        <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.45)" />
                        <Text style={st.heroMetaText}>
                          {hasCatalog ? `${heroMinLeft} min est.` : '—'}
                        </Text>
                      </View>
                      <View style={st.heroMetaItem}>
                        <Ionicons name="analytics-outline" size={16} color="rgba(255,255,255,0.45)" />
                        <Text style={st.heroMetaText}>
                          {hasCatalog ? `${heroProgress}%` : '0%'} complete
                        </Text>
                      </View>
                    </View>
                    <View style={st.heroCta}>
                      <Ionicons name="play" size={18} color={colors.primary} />
                      <Text style={st.heroCtaText}>Continue learning</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                <View style={st.statsRow}>
                  <View style={[st.statCard, { borderColor: colors.border }]}>
                    <View style={st.statHead}>
                      <Ionicons name="flame-outline" size={24} color={colors.accentTerracotta} />
                      <Text style={st.statLabelUpper}>This week</Text>
                    </View>
                    <Text style={st.statNumber}>—</Text>
                    <Text style={st.statCaption}>Day streak</Text>
                    <View style={st.streakDots}>
                      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                        <View key={i} style={[st.streakSeg, { backgroundColor: colors.border }]} />
                      ))}
                    </View>
                  </View>
                  <View style={[st.statCard, { borderColor: colors.border }]}>
                    <View style={st.statHead}>
                      <Ionicons name="trending-up-outline" size={24} color={colors.accentSage} />
                      <Text style={st.statLabelUpper}>Overall</Text>
                    </View>
                    <Text style={st.statNumber}>
                      {hasCatalog ? '28' : '0'}
                      <Text style={st.statNumberSuffix}>%</Text>
                    </Text>
                    <Text style={st.statCaption}>Journey complete</Text>
                    <View style={st.progressTrack}>
                      <View
                        style={[
                          st.progressFill,
                          { width: `${hasCatalog ? 28 : 0}%`, backgroundColor: colors.accentSage },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              </View>

              {/* Explore competencies */}
              <View style={st.sectionHead}>
                <Text style={st.sectionTitle}>Explore competencies</Text>
                <TouchableOpacity
                  onPress={() => setSelectedDimension('all')}
                  hitSlop={12}
                  style={st.sectionLinkRow}
                >
                  <Text style={st.sectionLink}>View all</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={st.competencyGrid}>
                {COMPETENCY_BENTO.map((c) => {
                  const n = countsByDim[c.dim] ?? 0;
                  const pct = n > 0 ? Math.min(95, 15 + n * 12) : 0;
                  return (
                    <TouchableOpacity
                      key={c.dim}
                      style={[st.competencyCard, { borderColor: colors.border }]}
                      onPress={() => {
                        setSelectedDimension(c.dim);
                      }}
                      activeOpacity={0.85}
                    >
                      <View style={st.competencyTop}>
                        <View style={[st.competencyDot, { backgroundColor: c.dot }]} />
                        <Ionicons name="arrow-forward" size={16} color={colors.textLight} />
                      </View>
                      <Text style={st.competencyTitle}>{c.title}</Text>
                      <Text style={st.competencySub}>{c.subtitle}</Text>
                      <View style={st.competencyFoot}>
                        <View style={st.miniBarTrack}>
                          <View
                            style={[
                              st.miniBarFill,
                              { width: `${pct}%`, backgroundColor: c.dot },
                            ]}
                          />
                        </View>
                        <Text style={st.competencyPct}>{pct > 0 ? `${pct}%` : 'Start'}</Text>
                      </View>
                      <Text style={st.competencyLessons}>{n} lesson{n === 1 ? '' : 's'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* AI assistant strip */}
              <LinearGradient
                colors={['#FAF5F0', '#F5EDE3']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[st.aiStrip, { borderColor: colors.border }]}
              >
                <View style={[st.aiIconWrap, { borderColor: colors.border }]}>
                  <Ionicons name="sparkles" size={26} color={colors.accentWarmTan} />
                </View>
                <View style={st.aiTextCol}>
                  <Text style={st.aiTitle}>AI learning assistant</Text>
                  <Text style={st.aiSub}>Get personalized insights based on your progress</Text>
                </View>
                <TouchableOpacity
                  style={[st.aiBtn, { backgroundColor: colors.primary }]}
                  onPress={() => router.push('/chat')}
                  activeOpacity={0.88}
                >
                  <Text style={st.aiBtnText}>Ask AI</Text>
                </TouchableOpacity>
              </LinearGradient>

              {/* Quick stats */}
              <View style={[st.quickStats, { borderColor: colors.border }]}>
                <View style={st.quickStatCell}>
                  <Text style={st.quickStatVal}>{baseEpisodes.length}</Text>
                  <Text style={st.quickStatCap}>Lessons live</Text>
                </View>
                <View style={[st.quickStatDivider, { backgroundColor: colors.border }]} />
                <View style={st.quickStatCell}>
                  <Text style={st.quickStatVal}>{filteredEpisodes.length}</Text>
                  <Text style={st.quickStatCap}>Shown</Text>
                </View>
                <View style={[st.quickStatDivider, { backgroundColor: colors.border }]} />
                <View style={st.quickStatCell}>
                  <Text style={st.quickStatVal}>—</Text>
                  <Text style={st.quickStatCap}>Time invested</Text>
                </View>
              </View>

              {/* Filters + episodes */}
              <View style={st.sectionHead}>
                <Text style={st.sectionTitle}>Browse lessons</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={st.filterContainer}
              >
                {DIMENSION_FILTERS.map((dim) => (
                  <TouchableOpacity
                    key={dim}
                    onPress={() => setSelectedDimension(dim)}
                    style={[
                      st.filterChip,
                      { borderColor: colors.border },
                      selectedDimension === dim && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                  >
                    <Text
                      style={[
                        st.filterChipText,
                        selectedDimension === dim && { color: colors.primaryForeground },
                      ]}
                    >
                      {getDimensionName(dim)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={st.episodeList}>
                {filteredEpisodes.length === 0 ? (
                  <Text style={st.emptyText}>No lessons match this filter.</Text>
                ) : (
                  filteredEpisodes.map((ep) => (
                    <TouchableOpacity
                      key={ep.episodeKey}
                      style={[st.courseCard, { borderColor: colors.border }]}
                      onPress={() => handleOpenEpisode(ep.routeId)}
                      activeOpacity={0.88}
                    >
                      <View style={st.courseCardTop}>
                        <Text style={st.courseCat}>{getEpisodeSubtitle(ep.title, ep.dimension)}</Text>
                        <Ionicons name="bookmark-outline" size={18} color={colors.textLight} />
                      </View>
                      <Text style={st.courseTitle} numberOfLines={2}>
                        {ep.title}
                      </Text>
                      <View style={st.courseMetaRow}>
                        <Ionicons name="time-outline" size={14} color={colors.textLight} />
                        <Text style={st.courseMetaText}>Lesson</Text>
                        {ep.videoUrl ? (
                          <>
                            <Ionicons name="videocam-outline" size={14} color={colors.textLight} />
                            <Text style={st.courseMetaText}>Video</Text>
                          </>
                        ) : null}
                        {ep.audioUrl ? (
                          <>
                            <Ionicons name="headset-outline" size={14} color={colors.textLight} />
                            <Text style={st.courseMetaText}>Audio</Text>
                          </>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </GlassBackground>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1 },
    scrollInner: {},
    shellPad: { width: '100%' },
    brandRow: { marginBottom: Spacing.md },
    brandText: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.medium,
      color: colors.textPrimary,
      letterSpacing: -0.2,
    },
    greetBlock: { marginBottom: Spacing['2xl'] },
    heroGreeting: {
      fontSize: Typography.fontSize.hero,
      fontWeight: Typography.fontWeight.medium,
      color: colors.textPrimary,
      letterSpacing: Typography.letterSpacing.tight,
      marginBottom: Spacing.sm,
      lineHeight: Typography.fontSize.hero * 1.1,
    },
    greetSub: {
      fontSize: Typography.fontSize.lg,
      color: colors.textMuted,
      fontWeight: Typography.fontWeight.normal,
    },
    banner: {
      padding: Spacing.md,
      borderRadius: Radius.md,
      borderWidth: 1,
      marginBottom: Spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.sm,
      backgroundColor: colors.floating,
    },
    bannerText: { flex: 1, fontSize: Typography.fontSize.sm, color: colors.textSecondary },
    retryText: { fontSize: Typography.fontSize.sm, color: colors.primary, fontWeight: '600' },
    loadingBlock: { paddingVertical: Spacing['3xl'], alignItems: 'center', gap: Spacing.md },
    loadingHint: { fontSize: Typography.fontSize.sm, color: colors.textMuted },
    bentoCol: { gap: Spacing.md, marginBottom: Spacing.xl },
    heroCard: {
      backgroundColor: colors.primary,
      borderRadius: Radius.xl,
      padding: Spacing.xl,
      minHeight: 280,
      overflow: 'hidden',
      justifyContent: 'space-between',
      ...Platform.select({
        web: { boxShadow: '0 8px 32px rgba(45, 71, 57, 0.25)' } as object,
        default: {
          shadowColor: '#2D4739',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.25,
          shadowRadius: 24,
          elevation: 8,
        },
      }),
    },
    heroGlow: {
      position: 'absolute',
      top: -100,
      right: -100,
      width: 400,
      height: 400,
      borderRadius: 200,
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    heroTop: { position: 'relative', zIndex: 1 },
    heroBadge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(255,255,255,0.1)',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 20,
      marginBottom: Spacing.lg,
    },
    heroBadgeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#4ADE80',
    },
    heroBadgeText: {
      color: 'rgba(255,255,255,0.72)',
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.medium,
    },
    heroTitle: {
      color: '#FFFFFF',
      fontSize: Typography.fontSize.heroCard,
      fontWeight: Typography.fontWeight.medium,
      letterSpacing: Typography.letterSpacing.snug,
      marginBottom: Spacing.sm,
      lineHeight: Typography.fontSize.heroCard * 1.2,
      maxWidth: 420,
    },
    heroBody: {
      color: 'rgba(255,255,255,0.55)',
      fontSize: Typography.fontSize.base,
      lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
      maxWidth: 400,
    },
    heroMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.lg,
      marginBottom: Spacing.lg,
    },
    heroMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    heroMetaText: { color: 'rgba(255,255,255,0.65)', fontSize: Typography.fontSize.sm },
    heroCta: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: '#FFFFFF',
      paddingVertical: 14,
      paddingHorizontal: Spacing.lg,
      borderRadius: Radius.md,
    },
    heroCtaText: {
      color: colors.primary,
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
    },
    statsRow: {
      flexDirection: 'row',
      gap: Spacing.md,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.floating,
      borderRadius: Radius.xl,
      padding: Spacing.lg,
      borderWidth: 1,
      minWidth: 0,
    },
    statHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.md,
    },
    statLabelUpper: {
      fontSize: Typography.fontSize.micro,
      color: colors.textMuted,
      fontWeight: Typography.fontWeight.medium,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    statNumber: {
      fontSize: Typography.fontSize.largeNumber,
      fontWeight: Typography.fontWeight.medium,
      color: colors.textPrimary,
      letterSpacing: Typography.letterSpacing.tight,
      lineHeight: Typography.fontSize.largeNumber,
      marginBottom: 4,
    },
    statNumberSuffix: {
      fontSize: Typography.fontSize['2xl'],
      color: colors.textMuted,
    },
    statCaption: { color: colors.textMuted, fontSize: Typography.fontSize.sm },
    streakDots: { flexDirection: 'row', gap: 4, marginTop: Spacing.md },
    streakSeg: { flex: 1, height: 4, borderRadius: 2 },
    progressTrack: {
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      marginTop: Spacing.md,
      overflow: 'hidden',
    },
    progressFill: { height: '100%', borderRadius: 2 },
    sectionHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: Spacing.lg,
      marginBottom: Spacing.sm,
    },
    sectionTitle: {
      fontSize: Typography.fontSize.section,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      textTransform: 'uppercase',
      letterSpacing: Typography.letterSpacing.section,
    },
    sectionLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    sectionLink: {
      fontSize: Typography.fontSize.sm,
      color: colors.textMuted,
    },
    competencyGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.md,
      marginBottom: Spacing.xl,
    },
    competencyCard: {
      width: '47.5%',
      flexGrow: 1,
      minWidth: 148,
      maxWidth: '48%',
      backgroundColor: colors.floating,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      borderWidth: 1,
    },
    competencyTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.md,
    },
    competencyDot: { width: 10, height: 10, borderRadius: 5 },
    competencyTitle: {
      fontSize: Typography.fontSize.cardTitle,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      marginBottom: 4,
    },
    competencySub: {
      fontSize: Typography.fontSize.sm,
      color: colors.textMuted,
      marginBottom: Spacing.md,
    },
    competencyFoot: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.sm,
    },
    miniBarTrack: {
      flex: 1,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      overflow: 'hidden',
    },
    miniBarFill: { height: '100%', borderRadius: 2 },
    competencyPct: { fontSize: Typography.fontSize.sm, color: colors.textSecondary, fontWeight: Typography.fontWeight.medium },
    competencyLessons: { fontSize: Typography.fontSize.xs, color: colors.textLight, marginTop: Spacing.sm },
    aiStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.lg,
      padding: Spacing.lg + 2,
      borderRadius: Radius.xl,
      borderWidth: 1,
      marginBottom: Spacing.lg,
    },
    aiIconWrap: {
      width: 56,
      height: 56,
      borderRadius: Radius.md,
      backgroundColor: colors.floating,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      ...Platform.select({
        web: { boxShadow: '0 2px 8px rgba(0,0,0,0.04)' } as object,
        default: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 2,
        },
      }),
    },
    aiTextCol: { flex: 1, minWidth: 0 },
    aiTitle: {
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      marginBottom: 4,
    },
    aiSub: { fontSize: Typography.fontSize.sm, color: colors.textMuted },
    aiBtn: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: Radius.sm,
    },
    aiBtnText: {
      color: colors.primaryForeground,
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.medium,
    },
    quickStats: {
      flexDirection: 'row',
      alignItems: 'stretch',
      justifyContent: 'space-around',
      backgroundColor: colors.floating,
      borderRadius: Radius.xl,
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing.sm,
      borderWidth: 1,
      marginBottom: Spacing.xl,
    },
    quickStatCell: { flex: 1, alignItems: 'center' },
    quickStatDivider: { width: StyleSheet.hairlineWidth * 2, minHeight: 40 },
    quickStatVal: {
      fontSize: Typography.fontSize['2xl'],
      fontWeight: Typography.fontWeight.medium,
      color: colors.textPrimary,
      letterSpacing: -0.5,
      marginBottom: 2,
    },
    quickStatCap: { fontSize: Typography.fontSize.xs, color: colors.textMuted },
    filterContainer: {
      paddingBottom: Spacing.md,
      gap: Spacing.sm,
      flexDirection: 'row',
    },
    filterChip: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.full,
      backgroundColor: colors.floating,
      borderWidth: 1,
    },
    filterChipText: {
      fontSize: Typography.fontSize.sm,
      color: colors.textPrimary,
      fontWeight: Typography.fontWeight.medium,
    },
    episodeList: { gap: Spacing.md, marginTop: Spacing.sm, paddingBottom: Spacing.md },
    emptyText: { fontSize: Typography.fontSize.sm, color: colors.textMuted, paddingVertical: Spacing.md },
    courseCard: {
      backgroundColor: colors.floating,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      borderWidth: 1,
    },
    courseCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.sm,
    },
    courseCat: {
      fontSize: Typography.fontSize.micro,
      fontWeight: Typography.fontWeight.medium,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    courseTitle: {
      fontSize: Typography.fontSize.cardTitle,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      marginBottom: Spacing.sm,
    },
    courseMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      flexWrap: 'wrap',
    },
    courseMetaText: { fontSize: Typography.fontSize.sm, color: colors.textMuted },
  });
