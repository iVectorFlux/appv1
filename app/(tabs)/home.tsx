/**
 * Home — Glassmorphic dashboard
 *
 * Assessments & progress (EQ check-in, full EQ, Big Five, Progress) + 2×2 explore grid.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
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
import { getEQScores } from '@/services/eq-storage';
import { getLatestBig5Assessment } from '@/services/big5-storage';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  assessmentTypeLabel,
  formatShortDate,
  latestByType,
  latestOverall,
  type EqScoreSnapshot,
} from '@/lib/home-assessment-summary';

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
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [eqSnapshots, setEqSnapshots] = useState<EqScoreSnapshot[]>([]);
  const [big5CompletedAt, setBig5CompletedAt] = useState<string | null>(null);

  const exploreFeatures: ExploreFeature[] = [
    { key: 'learn', title: 'Learn EQ', icon: 'book-outline', accent: colors.accentIndigo, route: '/(tabs)/learn' },
    { key: 'companion', title: 'AI Companion', icon: 'chatbubble-ellipses-outline', accent: colors.accentTerracotta, route: '/(tabs)/companion' },
    { key: 'skill-lab', title: 'Skill Lab', icon: 'rocket-outline', accent: colors.accentSage, route: '/skill-lab' },
    { key: 'recover', title: 'Recover', icon: 'leaf-outline', accent: colors.accentCalm, route: '/(tabs)/recover' },
  ];

  const assessmentActions = React.useMemo(
    () =>
      [
        {
          key: 'eq-check',
          title: 'EQ Check-in',
          subtitle: '5 quick questions · ~2 min',
          icon: 'pulse-outline' as const,
          accent: colors.accentWarmTan,
          route: '/(tabs)/eq',
        },
        {
          key: 'progress',
          title: 'Progress',
          subtitle: 'EQ, learning & Skill Lab',
          icon: 'stats-chart-outline' as const,
          accent: colors.accentTerracotta,
          route: '/(tabs)/progress',
        },
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
      ] as const,
    [colors]
  );

  const anims = useRef(exploreFeatures.map(() => new Animated.Value(0))).current;
  const greetAnim = useRef(new Animated.Value(0)).current;
  const assessAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadAssessmentSummary = useCallback(async () => {
    if (!user?.id || !isSupabaseConfigured()) {
      setEqSnapshots([]);
      setBig5CompletedAt(null);
      setSummaryLoading(false);
      return;
    }
    setSummaryLoading(true);
    try {
      const [scores, big5] = await Promise.all([
        getEQScores(user.id, 30).catch(() => []),
        getLatestBig5Assessment(user.id),
      ]);
      setEqSnapshots(
        scores.map((s) => ({
          completedAt: s.completedAt,
          overallScore: s.overallScore,
          assessmentType: s.assessmentType,
        }))
      );
      setBig5CompletedAt(big5?.completed_at ?? null);
    } catch {
      setEqSnapshots([]);
      setBig5CompletedAt(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadAssessmentSummary();
  }, [loadAssessmentSummary]);

  useFocusEffect(
    useCallback(() => {
      loadAssessmentSummary();
    }, [loadAssessmentSummary])
  );

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

  const latest = latestOverall(eqSnapshots);
  const lastCheckIn = latestByType(eqSnapshots, 'check_in');
  const lastFull = latestByType(eqSnapshots, 'full_test');

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

        {/* Assessments & progress */}
        <Animated.View style={[st.assessSection, { opacity: assessAnim }]}>
          <Text style={st.sectionHeading}>Assessments & progress</Text>
          <GlassCard borderRadius={Radius.lg} style={st.snapshotCard}>
            {summaryLoading ? (
              <View style={st.snapshotLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={st.snapshotMuted}>Loading your snapshot…</Text>
              </View>
            ) : (
              <>
                <View style={st.snapshotRow}>
                  <Ionicons name="heart-outline" size={20} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={st.snapshotTitle}>EQ</Text>
                    {latest ? (
                      <Text style={st.snapshotBody}>
                        Latest score <Text style={st.snapshotEm}>{latest.overallScore}</Text>
                        {' · '}
                        {assessmentTypeLabel(latest.assessmentType)}
                        {formatShortDate(latest.completedAt) ? ` · ${formatShortDate(latest.completedAt)}` : ''}
                      </Text>
                    ) : (
                      <Text style={st.snapshotBody}>No completed EQ session yet — start with a check-in below.</Text>
                    )}
                  </View>
                </View>
                <View style={[st.snapshotRow, { marginTop: Spacing.sm }]}>
                  <Ionicons name="git-compare-outline" size={20} color={colors.accentIndigo} />
                  <View style={{ flex: 1 }}>
                    <Text style={st.snapshotTitle}>Check-in vs full test</Text>
                    <Text style={st.snapshotBody}>
                      {lastCheckIn
                        ? `Last check-in: ${lastCheckIn.overallScore} · ${formatShortDate(lastCheckIn.completedAt) ?? ''}`
                        : 'No check-in yet'}
                      {' · '}
                      {lastFull
                        ? `Full test: ${lastFull.overallScore} · ${formatShortDate(lastFull.completedAt) ?? ''}`
                        : 'Full test: not completed'}
                    </Text>
                  </View>
                </View>
                <View style={[st.snapshotRow, { marginTop: Spacing.sm }]}>
                  <Ionicons name="color-wand-outline" size={20} color={colors.accentIndigo} />
                  <View style={{ flex: 1 }}>
                    <Text style={st.snapshotTitle}>Big Five</Text>
                    <Text style={st.snapshotBody}>
                      {big5CompletedAt
                        ? `Last completed ${formatShortDate(big5CompletedAt) ?? ''}`
                        : 'Not completed yet — tap Big Five below.'}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </GlassCard>

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

        <Text style={[st.sectionHeading, { marginBottom: Spacing.sm }]}>Explore</Text>

        {isWebLaptop ? (
          <View style={st.webTileGrid}>
            {exploreFeatures.map((_, i) => (
              <React.Fragment key={exploreFeatures[i].key}>{renderExploreTile(i)}</React.Fragment>
            ))}
          </View>
        ) : (
          <>
            <View style={st.gridRow}>
              {renderExploreTile(0)}
              {renderExploreTile(1)}
            </View>
            <View style={st.gridRow}>
              {renderExploreTile(2)}
              {renderExploreTile(3)}
            </View>
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
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      marginBottom: Spacing.sm,
    },
    assessSection: {
      marginBottom: Spacing.lg + 4,
    },
    snapshotCard: {
      padding: Spacing.md,
      marginBottom: Spacing.md,
    },
    snapshotLoading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.xs,
    },
    snapshotMuted: {
      fontSize: Typography.fontSize.sm,
      color: colors.textMuted,
    },
    snapshotRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.sm,
    },
    snapshotTitle: {
      fontSize: Typography.fontSize.micro,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      marginBottom: 2,
    },
    snapshotBody: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      lineHeight: Typography.fontSize.sm * 1.45,
    },
    snapshotEm: {
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
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
