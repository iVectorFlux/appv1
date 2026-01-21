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

          {/* EQ Insights Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>EQ SKILLS</Text>
            <View style={styles.insightsList}>
              <View style={[styles.insightCard, Shadows.sm]}>
                <View style={styles.insightHeader}>
                  <View style={[styles.insightIcon, { backgroundColor: colors.success + '20' }]}>
                    <Ionicons name="checkmark" size={16} color={colors.success} />
                  </View>
                  <View style={styles.insightText}>
                    <Text style={styles.insightTitle}>
                      You tend to notice emotions early
                    </Text>
                    <Text style={styles.insightDescription}>
                      Based on your recent EQ check-ins, you're developing stronger awareness of emotional shifts.
                    </Text>
                  </View>
                </View>
              </View>

              <View style={[styles.insightCard, Shadows.sm]}>
                <View style={styles.insightHeader}>
                  <View style={[styles.insightIcon, { backgroundColor: colors.accentEnergy + '20' }]}>
                    <Ionicons name="star" size={16} color={colors.accentEnergy} />
                  </View>
                  <View style={styles.insightText}>
                    <Text style={styles.insightTitle}>
                      Regulation feels steadier lately
                    </Text>
                    <Text style={styles.insightDescription}>
                      Your responses suggest you're creating more space between emotion and reaction.
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Wellbeing Pattern Insights */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>WELLBEING PATTERNS</Text>
            <View style={styles.insightsList}>
              <View style={[styles.patternCard]}>
                <View style={styles.patternIcon}>
                  <Ionicons name="trending-down" size={20} color={colors.accentSoft} />
                </View>
                <View style={styles.patternContent}>
                  <Text style={styles.patternTitle}>
                    Energy dips during busy weeks
                  </Text>
                  <Text style={styles.patternDescription}>
                    When you mark "Work / School" as a reason, your energy levels tend to be lower.
                  </Text>
                </View>
              </View>

              <View style={[styles.patternCard]}>
                <View style={styles.patternIcon}>
                  <Ionicons name="moon-outline" size={20} color={colors.accentCalm} />
                </View>
                <View style={styles.patternContent}>
                  <Text style={styles.patternTitle}>
                    You reflect most in the evening
                  </Text>
                  <Text style={styles.patternDescription}>
                    Most of your journal entries happen between 7-10 PM.
                  </Text>
                </View>
              </View>

              <View style={[styles.patternCard]}>
                <View style={styles.patternIcon}>
                  <Ionicons name="leaf" size={20} color={colors.success} />
                </View>
                <View style={styles.patternContent}>
                  <Text style={styles.patternTitle}>
                    Recovery practices help
                  </Text>
                  <Text style={styles.patternDescription}>
                    You often select calmer emotions after breathing or grounding exercises.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </>
      ) : (
        <>
          {/* Learn Tab Content - Show first 3 modules */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>RECOMMENDED FOR YOU</Text>
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
            <Text style={styles.sectionTitle}>DEEP DIVE PODCASTS</Text>
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
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: Typography.fontFamily.primary,
  },
  insightsList: {
    gap: Spacing.md,
  },
  insightCard: {
    backgroundColor: colors.floating,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightText: {
    flex: 1,
  },
  insightTitle: {
    fontSize: Typography.fontSize.base,
    color: colors.textPrimary,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    marginBottom: Spacing.xs,
    fontFamily: Typography.fontFamily.primary,
  },
  insightDescription: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.primary,
  },
  patternCard: {
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  patternIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: colors.floating,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patternContent: {
    flex: 1,
  },
  patternTitle: {
    fontSize: Typography.fontSize.base,
    color: colors.textPrimary,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    marginBottom: Spacing.xs,
    fontFamily: Typography.fontFamily.primary,
  },
  patternDescription: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.sm,
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
