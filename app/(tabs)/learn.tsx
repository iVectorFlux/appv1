/**
 * Learn Screen — catalog from Supabase learning_content (personal / B2C only).
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import { FeatureCard } from '@/components/ui/feature-card';
import { ModuleCard } from '@/components/ui/module-card';
import { SectionHeaderCard } from '@/components/ui/section-header-card';
import { AudioRowCard } from '@/components/ui/audio-row-card';
import { DIMENSION_INFO } from '@/data/learning-content';
import type { EQDimension } from '@/types/eq-assessment';
import { useLearningCatalog } from '@/hooks/useLearningCatalog';
import { isIntroEpisodeTitle } from '@/services/learning-content-catalog';
import { isSupabaseConfigured } from '@/lib/supabase';

const DIMENSION_FILTERS: (EQDimension | 'all')[] = [
  'all',
  'self_awareness',
  'self_regulation',
  'empathy',
  'social_skills',
  'motivation',
  'resilience',
];

export default function LearnScreen() {
  const router = useRouter();
  const colors = useColors();
  const { episodes, loading, error, reload, emptyRemote } = useLearningCatalog();
  const [selectedDimension, setSelectedDimension] = useState<EQDimension | 'all'>('all');

  const baseEpisodes = useMemo(() => {
    if (loading) return [];
    return episodes;
  }, [loading, episodes]);

  const filteredEpisodes = useMemo(() => {
    if (selectedDimension === 'all') return baseEpisodes;
    return baseEpisodes.filter((e) => e.dimension === selectedDimension);
  }, [baseEpisodes, selectedDimension]);

  const featured = filteredEpisodes[0];

  const handleOpenEpisode = (routeId: string) => {
    router.push(`/learning-detail?id=${encodeURIComponent(routeId)}`);
  };

  const getDimensionName = (dim: EQDimension | 'all') => {
    if (dim === 'all') return 'All skills';
    return DIMENSION_INFO[dim].name;
  };
  const getEpisodeSubtitle = (title: string, dimension: EQDimension) =>
    isIntroEpisodeTitle(title) ? 'Introduction' : DIMENSION_INFO[dimension].name;

  const styles = createStyles(colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Learn</Text>
        <Text style={styles.subtitle}>
          Build emotional intelligence with expert-led content
        </Text>
      </View>

      {error ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{error}</Text>
          <TouchableOpacity onPress={reload} style={styles.bannerBtn}>
            <Text style={styles.bannerBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!loading && !error && emptyRemote ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            No learning content found in the database. Run migrations `00010`, `00011`, `00012` in Supabase SQL Editor.
          </Text>
          <TouchableOpacity onPress={reload} style={styles.bannerBtn}>
            <Text style={styles.bannerBtnText}>Reload</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!loading && !error && !isSupabaseConfigured() ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Supabase is not configured. Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY` in `.env`, then restart.
          </Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loadingBlock}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingHint}>Loading lessons…</Text>
        </View>
      ) : (
        <>
          {featured ? (
            <View style={styles.featuredSection}>
              <Text style={styles.sectionTitle}>Featured</Text>
              <FeatureCard
                onPress={() => handleOpenEpisode(featured.routeId)}
                title={featured.title}
                subtitle={getEpisodeSubtitle(featured.title, featured.dimension)}
                badge={featured.sortOrder === 1 ? 'Start here' : 'Featured'}
                meta={[
                  ...(featured.videoUrl
                    ? [{ icon: 'videocam-outline' as const, text: 'Video lesson' }]
                    : []),
                  ...(featured.audioUrl
                    ? [{ icon: 'headset-outline' as const, text: 'Podcast' }]
                    : []),
                ]}
                icon={featured.icon as any}
                iconBackgroundColor={featured.color}
                backgroundColor={featured.color + '15'}
              />
            </View>
          ) : null}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContainer}
          >
            {DIMENSION_FILTERS.map((dim) => (
              <TouchableOpacity
                key={dim}
                onPress={() => setSelectedDimension(dim)}
                style={[
                  styles.filterChip,
                  selectedDimension === dim && styles.filterChipSelected,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedDimension === dim && styles.filterChipTextSelected,
                  ]}
                >
                  {getDimensionName(dim)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.modulesSection}>
            <Text style={styles.sectionTitle}>
              Lessons · {selectedDimension === 'all' ? 'All skills' : getDimensionName(selectedDimension)}
            </Text>
            {filteredEpisodes.length === 0 ? (
              <Text style={styles.emptyText}>
                No lessons match this filter. Try another skill.
              </Text>
            ) : (
              <View style={styles.modulesGrid}>
                {filteredEpisodes.map((ep) => (
                  <ModuleCard
                    key={ep.episodeKey}
                    onPress={() => handleOpenEpisode(ep.routeId)}
                    title={ep.title}
                    subtitle={getEpisodeSubtitle(ep.title, ep.dimension)}
                    meta={[
                      ...(ep.videoUrl
                        ? [{ icon: 'videocam' as const, text: 'Video' }]
                        : []),
                      ...(ep.audioUrl
                        ? [{ icon: 'headset' as const, text: 'Audio' }]
                        : []),
                    ]}
                    icon={ep.icon as any}
                    iconColor={ep.color}
                    iconBackgroundColor={ep.color + '20'}
                  />
                ))}
              </View>
            )}
          </View>

          <View style={styles.audioSection}>
            <SectionHeaderCard
              title="Deep dive podcasts"
              subtitle="Extended audio sessions for deeper learning"
              icon="headset"
            />
            {filteredEpisodes.filter((ep) => Boolean(ep.audioUrl)).map((ep) => (
              <AudioRowCard
                key={`audio-${ep.episodeKey}`}
                onPress={() => handleOpenEpisode(ep.routeId)}
                title={ep.title}
                subtitle={getEpisodeSubtitle(ep.title, ep.dimension)}
                icon={ep.icon as any}
                iconBackgroundColor={ep.color + '20'}
                iconColor={ep.color}
              />
            ))}
          </View>
        </>
      )}
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
      paddingBottom: Spacing['2xl'],
    },
    header: {
      paddingHorizontal: Spacing.md,
      paddingTop: Platform.OS === 'ios' ? 52 : Spacing.lg,
      paddingBottom: Spacing.md,
    },
    title: {
      fontSize: Typography.fontSize['2xl'],
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
      marginBottom: Spacing.xs,
    },
    subtitle: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      lineHeight: Typography.lineHeight.normal * Typography.fontSize.sm,
    },
    banner: {
      marginHorizontal: Spacing.md,
      marginBottom: Spacing.md,
      padding: Spacing.md,
      borderRadius: Radius.lg,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.sm,
    },
    bannerText: { flex: 1, fontSize: Typography.fontSize.sm, color: colors.textSecondary },
    bannerBtn: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm },
    bannerBtnText: { fontSize: Typography.fontSize.sm, color: colors.primary, fontWeight: '600' },
    sectionTitle: {
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textMuted,
      marginBottom: Spacing.sm,
      paddingHorizontal: Spacing.md,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    featuredSection: {
      marginBottom: Spacing.lg,
      paddingHorizontal: Spacing.md,
    },
    filterContainer: {
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing.md,
      gap: Spacing.sm,
    },
    filterChip: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.full,
      backgroundColor: colors.surface,
    },
    filterChipSelected: {
      backgroundColor: colors.primary,
    },
    filterChipText: {
      fontSize: Typography.fontSize.sm,
      color: colors.textPrimary,
      fontWeight: Typography.fontWeight.medium,
    },
    filterChipTextSelected: {
      color: colors.primaryForeground,
    },
    loadingBlock: {
      paddingVertical: Spacing['2xl'],
      alignItems: 'center',
      gap: Spacing.md,
    },
    loadingHint: {
      fontSize: Typography.fontSize.sm,
      color: colors.textMuted,
    },
    modulesSection: {
      marginBottom: Spacing.lg,
    },
    modulesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: Spacing.md,
      gap: Spacing.sm,
    },
    emptyText: {
      paddingHorizontal: Spacing.lg,
      fontSize: Typography.fontSize.sm,
      color: colors.textMuted,
    },
    audioSection: {
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
  });
