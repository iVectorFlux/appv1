/**
 * Home Screen
 *
 * Personal dashboard with greeting, quick actions, and daily tip.
 * No numeric scores, no streak pressure.
 * Design: calm, spacious, EQ-focused – cards have clear hierarchy and gentle depth.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Animated, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/stores/auth-store';
import { useColors, Spacing, Typography, Radius, Shadows } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import { AudioRowCard } from '@/components/ui/audio-row-card';
import { ModuleCard } from '@/components/ui/module-card';

const STAGGER_DELAY = 70;
const FADE_DURATION = 400;
const HERO_SIZE = 120;

const EQ_ILLUSTRATION_URI = 'https://ungxepwjsmhckjgxphpa.supabase.co/storage/v1/object/public/Images/eq4.svg';

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
  const opacityHero = useRef(new Animated.Value(0)).current;
  const opacityPrimary = useRef(new Animated.Value(0)).current;
  const opacityDailyTip = useRef(new Animated.Value(0)).current;
  const opacityQuick = useRef(new Animated.Value(0)).current;
  const opacityPrivacy = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anims = [
      { val: opacityHeader, delay: 0 },
      { val: opacityHero, delay: STAGGER_DELAY },
      { val: opacityPrimary, delay: STAGGER_DELAY * 2 },
      { val: opacityDailyTip, delay: STAGGER_DELAY * 3 },
      { val: opacityQuick, delay: STAGGER_DELAY * 4 },
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
    const nameToShow = user?.displayName?.trim() || user?.username;
    if (nameToShow) {
      const name = nameToShow.charAt(0).toUpperCase() + nameToShow.slice(1);
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
      <Animated.View style={[styles.header, { opacity: opacityHeader }]}>
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={styles.title}>Ready to check in?</Text>
      </Animated.View>

      <Animated.View style={[styles.heroRow, { opacity: opacityHero }]}>
        <View style={styles.heroImageWrap}>
          <Image
            source={{ uri: EQ_ILLUSTRATION_URI }}
            style={styles.heroImage}
            resizeMode="contain"
            accessibilityLabel="Emotional intelligence illustration"
          />
        </View>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push('/(tabs)/reflect')}
          style={styles.heroCardWrap}
        >
          <LinearGradient
            colors={[colors.accentWarm + '22', colors.accentWarm + '08', colors.background]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.heroCardInner}>
            <View style={[styles.heroCardIcon, { backgroundColor: colors.accentWarm + '28' }]}>
              <Ionicons name="heart-outline" size={26} color={colors.accentWarm} />
            </View>
            <Text style={styles.heroCardTitle}>Check in</Text>
            <Text style={styles.heroCardSubtitle} numberOfLines={2}>Take a moment to notice how you feel</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View style={[styles.checkInSection, { opacity: opacityPrimary }]}>
        <View style={styles.gradientRowWrap}>
          <LinearGradient
            colors={[colors.accentSoft + '18', colors.accentSoft + '06', colors.background]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
          <AudioRowCard
            onPress={() => router.push('/journal')}
            title="Journal"
            subtitle="Private, encrypted writing"
            icon="book-outline"
            iconBackgroundColor={colors.accentSoft + '20'}
            iconColor={colors.accentSoft}
            trailingIcon="chevron-forward"
          />
        </View>
      </Animated.View>

      <Animated.View style={[styles.dailyTipSection, { opacity: opacityDailyTip }]}>
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

      <Animated.View style={[styles.quickActionsSection, { opacity: opacityQuick }]}>
        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.quickActionsGrid}>
          <ModuleCard
            onPress={() => router.push('/(tabs)/eq')}
            title="EQ Check-In"
            icon="pulse-outline"
            iconColor={colors.accentEnergy}
            iconBackgroundColor={colors.accentEnergy + '20'}
            compact
          />
          <ModuleCard
            onPress={() => router.push('/(tabs)/recover')}
            title="Recover"
            icon="water-outline"
            iconColor={colors.accentCalm}
            iconBackgroundColor={colors.accentCalm + '20'}
            compact
          />
          <ModuleCard
            onPress={() => router.push('/(tabs)/learn')}
            title="Learn"
            icon="library-outline"
            iconColor={colors.accentSoft}
            iconBackgroundColor={colors.accentSoft + '20'}
            compact
          />
          <ModuleCard
            onPress={() => router.push('/(tabs)/insights')}
            title="Insights"
            icon="stats-chart-outline"
            iconColor={colors.accentWarm}
            iconBackgroundColor={colors.accentWarm + '20'}
            compact
          />
        </View>
      </Animated.View>

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
    fontSize: 30,
    fontWeight: Typography.fontWeight.bold,
    color: colors.textPrimary,
    fontFamily: Typography.fontFamily.heading,
    lineHeight: 36,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  heroImageWrap: {
    width: HERO_SIZE,
    height: HERO_SIZE,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.floating,
  },
  heroImage: {
    width: HERO_SIZE,
    height: HERO_SIZE,
  },
  heroCardWrap: {
    flex: 1,
    minHeight: HERO_SIZE,
    height: HERO_SIZE,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...Shadows.sm,
  },
  heroCardInner: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'center',
  },
  heroCardIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  heroCardTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.textPrimary,
    fontFamily: Typography.fontFamily.heading,
    marginBottom: Spacing.xs,
  },
  heroCardSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    fontFamily: Typography.fontFamily.primary,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
  },
  checkInSection: {
    marginBottom: Spacing['2xl'],
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  dailyTipSection: {
    marginBottom: Spacing.xl,
  },
  gradientRowWrap: {
    position: 'relative',
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
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
    gap: Spacing.md,
  },
  tipCard: {
    backgroundColor: colors.accentEnergy + '0C',
    borderRadius: Radius.xl,
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
