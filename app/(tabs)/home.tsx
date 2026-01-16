/**
 * Home Screen
 * 
 * Personal dashboard with greeting, quick actions, and daily tip.
 * No numeric scores, no streak pressure.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/Button';
import { useColors, Spacing, Typography, Radius, Shadows } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';

const DAILY_TIPS = [
  "Taking a moment to name your emotions can help you understand them better.",
  "Deep breathing activates your parasympathetic nervous system, promoting calm.",
  "Emotions are like weather - they pass. You don't have to act on every feeling.",
  "Self-awareness is the foundation of emotional intelligence.",
  "It's okay to feel multiple emotions at once. Humans are complex.",
  "Recovery isn't avoiding difficult emotions - it's building capacity to handle them.",
];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const colors = useColors();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getTodaysTip = () => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return DAILY_TIPS[dayOfYear % DAILY_TIPS.length];
  };

  const styles = createStyles(colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header with greeting */}
      <View style={styles.header}>
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={styles.title}>How are you today?</Text>
      </View>

      {/* Primary CTA - Reflect */}
      <TouchableOpacity 
        style={[styles.primaryCard, Shadows.md]}
        onPress={() => router.push('/(tabs)/reflect')}
        activeOpacity={0.8}
      >
        <View style={styles.primaryCardContent}>
          <View style={styles.primaryCardIcon}>
            <Ionicons name="journal-outline" size={28} color={colors.primaryForeground} />
          </View>
          <View style={styles.primaryCardText}>
            <Text style={styles.primaryCardTitle}>Start Reflecting</Text>
            <Text style={styles.primaryCardSubtitle}>Check in with your emotions</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.primaryForeground} />
        </View>
      </TouchableOpacity>

      {/* Quick Actions */}
      <View style={styles.quickActionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity 
            style={[styles.quickActionCard, Shadows.sm]}
            onPress={() => router.push('/(tabs)/eq')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.accentEnergy + '20' }]}>
              <Ionicons name="checkmark-circle-outline" size={24} color={colors.accentEnergy} />
            </View>
            <Text style={styles.quickActionTitle}>EQ Check-In</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.quickActionCard, Shadows.sm]}
            onPress={() => router.push('/(tabs)/recover')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.accentCalm + '20' }]}>
              <Ionicons name="leaf-outline" size={24} color={colors.accentCalm} />
            </View>
            <Text style={styles.quickActionTitle}>Recover</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.quickActionCard, Shadows.sm]}
            onPress={() => router.push('/(tabs)/learn')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.accentSoft + '20' }]}>
              <Ionicons name="book-outline" size={24} color={colors.accentSoft} />
            </View>
            <Text style={styles.quickActionTitle}>Learn</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.quickActionCard, Shadows.sm]}
            onPress={() => router.push('/(tabs)/insights')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.accentWarm + '20' }]}>
              <Ionicons name="analytics-outline" size={24} color={colors.accentWarm} />
            </View>
            <Text style={styles.quickActionTitle}>Insights</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Daily Tip */}
      <View style={[styles.tipCard, Shadows.sm]}>
        <View style={styles.tipHeader}>
          <Ionicons name="bulb-outline" size={20} color={colors.accentEnergy} />
          <Text style={styles.tipLabel}>Daily Insight</Text>
        </View>
        <Text style={styles.tipText}>{getTodaysTip()}</Text>
      </View>

      {/* Privacy Reminder */}
      <View style={styles.privacyNote}>
        <Ionicons name="shield-checkmark-outline" size={16} color={colors.textMuted} />
        <Text style={styles.privacyText}>Your journal entries are encrypted and private</Text>
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
    paddingBottom: Spacing['5xl'],
  },
  header: {
    marginBottom: Spacing['2xl'],
  },
  greeting: {
    fontSize: Typography.fontSize.base,
    color: colors.textSecondary,
    fontFamily: Typography.fontFamily.primary,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    color: colors.textPrimary,
    fontFamily: Typography.fontFamily.heading,
    lineHeight: Typography.lineHeight.tight * Typography.fontSize['3xl'],
  },
  primaryCard: {
    backgroundColor: colors.primary,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing['2xl'],
  },
  primaryCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryCardIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  primaryCardText: {
    flex: 1,
  },
  primaryCardTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.primaryForeground,
    fontFamily: Typography.fontFamily.heading,
    marginBottom: Spacing.xs,
  },
  primaryCardSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: Typography.fontFamily.primary,
  },
  quickActionsSection: {
    marginBottom: Spacing['2xl'],
  },
  sectionTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
    fontFamily: Typography.fontFamily.primary,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  quickActionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.floating,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  quickActionTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: colors.textPrimary,
    fontFamily: Typography.fontFamily.primary,
    textAlign: 'center',
  },
  tipCard: {
    backgroundColor: colors.floating,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: Spacing['2xl'],
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  tipLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.accentEnergy,
    fontFamily: Typography.fontFamily.primary,
  },
  tipText: {
    fontSize: Typography.fontSize.base,
    color: colors.textPrimary,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base,
    fontFamily: Typography.fontFamily.primary,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  privacyText: {
    fontSize: Typography.fontSize.xs,
    color: colors.textMuted,
    fontFamily: Typography.fontFamily.primary,
  },
});
