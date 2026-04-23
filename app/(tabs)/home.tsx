/**
 * Home - Glassmorphic dashboard
 *
 * Explore grid first (Learn EQ, Companion, Skill Lab, Recover), then Assessments & progress.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import {
  useColors,
  Spacing,
  Typography,
  Radius,
} from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import { GlassBackground } from '@/components/ui/glass-background';
import { GlassCard } from '@/components/ui/glass-card';
import { AddToHomeScreenBanner } from '@/components/web/add-to-home-screen-banner';
import { useWebLaptopLayout } from '@/hooks/useWebLaptopLayout';

const STAGGER = 70;
const FADE_MS = 420;
const GAP = 12;

interface ExploreFeature {
  key: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  route: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const colors = useColors();
  const isWebLaptop = useWebLaptopLayout();
  const [mounted, setMounted] = useState(false);

  const exploreFeatures: ExploreFeature[] = [
    { key: 'learn', title: 'Learn EQ', icon: 'book-outline', accent: colors.accentIndigo, route: '/(tabs)/learn' },
    { key: 'companion', title: 'AI Companion', icon: 'chatbubble-ellipses-outline', accent: colors.accentTerracotta, route: '/(tabs)/companion' },
    { key: 'skill-lab', title: 'Skill Lab', icon: 'rocket-outline', accent: colors.accentSage, route: '/skill-lab' },
    { key: 'recover', title: 'Recover', icon: 'leaf-outline', accent: colors.accentCalm, route: '/grounding' },
  ];

  const assessmentActions = React.useMemo(
    () =>
      [
        {
          key: 'full-eq',
          title: 'Full EQ test',
          subtitle: '60+ questions · ~25 min',
          icon: 'analytics-outline' as const,
          accent: colors.primary,
          route: '/full-eq-test',
        },
        {
          key: 'big5',
          title: 'Big Five',
          subtitle: 'Personality OCEAN · IPIP 50',
          icon: 'color-wand-outline' as const,
          accent: colors.accentIndigo,
          route: '/big5-test',
        },
        {
          key: 'progress',
          title: 'Progress',
          subtitle: 'EQ, learning & Skill Lab',
          icon: 'stats-chart-outline' as const,
          accent: colors.accentTerracotta,
          route: '/(tabs)/progress',
        },
      ] as const,
    [colors]
  );

  const anims = useRef(exploreFeatures.map(() => new Animated.Value(0))).current;
  const greetAnim = useRef(new Animated.Value(0)).current;
  const assessAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    Animated.timing(greetAnim, { toValue: 1, duration: FADE_MS, useNativeDriver: true }).start();
    Animated.timing(assessAnim, { toValue: 1, duration: FADE_MS, useNativeDriver: true }).start();
    Animated.stagger(
      STAGGER,
      anims.map((a) => Animated.timing(a, { toValue: 1, duration: FADE_MS, useNativeDriver: true }))
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only entrance; refs stable
  }, []);

  const greeting = (() => {
    if (!mounted) return 'Good morning';
    const h = new Date().getHours();
    let g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    const n = user?.displayName?.trim() || user?.username;
    if (n) g += `, ${n.charAt(0).toUpperCase()}${n.slice(1)}`;
    return g;
  })();

  const st = createStyles(colors);

  const animWrap = (index: number, children: React.ReactNode, wrapStyle?: object) => (
    <Animated.View
      key={exploreFeatures[index].key}
      style={[
        wrapStyle,
        { opacity: anims[index], transform: [{ translateY: anims[index].interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] },
      ]}
    >
      {children}
    </Animated.View>
  );

  const renderExploreTile = (index: number) => {
    const f = exploreFeatures[index];
    return animWrap(
      index,
      <GlassCard onPress={() => router.push(f.route as never)} borderRadius={Radius.xl} style={isWebLaptop ? st.webTile : st.gridCardFill}>
        <View style={st.gridContent}>
          <View style={[st.iconWrap, { backgroundColor: f.accent + '1A' }]}>
            <Ionicons name={f.icon} size={22} color={f.accent} />
          </View>
          <Text style={st.gridTitle}>{f.title}</Text>
        </View>
      </GlassCard>,
      isWebLaptop ? st.webTileWrap : st.gridCell
    );
  };

  return (
    <GlassBackground>
      <ScrollView
        style={st.scroll}
        contentContainerStyle={[st.content, isWebLaptop && st.contentWebLaptop]}
        showsVerticalScrollIndicator={false}
      >
        {Platform.OS === 'web' ? <AddToHomeScreenBanner /> : null}
        <Animated.View style={[st.greetSection, { opacity: greetAnim }]}>
          <View style={st.greetRow}>
            <View style={{ flex: 1 }}>
              <Text style={[st.greeting, isWebLaptop && st.greetingWeb]}>{greeting}</Text>
              <Text style={st.tagline}>Start your transformation journey</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/profile')}
              style={[st.profileBtn, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
              activeOpacity={0.7}
            >
              <Ionicons name="person-outline" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Text style={[st.sectionHeading, { marginBottom: Spacing.sm }]}>Explore</Text>

        {isWebLaptop ? (
          <View style={[st.exploreSection, st.webTileGrid]}>
            {exploreFeatures.map((_, i) => (
              <React.Fragment key={exploreFeatures[i].key}>{renderExploreTile(i)}</React.Fragment>
            ))}
          </View>
        ) : (
          <View style={st.exploreSection}>
            <View style={st.gridRow}>
              {renderExploreTile(0)}
              {renderExploreTile(1)}
            </View>
            <View style={st.gridRow}>
              {renderExploreTile(2)}
              {renderExploreTile(3)}
            </View>
          </View>
        )}

        {/* Assessments & progress - after Explore */}
        <Animated.View style={[st.assessSection, { opacity: assessAnim }]}>
          <Text style={st.sectionHeading}>Assessments & progress</Text>
          <View style={st.assessGrid}>
            {assessmentActions.map((a) => (
              <TouchableOpacity
                key={a.key}
                style={[st.assessCell, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]}
                onPress={() => router.push(a.route as never)}
                activeOpacity={0.75}
              >
                <View style={[st.assessIcon, { backgroundColor: a.accent + '22' }]}>
                  <Ionicons name={a.icon} size={20} color={a.accent} />
                </View>
                <Text style={st.assessTitle}>{a.title}</Text>
                <Text style={st.assessSub} numberOfLines={2}>
                  {a.subtitle}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        <View style={st.footer}>
          <Ionicons name="shield-checkmark-outline" size={13} color={colors.textMuted} />
          <Text style={st.footerText}>Your data is private and encrypted</Text>
        </View>
      </ScrollView>
    </GlassBackground>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    scroll: { flex: 1 },
    content: {
      paddingHorizontal: Spacing.md,
      paddingTop: Platform.OS === 'ios' ? 60 : Spacing.xl,
      paddingBottom: 120,
    },
    contentWebLaptop: {
      paddingHorizontal: Spacing.xl,
      paddingTop: Platform.OS === 'web' ? Spacing['2xl'] : Spacing.xl,
      paddingBottom: Spacing['2xl'],
    },
    greetingWeb: {
      fontSize: 32,
      letterSpacing: -0.8,
    },
    webTileGrid: {
      width: '100%',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: GAP,
      justifyContent: 'flex-start',
    },
    webTileWrap: {
      width: '32%' as any,
      maxWidth: 340,
    },
    webTile: {
      width: '100%',
    },
    greetSection: { marginBottom: Spacing.lg },
    greetRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.md,
    },
    greeting: {
      fontSize: Typography.fontSize['2xl'],
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
      letterSpacing: Typography.letterSpacing.snug,
      marginBottom: 4,
    },
    tagline: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      fontWeight: Typography.fontWeight.medium,
    },
    profileBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      marginTop: 2,
    },

    sectionHeading: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textSecondary,
      letterSpacing: Typography.letterSpacing.normal,
      marginBottom: Spacing.sm,
    },
    exploreSection: {
      marginBottom: Spacing.lg + 4,
    },
    assessSection: {
      marginBottom: Spacing.lg + 4,
    },
    assessGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: GAP,
    },
    assessCell: {
      width: '48%',
      borderRadius: Radius.lg,
      borderWidth: 1,
      padding: Spacing.md,
      paddingBottom: Spacing.sm + 2,
    },
    assessIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.sm,
    },
    assessTitle: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      marginBottom: 4,
    },
    assessSub: {
      fontSize: Typography.fontSize.xs,
      color: colors.textMuted,
      lineHeight: Typography.fontSize.xs * 1.4,
    },

    gridRow: {
      flexDirection: 'row',
      gap: GAP,
      marginBottom: GAP,
    },
    gridCell: {
      flex: 1,
    },
    gridCardFill: {
      flex: 1,
    },
    gridContent: {},
    iconWrap: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gridTitle: {
      fontSize: Typography.fontSize.cardTitle,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
      marginTop: Spacing.sm,
    },

    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      marginTop: Spacing.lg,
    },
    footerText: { fontSize: Typography.fontSize.xs, color: colors.textMuted },
  });
