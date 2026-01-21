/**
 * Learn Screen
 * 
 * EQ skill learning with video lessons and audio podcasts.
 * Deep dive content for each dimension.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColors, Spacing, Typography, Radius, Shadows } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import { LEARNING_MODULES, DIMENSION_INFO } from '@/data/learning-content';
import type { EQDimension } from '@/types/eq-assessment';

const DIMENSION_FILTERS: (EQDimension | 'all')[] = [
  'all',
  'self_awareness',
  'self_regulation',
  'empathy',
  'social_skills',
  'motivation',
];

export default function LearnScreen() {
  const router = useRouter();
  const colors = useColors();
  const [selectedDimension, setSelectedDimension] = useState<EQDimension | 'all'>('all');

  const filteredModules = selectedDimension === 'all'
    ? LEARNING_MODULES
    : LEARNING_MODULES.filter(m => m.dimension === selectedDimension);

  const handleModulePress = (moduleId: string) => {
    router.push(`/learning-detail?id=${moduleId}`);
  };

  const getDimensionName = (dim: EQDimension | 'all') => {
    if (dim === 'all') return 'All Skills';
    return DIMENSION_INFO[dim].name;
  };

  const styles = createStyles(colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Learn</Text>
        <Text style={styles.subtitle}>
          Build emotional intelligence with expert-led content
        </Text>
      </View>

      {/* Featured Section */}
      <View style={styles.featuredSection}>
        <Text style={styles.sectionTitle}>Featured</Text>
        <TouchableOpacity
          style={[styles.featuredCard, { backgroundColor: LEARNING_MODULES[0].color + '15' }]}
          onPress={() => handleModulePress(LEARNING_MODULES[0].id)}
        >
          <View style={styles.featuredContent}>
            <View style={styles.featuredBadge}>
              <Ionicons name="star" size={12} color="#fff" />
              <Text style={styles.featuredBadgeText}>Most Popular</Text>
            </View>
            <Text style={styles.featuredTitle}>{LEARNING_MODULES[0].title}</Text>
            <Text style={styles.featuredSubtitle}>{LEARNING_MODULES[0].subtitle}</Text>
            <View style={styles.featuredMeta}>
              <View style={styles.featuredMetaItem}>
                <Ionicons name="videocam-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.featuredMetaText}>{LEARNING_MODULES[0].videoDuration}</Text>
              </View>
              <View style={styles.featuredMetaItem}>
                <Ionicons name="headset-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.featuredMetaText}>{LEARNING_MODULES[0].audioDuration}</Text>
              </View>
            </View>
          </View>
          <View style={[styles.featuredIcon, { backgroundColor: LEARNING_MODULES[0].color }]}>
            <Ionicons name={LEARNING_MODULES[0].icon as any} size={32} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Dimension Filters */}
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

      {/* Modules Grid */}
      <View style={styles.modulesSection}>
        <Text style={styles.sectionTitle}>
          {selectedDimension === 'all' ? 'All Modules' : getDimensionName(selectedDimension)}
        </Text>
        
        <View style={styles.modulesGrid}>
          {filteredModules.map((module) => (
            <TouchableOpacity
              key={module.id}
              style={[styles.moduleCard, Shadows.sm]}
              onPress={() => handleModulePress(module.id)}
            >
              <View style={[styles.moduleIcon, { backgroundColor: module.color + '20' }]}>
                <Ionicons name={module.icon as any} size={28} color={module.color} />
              </View>
              
              <Text style={styles.moduleTitle} numberOfLines={2}>
                {module.title}
              </Text>
              
              <Text style={styles.moduleDimension}>
                {DIMENSION_INFO[module.dimension].name}
              </Text>
              
              <View style={styles.moduleMeta}>
                <View style={styles.moduleMediaBadge}>
                  <Ionicons name="videocam" size={12} color={colors.textMuted} />
                  <Text style={styles.moduleMetaText}>{module.videoDuration}</Text>
                </View>
                <View style={styles.moduleMediaBadge}>
                  <Ionicons name="headset" size={12} color={colors.textMuted} />
                  <Text style={styles.moduleMetaText}>{module.audioDuration}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Audio Section - Deep Dives */}
      <View style={styles.audioSection}>
        <View style={styles.audioHeader}>
          <View style={styles.audioHeaderIcon}>
            <Ionicons name="headset" size={24} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.audioTitle}>Deep Dive Podcasts</Text>
            <Text style={styles.audioSubtitle}>
              Extended audio sessions for deeper learning
            </Text>
          </View>
        </View>
        
        {LEARNING_MODULES.map((module) => (
          <TouchableOpacity
            key={`audio-${module.id}`}
            style={styles.audioItem}
            onPress={() => handleModulePress(module.id)}
          >
            <View style={[styles.audioItemIcon, { backgroundColor: module.color + '20' }]}>
              <Ionicons name={module.icon as any} size={20} color={module.color} />
            </View>
            <View style={styles.audioItemContent}>
              <Text style={styles.audioItemTitle}>{module.title}</Text>
              <Text style={styles.audioItemDimension}>
                {DIMENSION_INFO[module.dimension].name} • {module.audioDuration}
              </Text>
            </View>
            <Ionicons name="play-circle" size={32} color={module.color} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: Spacing['5xl'],
  },
  header: {
    padding: Spacing.xl,
    paddingTop: Platform.OS === 'ios' ? 60 : Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: colors.textSecondary,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  // Featured
  featuredSection: {
    marginBottom: Spacing.xl,
  },
  featuredCard: {
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featuredContent: {
    flex: 1,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
  },
  featuredBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: '#fff',
  },
  featuredTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  featuredSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: Spacing.md,
  },
  featuredMeta: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  featuredMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  featuredMetaText: {
    fontSize: Typography.fontSize.xs,
    color: colors.textSecondary,
  },
  featuredIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.md,
  },
  // Filters
  filterContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
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
  // Modules Grid
  modulesSection: {
    marginBottom: Spacing.xl,
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  moduleCard: {
    width: '47%',
    backgroundColor: colors.floating,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  moduleIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  moduleTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
    lineHeight: Typography.lineHeight.tight * Typography.fontSize.base,
  },
  moduleDimension: {
    fontSize: Typography.fontSize.xs,
    color: colors.textSecondary,
    marginBottom: Spacing.md,
  },
  moduleMeta: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  moduleMediaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  moduleMetaText: {
    fontSize: Typography.fontSize.xs,
    color: colors.textMuted,
  },
  // Audio Section
  audioSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  audioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  audioHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  audioSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
  },
  audioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  audioItemIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioItemContent: {
    flex: 1,
  },
  audioItemTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  audioItemDimension: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
  },
});
