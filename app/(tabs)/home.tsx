/**
 * Home — Glassmorphic dashboard
 *
 * 2x2 equal-size grid cards + 2 compact rows.
 * Cards use aspectRatio for guaranteed equal sizing.
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

const STAGGER = 70;
const FADE_MS = 420;
const GAP = 12;

interface Feature {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  route: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const colors = useColors();
  const [mounted, setMounted] = useState(false);

  const features: Feature[] = [
    { key: 'learn', title: 'Learn EQ', subtitle: 'Expert-led emotional intelligence lessons', icon: 'book-outline', accent: colors.accentIndigo, route: '/(tabs)/learn' },
    { key: 'companion', title: 'AI Companion', subtitle: 'Inner Ally & Coach, always here', icon: 'chatbubble-ellipses-outline', accent: colors.accentTerracotta, route: '/(tabs)/companion' },
    { key: 'skill-lab', title: 'Skill Lab', subtitle: 'AI-powered practice drills', icon: 'rocket-outline', accent: colors.accentSage, route: '/skill-lab' },
    { key: 'recover', title: 'Recover', subtitle: 'Grounding & breathing exercises', icon: 'leaf-outline', accent: colors.accentCalm, route: '/(tabs)/recover' },
    { key: 'eq', title: 'EQ Check-in', subtitle: 'Quick 7-dimension assessment', icon: 'pulse-outline', accent: colors.accentWarmTan, route: '/(tabs)/eq' },
    { key: 'progress', title: 'Progress', subtitle: 'Track growth and patterns', icon: 'stats-chart-outline', accent: colors.accentTerracotta, route: '/(tabs)/progress' },
  ];

  const anims = useRef(features.map(() => new Animated.Value(0))).current;
  const greetAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    Animated.timing(greetAnim, { toValue: 1, duration: FADE_MS, useNativeDriver: true }).start();
    Animated.stagger(STAGGER, anims.map((a) => Animated.timing(a, { toValue: 1, duration: FADE_MS, useNativeDriver: true }))).start();
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
      key={features[index].key}
      style={[
        wrapStyle,
        { opacity: anims[index], transform: [{ translateY: anims[index].interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] },
      ]}
    >
      {children}
    </Animated.View>
  );

  return (
    <GlassBackground>
      <ScrollView style={st.scroll} contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={[st.greetSection, { opacity: greetAnim }]}>
          <View style={st.greetRow}>
            <View style={{ flex: 1 }}>
              <Text style={st.greeting}>{greeting}</Text>
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

        {/* Row 1 */}
        <View style={st.gridRow}>
          {animWrap(0, (
            <GlassCard onPress={() => router.push(features[0].route as any)} borderRadius={Radius.xl} style={st.gridCardFill}>
              <View style={st.gridContent}>
                <View style={[st.iconWrap, { backgroundColor: features[0].accent + '1A' }]}>
                  <Ionicons name={features[0].icon} size={22} color={features[0].accent} />
                </View>
                <Text style={st.gridTitle}>{features[0].title}</Text>
                <Text style={st.gridSub} numberOfLines={2}>{features[0].subtitle}</Text>
              </View>
            </GlassCard>
          ), st.gridCell)}
          {animWrap(1, (
            <GlassCard onPress={() => router.push(features[1].route as any)} borderRadius={Radius.xl} style={st.gridCardFill}>
              <View style={st.gridContent}>
                <View style={[st.iconWrap, { backgroundColor: features[1].accent + '1A' }]}>
                  <Ionicons name={features[1].icon} size={22} color={features[1].accent} />
                </View>
                <Text style={st.gridTitle}>{features[1].title}</Text>
                <Text style={st.gridSub} numberOfLines={2}>{features[1].subtitle}</Text>
              </View>
            </GlassCard>
          ), st.gridCell)}
        </View>

        {/* Row 2 */}
        <View style={st.gridRow}>
          {animWrap(2, (
            <GlassCard onPress={() => router.push(features[2].route as any)} borderRadius={Radius.xl} style={st.gridCardFill}>
              <View style={st.gridContent}>
                <View style={[st.iconWrap, { backgroundColor: features[2].accent + '1A' }]}>
                  <Ionicons name={features[2].icon} size={22} color={features[2].accent} />
                </View>
                <Text style={st.gridTitle}>{features[2].title}</Text>
                <Text style={st.gridSub} numberOfLines={2}>{features[2].subtitle}</Text>
              </View>
            </GlassCard>
          ), st.gridCell)}
          {animWrap(3, (
            <GlassCard onPress={() => router.push(features[3].route as any)} borderRadius={Radius.xl} style={st.gridCardFill}>
              <View style={st.gridContent}>
                <View style={[st.iconWrap, { backgroundColor: features[3].accent + '1A' }]}>
                  <Ionicons name={features[3].icon} size={22} color={features[3].accent} />
                </View>
                <Text style={st.gridTitle}>{features[3].title}</Text>
                <Text style={st.gridSub} numberOfLines={2}>{features[3].subtitle}</Text>
              </View>
            </GlassCard>
          ), st.gridCell)}
        </View>

        {/* Bottom compact rows */}
        {[4, 5].map((i) => animWrap(i, (
          <GlassCard onPress={() => router.push(features[i].route as any)} borderRadius={Radius.lg}>
            <View style={st.compactInner}>
              <View style={[st.iconSmall, { backgroundColor: features[i].accent + '1A' }]}>
                <Ionicons name={features[i].icon} size={18} color={features[i].accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.compactTitle}>{features[i].title}</Text>
                <Text style={st.compactSub} numberOfLines={1}>{features[i].subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
            </View>
          </GlassCard>
        ), st.compactWrap))}

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
    greetSection: { marginBottom: Spacing.lg + 4 },
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

    /* Grid */
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
      marginBottom: 3,
    },
    gridSub: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 16,
    },

    /* Compact rows */
    compactWrap: {
      marginBottom: GAP,
    },
    compactInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    iconSmall: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    compactTitle: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      marginBottom: 1,
    },
    compactSub: {
      fontSize: Typography.fontSize.xs,
      color: colors.textSecondary,
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
