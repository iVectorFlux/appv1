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
import { useWebLaptopLayout } from '@/hooks/useWebLaptopLayout';

const STAGGER = 70;
const FADE_MS = 420;
const GAP = 12;

interface Feature {
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

  const features: Feature[] = [
    { key: 'learn', title: 'Learn EQ', icon: 'book-outline', accent: colors.accentIndigo, route: '/(tabs)/learn' },
    { key: 'companion', title: 'AI Companion', icon: 'chatbubble-ellipses-outline', accent: colors.accentTerracotta, route: '/(tabs)/companion' },
    { key: 'skill-lab', title: 'Skill Lab', icon: 'rocket-outline', accent: colors.accentSage, route: '/skill-lab' },
    { key: 'recover', title: 'Recover', icon: 'leaf-outline', accent: colors.accentCalm, route: '/(tabs)/recover' },
    { key: 'eq', title: 'EQ Check-in', icon: 'pulse-outline', accent: colors.accentWarmTan, route: '/(tabs)/eq' },
    { key: 'progress', title: 'Progress', icon: 'stats-chart-outline', accent: colors.accentTerracotta, route: '/(tabs)/progress' },
  ];

  const anims = useRef(features.map(() => new Animated.Value(0))).current;
  const greetAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    Animated.timing(greetAnim, { toValue: 1, duration: FADE_MS, useNativeDriver: true }).start();
    Animated.stagger(STAGGER, anims.map((a) => Animated.timing(a, { toValue: 1, duration: FADE_MS, useNativeDriver: true }))).start();
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
      key={features[index].key}
      style={[
        wrapStyle,
        { opacity: anims[index], transform: [{ translateY: anims[index].interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] },
      ]}
    >
      {children}
    </Animated.View>
  );

  const renderTile = (index: number) => {
    const f = features[index];
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

        {isWebLaptop ? (
          <View style={st.webTileGrid}>
            {features.map((_, i) => (
              <React.Fragment key={features[i].key}>{renderTile(i)}</React.Fragment>
            ))}
          </View>
        ) : (
          <>
            <View style={st.gridRow}>
              {renderTile(0)}
              {renderTile(1)}
            </View>
            <View style={st.gridRow}>
              {renderTile(2)}
              {renderTile(3)}
            </View>
            {[4, 5].map((i) => animWrap(i, (
              <GlassCard key={features[i].key} onPress={() => router.push(features[i].route as never)} borderRadius={Radius.lg}>
                <View style={st.compactInner}>
                  <View style={[st.iconSmall, { backgroundColor: features[i].accent + '1A' }]}>
                    <Ionicons name={features[i].icon} size={18} color={features[i].accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.compactTitle}>{features[i].title}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
                </View>
              </GlassCard>
            ), st.compactWrap))}
          </>
        )}

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
