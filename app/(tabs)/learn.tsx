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
import { FeatureCard } from '@/components/ui/feature-card';
import { ModuleCard } from '@/components/ui/module-card';
import { SectionHeaderCard } from '@/components/ui/section-header-card';
import { AudioRowCard } from '@/components/ui/audio-row-card';
import { LEARNING_MODULES, DIMENSION_INFO } from '@/data/learning-content';
import type { EQDimension } from '@/types/eq-assessment';

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
        <FeatureCard
          onPress={() => handleModulePress(LEARNING_MODULES[0].id)}
          title={LEARNING_MODULES[0].title}
          subtitle={LEARNING_MODULES[0].subtitle}
          badge="Most Popular"
          meta={[
            { icon: 'videocam-outline', text: LEARNING_MODULES[0].videoDuration },
            { icon: 'headset-outline', text: LEARNING_MODULES[0].audioDuration },
          ]}
          icon={LEARNING_MODULES[0].icon as any}
          iconBackgroundColor={LEARNING_MODULES[0].color}
          backgroundColor={LEARNING_MODULES[0].color + '15'}
        />
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
            <ModuleCard
              key={module.id}
              onPress={() => handleModulePress(module.id)}
              title={module.title}
              subtitle={DIMENSION_INFO[module.dimension].name}
              meta={[
                { icon: 'videocam', text: module.videoDuration },
                { icon: 'headset', text: module.audioDuration },
              ]}
              icon={module.icon as any}
              iconColor={module.color}
              iconBackgroundColor={module.color + '20'}
            />
          ))}
        </View>
      </View>

      {/* Audio Section - Deep Dives (shared card style) */}
      <View style={styles.audioSection}>
        <SectionHeaderCard
          title="Deep Dive Podcasts"
          subtitle="Extended audio sessions for deeper learning"
          icon="headset"
        />
        {LEARNING_MODULES.map((module) => (
          <AudioRowCard
            key={`audio-${module.id}`}
            onPress={() => handleModulePress(module.id)}
            title={module.title}
            subtitle={`${DIMENSION_INFO[module.dimension].name} • ${module.audioDuration}`}
            icon={module.icon as any}
            iconBackgroundColor={module.color + '20'}
            iconColor={module.color}
          />
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
  featuredSection: {
    marginBottom: Spacing.xl,
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
  audioSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
});
