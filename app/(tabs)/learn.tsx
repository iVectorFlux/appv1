/**
 * Learn Screen - Editorial wellness
 *
 * Catalog from Supabase learning_content with frosted glass cards.
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import { GlassBackground } from '@/components/ui/glass-background';
import { GlassCard } from '@/components/ui/glass-card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { DIMENSION_INFO } from '@/data/learning-content';
import type { EQDimension } from '@/types/eq-assessment';
import { useLearningCatalog, type LearningCatalogAudienceFilter } from '@/hooks/useLearningCatalog';
import { isIntroEpisodeTitle } from '@/services/learning-content-catalog';
import { isSupabaseConfigured } from '@/lib/supabase';

const DIMENSION_FILTERS: (EQDimension | 'all')[] = [
  'all', 'self_awareness', 'self_regulation', 'empathy', 'social_skills', 'motivation', 'resilience',
];

export default function LearnScreen() {
  const router = useRouter();
  const colors = useColors();
  const [audience, setAudience] = useState<LearningCatalogAudienceFilter>('B2C');
  const { episodes, loading, error, reload, emptyRemote } = useLearningCatalog(audience);
  const [selectedDimension, setSelectedDimension] = useState<EQDimension | 'all'>('all');

  const baseEpisodes = useMemo(() => (loading ? [] : episodes), [loading, episodes]);
  const filteredEpisodes = useMemo(() => {
    if (selectedDimension === 'all') return baseEpisodes;
    return baseEpisodes.filter((e) => e.dimension === selectedDimension);
  }, [baseEpisodes, selectedDimension]);

  const getDimensionName = (dim: EQDimension | 'all') => dim === 'all' ? 'All skills' : DIMENSION_INFO[dim].name;
  const getEpisodeSubtitle = (title: string, dimension: EQDimension) =>
    isIntroEpisodeTitle(title) ? 'Introduction' : DIMENSION_INFO[dimension].name;

  const audienceLabel: Record<LearningCatalogAudienceFilter, string> = {
    B2C: 'Personal',
    B2B: 'Workplace',
    all: 'All',
  };
  const AUDIENCE_OPTIONS: LearningCatalogAudienceFilter[] = ['B2C', 'B2B', 'all'];

  const handleOpenEpisode = (routeId: string) => {
    router.push(`/learning-detail?id=${encodeURIComponent(routeId)}`);
  };

  const st = createStyles(colors);

  return (
    <GlassBackground>
      <ScrollView style={st.container} contentContainerStyle={st.content}>
        <ScreenHeader title="Learn EQ" backFallbackHref="/(tabs)/home" showHomeButton />
        <View style={st.headerTextBlock}>
          <Text style={st.subtitle}>Build emotional intelligence with expert-led content</Text>
        </View>

        {error ? (
          <GlassCard>
            <View style={st.bannerRow}>
              <Text style={st.bannerText}>{error}</Text>
              <TouchableOpacity onPress={reload}><Text style={st.retryText}>Retry</Text></TouchableOpacity>
            </View>
          </GlassCard>
        ) : null}

        {!loading && !error && emptyRemote ? (
          <GlassCard style={st.bannerCard}>
            <Text style={st.bannerText}>No learning content found. Run migrations in Supabase.</Text>
            <TouchableOpacity onPress={reload}><Text style={st.retryText}>Reload</Text></TouchableOpacity>
          </GlassCard>
        ) : null}

        {!loading && !error && !isSupabaseConfigured() ? (
          <GlassCard style={st.bannerCard}>
            <Text style={st.bannerText}>Supabase not configured. Set env variables and restart.</Text>
          </GlassCard>
        ) : null}

        {loading ? (
          <View style={st.loadingBlock}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={st.loadingHint}>Loading lessons…</Text>
          </View>
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={st.audienceFilterRow}
            >
              {AUDIENCE_OPTIONS.map((a) => (
                <TouchableOpacity
                  key={a}
                  onPress={() => setAudience(a)}
                  style={[st.filterChip, audience === a && st.filterChipSelected]}
                >
                  <Text style={[st.filterChipText, audience === a && st.filterChipTextSelected]}>
                    {audienceLabel[a]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={st.filterContainer}
            >
              {DIMENSION_FILTERS.map((dim) => (
                <TouchableOpacity
                  key={dim}
                  onPress={() => setSelectedDimension(dim)}
                  style={[st.filterChip, selectedDimension === dim && st.filterChipSelected]}
                >
                  <Text style={[st.filterChipText, selectedDimension === dim && st.filterChipTextSelected]}>
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
                  <GlassCard key={ep.episodeKey} onPress={() => handleOpenEpisode(ep.routeId)}>
                    <View style={st.episodeRow}>
                      <View style={[st.episodeIcon, { backgroundColor: (ep.color || colors.primary) + '18' }]}>
                        <Ionicons name={(ep.icon as any) || 'book-outline'} size={20} color={ep.color || colors.primary} />
                      </View>
                      <View style={st.episodeText}>
                        <Text style={st.episodeTitle} numberOfLines={2}>{ep.title}</Text>
                        <Text style={st.episodeSubtitle}>{getEpisodeSubtitle(ep.title, ep.dimension)}</Text>
                        <View style={st.metaRow}>
                          {ep.videoUrl && (
                            <View style={st.metaItem}>
                              <Ionicons name="videocam-outline" size={12} color={colors.textMuted} />
                              <Text style={st.metaText}>Video</Text>
                            </View>
                          )}
                          {ep.audioUrl && (
                            <View style={st.metaItem}>
                              <Ionicons name="headset-outline" size={12} color={colors.textMuted} />
                              <Text style={st.metaText}>Audio</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
                    </View>
                  </GlassCard>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </GlassBackground>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1 },
    content: { paddingBottom: 120 },
    headerTextBlock: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg },
    subtitle: { fontSize: Typography.fontSize.sm, color: colors.textSecondary, lineHeight: Typography.lineHeight.normal * Typography.fontSize.sm },
    bannerCard: { marginHorizontal: Spacing.md, marginBottom: Spacing.md },
    bannerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
    bannerText: { flex: 1, fontSize: Typography.fontSize.sm, color: colors.textSecondary },
    retryText: { fontSize: Typography.fontSize.sm, color: colors.primary, fontWeight: '600' },
    loadingBlock: { paddingVertical: Spacing['2xl'], alignItems: 'center', gap: Spacing.md },
    loadingHint: { fontSize: Typography.fontSize.sm, color: colors.textMuted },
    audienceFilterRow: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.sm },
    filterContainer: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, gap: Spacing.sm },
    filterChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder },
    filterChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterChipText: { fontSize: Typography.fontSize.sm, color: colors.textPrimary, fontWeight: Typography.fontWeight.medium },
    filterChipTextSelected: { color: colors.primaryForeground },
    episodeList: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
    emptyText: { paddingHorizontal: Spacing.lg, fontSize: Typography.fontSize.sm, color: colors.textMuted },
    episodeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    episodeIcon: { width: 40, height: 40, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    episodeText: { flex: 1 },
    episodeTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: colors.textPrimary, marginBottom: 2 },
    episodeSubtitle: { fontSize: Typography.fontSize.xs, color: colors.textSecondary, marginBottom: 4 },
    metaRow: { flexDirection: 'row', gap: Spacing.sm },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    metaText: { fontSize: Typography.fontSize.micro, color: colors.textMuted },
  });
