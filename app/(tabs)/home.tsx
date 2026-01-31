/**
 * Home Screen
 *
 * Personal dashboard with greeting, quick actions, and daily tip.
 * No numeric scores, no streak pressure.
 * Design: calm, spacious, EQ-focused – cards have clear hierarchy and gentle depth.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { useColors, Spacing, Typography, Radius, Shadows } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';

const STAGGER_DELAY = 70;
const FADE_DURATION = 400;

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

  const opacityHeader = useRef(new Animated.Value(0)).current;
  const opacityPrimary = useRef(new Animated.Value(0)).current;
  const opacityJournal = useRef(new Animated.Value(0)).current;
  const opacityQuick = useRef(new Animated.Value(0)).current;
  const opacityTip = useRef(new Animated.Value(0)).current;
  const opacityPrivacy = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anims = [
      { val: opacityHeader, delay: 0 },
      { val: opacityPrimary, delay: STAGGER_DELAY },
      { val: opacityJournal, delay: STAGGER_DELAY * 2 },
      { val: opacityQuick, delay: STAGGER_DELAY * 3 },
      { val: opacityTip, delay: STAGGER_DELAY * 4 },
      { val: opacityPrivacy, delay: STAGGER_DELAY * 5 },
    ];
    const subs = anims.map(({ val, delay }) =>
      Animated.timing(val, {
        toValue: 1,
        duration: FADE_DURATION,
        delay,
        useNativeDriver: true,
      })
    );
    Animated.parallel(subs).start();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    let base = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    if (user?.username) {
      const name = user.username.charAt(0).toUpperCase() + user.username.slice(1);
      base += `, ${name}`;
    }
    return base;
  };

  const getTodaysTip = () => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return DAILY_TIPS[dayOfYear % DAILY_TIPS.length];
  };

  const styles = createStyles(colors);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header – breathing room, warm greeting */}
      <Animated.View style={[styles.header, { opacity: opacityHeader }]}>
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={styles.title}>How are you really?</Text>
      </Animated.View>

      {/* Hero CTA – Reflect: one clear primary action, calm and inviting */}
      <Animated.View style={{ opacity: opacityPrimary }}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryCard,
            Shadows.hero,
            pressed && styles.primaryCardPressed,
          ]}
          onPress={() => router.push('/(tabs)/reflect')}
        >
        <View style={styles.primaryCardInner}>
          <View style={styles.primaryCardIcon}>
            <Ionicons name="journal-outline" size={32} color={colors.primaryForeground} />
          </View>
          <View style={styles.primaryCardText}>
            <Text style={styles.primaryCardTitle}>Check in</Text>
            <Text style={styles.primaryCardSubtitle}>Take a moment to notice how you feel</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.primaryForeground} />
        </View>
        </Pressable>
      </Animated.View>

      {/* Journal – secondary action with clear “writing” identity (left accent) */}
      <Animated.View style={{ opacity: opacityJournal }}>
        <Pressable
          style={({ pressed }) => [
            styles.journalCard,
          Shadows.card,
          pressed && styles.cardPressed,
        ]}
        onPress={() => router.push('/journal')}
      >
        <View style={styles.journalCardContent}>
          <View style={styles.journalCardIcon}>
            <Ionicons name="book-outline" size={24} color={colors.primary} />
          </View>
          <View style={styles.journalCardText}>
            <Text style={styles.journalCardTitle}>Journal</Text>
            <Text style={styles.journalCardSubtitle}>Private, encrypted writing</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </View>
        </Pressable>
      </Animated.View>

      {/* Quick Actions – 2-column grid, equal cards, calm accents */}
      <Animated.View style={[styles.quickActionsSection, { opacity: opacityQuick }]}>
        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.quickActionsGrid}>
          <Pressable
            style={({ pressed }) => [
              styles.quickActionCard,
              Shadows.card,
              pressed && styles.cardPressed,
            ]}
            onPress={() => router.push('/(tabs)/eq')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.accentEnergy + '18' }]}>
              <Ionicons name="checkmark-circle-outline" size={26} color={colors.accentEnergy} />
            </View>
            <Text style={styles.quickActionTitle}>EQ Check-In</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.quickActionCard,
              Shadows.card,
              pressed && styles.cardPressed,
            ]}
            onPress={() => router.push('/(tabs)/recover')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.accentCalm + '18' }]}>
              <Ionicons name="leaf-outline" size={26} color={colors.accentCalm} />
            </View>
            <Text style={styles.quickActionTitle}>Recover</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.quickActionCard,
              Shadows.card,
              pressed && styles.cardPressed,
            ]}
            onPress={() => router.push('/(tabs)/learn')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.accentSoft + '18' }]}>
              <Ionicons name="book-outline" size={26} color={colors.accentSoft} />
            </View>
            <Text style={styles.quickActionTitle}>Learn</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.quickActionCard,
              Shadows.card,
              pressed && styles.cardPressed,
            ]}
            onPress={() => router.push('/(tabs)/insights')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.accentWarm + '18' }]}>
              <Ionicons name="analytics-outline" size={26} color={colors.accentWarm} />
            </View>
            <Text style={styles.quickActionTitle}>Insights</Text>
          </Pressable>
        </View>
      </Animated.View>

      {/* Daily Insight – quote-style card with soft tint and left accent */}
      <Animated.View style={{ opacity: opacityTip }}>
        <View style={[styles.tipCard, Shadows.card]}>
          <View style={styles.tipAccent} />
          <View style={styles.tipContent}>
            <View style={styles.tipHeader}>
              <Ionicons name="bulb-outline" size={20} color={colors.accentEnergy} />
              <Text style={styles.tipLabel}>Daily Insight</Text>
            </View>
            <Text style={styles.tipText}>{getTodaysTip()}</Text>
          </View>
        </View>
      </Animated.View>

      {/* Privacy – subtle, reassuring */}
      <Animated.View style={{ opacity: opacityPrivacy }}>
        <View style={styles.privacyNote}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.textMuted} />
          <Text style={styles.privacyText}>Your journal entries are encrypted and private</Text>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Platform.OS === 'ios' ? Spacing['3xl'] : Spacing['2xl'],
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
  // —— Hero card: one clear primary action ——
  primaryCard: {
    backgroundColor: colors.primary,
    borderRadius: Radius['2xl'],
    padding: Spacing['2xl'],
    marginBottom: Spacing.xl,
    overflow: 'hidden',
  },
  primaryCardPressed: {
    opacity: 0.96,
  },
  primaryCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryCardIcon: {
    width: 60,
    height: 60,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
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
    color: 'rgba(255, 255, 255, 0.88)',
    fontFamily: Typography.fontFamily.primary,
  },
  cardPressed: {
    opacity: 0.92,
  },
  // —— Journal: secondary CTA with “writing” identity ——
  journalCard: {
    backgroundColor: colors.floating,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing['2xl'],
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  journalCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  journalCardIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  journalCardText: {
    flex: 1,
  },
  journalCardTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.textPrimary,
    fontFamily: Typography.fontFamily.heading,
    marginBottom: Spacing.xs,
  },
  journalCardSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    fontFamily: Typography.fontFamily.primary,
  },
  // —— Quick Actions: 2-column grid, equal placement ——
  quickActionsSection: {
    marginBottom: Spacing['2xl'],
  },
  sectionTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.textSecondary,
    letterSpacing: 0.6,
    marginBottom: Spacing.md,
    fontFamily: Typography.fontFamily.primary,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: '48%',
    backgroundColor: colors.floating,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
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
  // —— Daily Insight: quote-style, soft tint + left accent ——
  tipCard: {
    backgroundColor: colors.accentEnergy + '0C',
    borderRadius: Radius.xl,
    marginBottom: Spacing['2xl'],
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    position: 'relative',
  },
  tipAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.accentEnergy,
  },
  tipContent: {
    padding: Spacing.lg,
    paddingLeft: Spacing.lg + 4,
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
