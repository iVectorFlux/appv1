/**
 * Home — Editorial wellness dashboard
 *
 * Hero card with greeting, "Ready to check in", CTA. Quick access, daily tip, horizontal quick actions.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import {
  useColors,
  Spacing,
  Typography,
  Radius,
  Shadows,
  Layout,
} from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import { HeroCard } from '@/components/ui/hero-card';
import { AudioRowCard } from '@/components/ui/audio-row-card';
import { ModuleCard } from '@/components/ui/module-card';

const STAGGER_DELAY = 50;
const FADE_DURATION = 350;

const DAILY_TIPS = [
  'Naming your emotions can help you understand them better.',
  'Deep breathing activates your parasympathetic nervous system.',
  'Emotions are like weather — they pass.',
  'Self-awareness is the foundation of emotional intelligence.',
  'It\'s okay to feel multiple emotions at once.',
  'Recovery is building capacity to handle difficult emotions.',
];

function getTodaysTip(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return DAILY_TIPS[dayOfYear % DAILY_TIPS.length];
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const colors = useColors();
  const [mounted, setMounted] = useState(false);

  const opacityHero    = useRef(new Animated.Value(0)).current;
  const opacityJournal = useRef(new Animated.Value(0)).current;
  const opacityAI      = useRef(new Animated.Value(0)).current;
  const opacityDaily   = useRef(new Animated.Value(0)).current;
  const opacityQuick   = useRef(new Animated.Value(0)).current;
  const opacityFooter  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const anims = [
      { val: opacityHero,    delay: 0 },
      { val: opacityJournal, delay: STAGGER_DELAY },
      { val: opacityAI,      delay: STAGGER_DELAY * 2 },
      { val: opacityDaily,   delay: STAGGER_DELAY * 3 },
      { val: opacityQuick,   delay: STAGGER_DELAY * 4 },
      { val: opacityFooter,  delay: STAGGER_DELAY * 5 },
    ];
    Animated.parallel(
      anims.map(({ val, delay }) =>
        Animated.timing(val, {
          toValue: 1,
          duration: FADE_DURATION,
          delay,
          useNativeDriver: true,
        })
      )
    ).start();
  }, []);

  const getGreeting = () => {
    if (!mounted) return 'Good morning';
    const hour = new Date().getHours();
    let base =
      hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const nameToShow = user?.displayName?.trim() || user?.username;
    if (nameToShow) {
      const name = nameToShow.charAt(0).toUpperCase() + nameToShow.slice(1);
      base += `, ${name}`;
    }
    return base;
  };

  const styles = createStyles(colors);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <Animated.View style={[styles.heroSection, { opacity: opacityHero }]}>
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={styles.heroTitle}>Ready to check in</Text>
        <HeroCard
          onPress={() => router.push('/(tabs)/reflect')}
          subtitle="How are you feeling right now?"
          meta={['2 min', 'Track mood & energy']}
          buttonLabel="Begin check-in"
        />
      </Animated.View>

      {/* Journal */}
      <Animated.View style={[styles.section, { opacity: opacityJournal }]}>
        <View style={styles.journalRow}>
          <AudioRowCard
            onPress={() => router.push('/journal')}
            title="Journal"
            subtitle="Private, encrypted writing"
            icon="book-outline"
            iconBackgroundColor={colors.accentSoft + '22'}
            iconColor={colors.accentSoft}
            trailingIcon="chevron-forward"
          />
        </View>
      </Animated.View>

      {/* AI Tools */}
      <Animated.View style={[styles.section, { opacity: opacityAI }]}>
        <Text style={styles.sectionLabel}>AI Tools</Text>
        <View style={styles.quickColumn}>
          <ModuleCard
            onPress={() => router.push('/chat')}
            title="AI Companion"
            subtitle="Inner Ally · Coach"
            icon="chatbubble-ellipses-outline"
            iconColor={colors.accentTerracotta}
            iconBackgroundColor={colors.accentTerracotta + '18'}
            horizontal
            width="full"
          />
          <ModuleCard
            onPress={() => router.push('/future-skills')}
            title="Skill Lab"
            subtitle="The 10 skills for an AI-powered world — practice with coaching"
            icon="rocket-outline"
            iconColor={colors.accentIndigo}
            iconBackgroundColor={colors.accentIndigo + '18'}
            horizontal
            width="full"
          />
        </View>
      </Animated.View>

      {/* Daily Insight */}
      <Animated.View style={[styles.section, { opacity: opacityDaily }]}>
        <View style={[styles.tipCard, Shadows.card]}>
          <View style={styles.tipAccent} />
          <View style={styles.tipContent}>
            <View style={styles.tipHeader}>
              <Ionicons name="bulb-outline" size={18} color={colors.accentWarmTan} />
              <Text style={styles.tipLabel}>Daily insight</Text>
            </View>
            <Text style={styles.tipText} numberOfLines={2}>
              {mounted ? getTodaysTip() : DAILY_TIPS[0]}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Quick Actions */}
      <Animated.View style={[styles.section, { opacity: opacityQuick }]}>
        <Text style={styles.sectionLabel}>Quick actions</Text>
        <View style={styles.quickColumn}>
          <ModuleCard
            onPress={() => router.push('/(tabs)/recover')}
            title="Recover and grounding"
            icon="water-outline"
            iconColor={colors.accentSage}
            iconBackgroundColor={colors.accentSage + '18'}
            horizontal
            width="full"
          />
          <ModuleCard
            onPress={() => router.push('/(tabs)/learn')}
            title="Start your learning journey"
            icon="library-outline"
            iconColor={colors.accentIndigo}
            iconBackgroundColor={colors.accentIndigo + '18'}
            horizontal
            width="full"
          />
          <ModuleCard
            onPress={() => router.push('/(tabs)/eq')}
            title="EQ check-in"
            icon="pulse-outline"
            iconColor={colors.accentTerracotta}
            iconBackgroundColor={colors.accentTerracotta + '18'}
            horizontal
            width="full"
          />
          <ModuleCard
            onPress={() => router.push('/(tabs)/insights')}
            title="Progress and insights"
            icon="stats-chart-outline"
            iconColor={colors.accentWarmTan}
            iconBackgroundColor={colors.accentWarmTan + '22'}
            horizontal
            width="full"
          />
        </View>
      </Animated.View>

      {/* Footer */}
      <Animated.View style={[styles.footer, { opacity: opacityFooter }]}>
        <View style={styles.privacyNote}>
          <Ionicons name="shield-checkmark-outline" size={14} color={colors.textMuted} />
          <Text style={styles.privacyText}>
            Your journal entries are encrypted and private
          </Text>
        </View>
      </Animated.View>
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
      paddingHorizontal: Spacing.md,
      paddingTop: Platform.OS === 'ios' ? 52 : Spacing.lg,
      paddingBottom: Spacing['2xl'],
      maxWidth: Layout.maxWidth,
      alignSelf: 'center',
      width: '100%',
    },
    heroSection: {
      marginBottom: Spacing.lg,
    },
    greeting: {
      fontSize: Typography.fontSize.body,
      color: colors.textSecondary,
      marginBottom: Spacing.xs,
    },
    heroTitle: {
      fontSize: Typography.fontSize.heroCard,
      fontWeight: Typography.fontWeight.medium,
      color: colors.textPrimary,
      letterSpacing: Typography.letterSpacing.snug,
      marginBottom: Spacing.md,
    },
    section: {
      marginBottom: Spacing.lg,
    },
    sectionLabel: {
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: Spacing.sm,
    },
    journalRow: {
      borderRadius: Radius.lg,
      overflow: 'hidden',
    },
    tipCard: {
      backgroundColor: colors.floating,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      position: 'relative',
    },
    tipAccent: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 3,
      backgroundColor: colors.accentWarmTan,
    },
    tipContent: {
      padding: Spacing.md,
      paddingLeft: Spacing.md + 3,
    },
    tipHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      marginBottom: Spacing.xs,
    },
    tipLabel: {
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.accentWarmTan,
    },
    tipText: {
      fontSize: Typography.fontSize.sm,
      color: colors.textPrimary,
      lineHeight: Typography.fontSize.sm * Typography.lineHeight.relaxed,
    },
    quickColumn: {
      gap: Spacing.sm,
    },
    footer: {
      marginTop: Spacing.xs,
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
    },
  });
