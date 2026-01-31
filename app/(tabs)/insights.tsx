/**
 * Insights Screen
 * 
 * Insights derived ONLY from structured data:
 * - EQ check-in patterns
 * - Emotion + energy + reason patterns
 * 
 * NEVER from journal text content.
 * 
 * Also includes quick access to Learn content.
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
import { Button } from '@/components/ui/Button';
import { useColors, Spacing, Typography, Radius, Shadows } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import { LEARNING_MODULES, DIMENSION_INFO } from '@/data/learning-content';

export default function InsightsScreen() {
  const router = useRouter();
  const colors = useColors();
  const [showSupportPrompt, setShowSupportPrompt] = useState(false);
  const [activeTab, setActiveTab] = useState<'insights' | 'learn'>('insights');

  const styles = createStyles(colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Insights & Learn</Text>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'insights' && styles.tabActive]}
          onPress={() => setActiveTab('insights')}
        >
          <Ionicons 
            name="analytics-outline" 
            size={18} 
            color={activeTab === 'insights' ? colors.primary : colors.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'insights' && styles.tabTextActive]}>
            Insights
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'learn' && styles.tabActive]}
          onPress={() => setActiveTab('learn')}
        >
          <Ionicons 
            name="book-outline" 
            size={18} 
            color={activeTab === 'learn' ? colors.primary : colors.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'learn' && styles.tabTextActive]}>
            Learn
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'insights' ? (
        <>
          {/* Conditional Support Prompt */}
          {showSupportPrompt && (
            <View style={[styles.supportCard, Shadows.md]}>
              <View style={styles.supportHeader}>
                <View style={styles.supportIcon}>
                  <Ionicons name="heart-outline" size={24} color={colors.accentSoft} />
                </View>
                <View style={styles.supportText}>
                  <Text style={styles.supportTitle}>
                    This feeling has been showing up for a while. Many people find it helpful to talk to someone.
                  </Text>
                </View>
              </View>
              <View style={styles.supportActions}>
                <Button
                  title="View Support Options"
                  onPress={() => {}}
                  size="md"
                  variant="primary"
                />
                <TouchableOpacity
                  onPress={() => setShowSupportPrompt(false)}
                  style={styles.dismissButton}
                >
                  <Text style={styles.dismissButtonText}>Not Right Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* EQ Insights — empty state until real data from check-ins */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>EQ skills</Text>
            <View style={styles.emptyInsightsCard}>
              <View style={[styles.emptyInsightsIcon, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="analytics-outline" size={32} color={colors.primary} />
              </View>
              <Text style={styles.emptyInsightsTitle}>Your insights will appear here</Text>
              <Text style={styles.emptyInsightsDescription}>
                Complete EQ check-ins and use Reflect to build your data. Patterns and strengths will show up as you use the app.
              </Text>
            </View>
          </View>

          {/* Wellbeing patterns — empty state until real data */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Wellbeing patterns</Text>
            <View style={styles.emptyInsightsCard}>
              <View style={[styles.emptyInsightsIcon, { backgroundColor: colors.accentCalm + '20' }]}>
                <Ionicons name="pulse-outline" size={32} color={colors.accentCalm} />
              </View>
              <Text style={styles.emptyInsightsTitle}>Patterns as you go</Text>
              <Text style={styles.emptyInsightsDescription}>
                Energy, timing, and recovery patterns will show here once you have enough check-ins and reflections.
              </Text>
            </View>
          </View>
        </>
      ) : (
        <>
          {/* Learn Tab Content - Show first 3 modules */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recommended for you</Text>
            <View style={styles.featuredLessons}>
              {LEARNING_MODULES.slice(0, 3).map((module) => (
                <TouchableOpacity 
                  key={module.id}
                  style={[styles.featuredLesson, Shadows.sm]}
                  onPress={() => router.push(`/learning-detail?id=${module.id}`)}
                >
                  <View style={[styles.lessonIconContainer, { backgroundColor: module.color + '20' }]}>
                    <Ionicons name={module.icon as any} size={24} color={module.color} />
                  </View>
                  <View style={styles.lessonContent}>
                    <Text style={styles.lessonTitle}>{module.title}</Text>
                    <Text style={styles.lessonMeta}>
                      {DIMENSION_INFO[module.dimension].name} • {module.videoDuration}
                    </Text>
                  </View>
                  <Ionicons name="play-circle" size={28} color={module.color} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Quick Access to Podcasts */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Deep dive podcasts</Text>
            <View style={styles.podcastList}>
              {LEARNING_MODULES.slice(0, 2).map((module) => (
                <TouchableOpacity 
                  key={`podcast-${module.id}`}
                  style={styles.podcastItem}
                  onPress={() => router.push(`/learning-detail?id=${module.id}`)}
                >
                  <View style={styles.podcastIcon}>
                    <Ionicons name="headset" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.podcastContent}>
                    <Text style={styles.podcastTitle}>{module.title}</Text>
                    <Text style={styles.podcastDuration}>{module.audioDuration}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => router.push('/(tabs)/learn')}
          >
            <Text style={styles.viewAllText}>View All Learning Content</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.primary} />
          </TouchableOpacity>
        </>
      )}

      {/* Understanding note */}
      <View style={styles.noteCard}>
        <Ionicons name="shield-checkmark-outline" size={16} color={colors.textMuted} />
        <Text style={styles.noteText}>
          Insights are based on your EQ check-ins and emotion patterns, not your journal entries. Your writing remains private.
        </Text>
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
    padding: Spacing.xl,
    paddingTop: Platform.OS === 'ios' ? 60 : Spacing.xl,
    paddingBottom: Spacing['5xl'],
  },
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.semibold,
    color: colors.textPrimary,
    fontFamily: Typography.fontFamily.heading,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xs,
    marginBottom: Spacing['2xl'],
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  tabActive: {
    backgroundColor: colors.floating,
  },
  tabText: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.primary,
  },
  tabTextActive: {
    color: colors.primary,
  },
  supportCard: {
    backgroundColor: colors.floating,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  supportHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  supportIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportText: {
    flex: 1,
  },
  supportTitle: {
    fontSize: Typography.fontSize.base,
    color: colors.textPrimary,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
    fontFamily: Typography.fontFamily.primary,
  },
  supportActions: {
    gap: Spacing.sm,
  },
  dismissButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissButtonText: {
    fontSize: Typography.fontSize.base,
    color: colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.primary,
  },
  section: {
    marginBottom: Spacing['2xl'],
  },
  sectionTitle: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.lg,
    fontFamily: Typography.fontFamily.primary,
  },
  emptyInsightsCard: {
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing['2xl'],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  emptyInsightsIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyInsightsTitle: {
    fontSize: Typography.fontSize.base,
    color: colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.sm,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.primary,
  },
  emptyInsightsDescription: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.primary,
  },
  featuredLessons: {
    gap: Spacing.md,
  },
  featuredLesson: {
    backgroundColor: colors.floating,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  lessonIconContainer: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonContent: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: Typography.fontSize.base,
    color: colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.primary,
    marginBottom: Spacing.xs,
  },
  lessonMeta: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    fontFamily: Typography.fontFamily.primary,
  },
  // Podcast styles
  podcastList: {
    gap: Spacing.sm,
  },
  podcastItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  podcastIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  podcastContent: {
    flex: 1,
  },
  podcastTitle: {
    fontSize: Typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.primary,
  },
  podcastDuration: {
    fontSize: Typography.fontSize.xs,
    color: colors.textSecondary,
    fontFamily: Typography.fontFamily.primary,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  viewAllText: {
    fontSize: Typography.fontSize.base,
    color: colors.primary,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.primary,
  },
  noteCard: {
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  noteText: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
    color: colors.textMuted,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.primary,
  },
});
