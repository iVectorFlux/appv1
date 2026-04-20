/**
 * Skill Lab — landing (route: /skill-lab)
 */

import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Animated,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useColors,
  Spacing,
  Typography,
  Radius,
  Shadows,
  Layout,
} from '@/constants/design-tokens';
import { useAuthStore } from '@/stores/auth-store';
import { FUTURE_SKILLS } from '@/data/future-skills';
import { getSkillsProgress } from '@/services/skills-storage';
import type { SkillProgress } from '@/services/skills-storage';
import { getOfflineSessionCounts } from '@/services/skill-lab-offline-progress';
import { useWebLaptopLayout } from '@/hooks/useWebLaptopLayout';

const STAGGER = 60;
const FADE_MS = 350;

export default function SkillLabScreen() {
  const router = useRouter();
  const colors = useColors();
  const isWebLaptop = useWebLaptopLayout();
  const { user } = useAuthStore();
  const [progress, setProgress] = useState<Record<string, SkillProgress>>({});
  const [offlineBySkill, setOfflineBySkill] = useState<Record<string, number>>({});

  const headerFade = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef(FUTURE_SKILLS.map(() => new Animated.Value(0))).current;

  const loadProgress = useCallback(() => {
    if (user?.id) {
      Promise.all([getSkillsProgress(user.id), getOfflineSessionCounts()]).then(([p, off]) => {
        setProgress(p);
        setOfflineBySkill(off);
      });
    } else {
      setProgress({});
      setOfflineBySkill({});
    }
  }, [user?.id]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  useFocusEffect(
    useCallback(() => {
      loadProgress();
    }, [loadProgress])
  );

  useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: FADE_MS, useNativeDriver: true }).start();
    Animated.stagger(
      STAGGER,
      cardAnims.map((a) => Animated.timing(a, { toValue: 1, duration: FADE_MS, useNativeDriver: true }))
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only entrance; refs stable
  }, []);

  const sessionCountForSkill = useCallback(
    (skillId: string) => {
      const r = progress[skillId]?.sessionsCompleted ?? 0;
      const o = offlineBySkill[skillId] ?? 0;
      return r + o;
    },
    [progress, offlineBySkill]
  );

  const skillsStarted = FUTURE_SKILLS.filter((s) => sessionCountForSkill(s.id) > 0).length;
  const totalSessions = FUTURE_SKILLS.reduce((sum, s) => sum + sessionCountForSkill(s.id), 0);

  const styles = createStyles(colors);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, isWebLaptop && styles.contentWebLaptop]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerFade, transform: [{ translateY: headerFade.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <View style={[styles.headerIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="rocket-outline" size={20} color={colors.primary} />
            </View>
            <Text style={styles.title}>Skill Lab</Text>
          </View>
          <Text style={styles.subtitle}>
            {`${FUTURE_SKILLS.length} skills that matter most in an AI-powered world — practice with AI coaching`}
          </Text>
        </View>
      </Animated.View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, Shadows.card]}>
          <View style={[styles.statIcon, { backgroundColor: colors.primary + '12' }]}>
            <Ionicons name="rocket-outline" size={16} color={colors.primary} />
          </View>
          <Text style={styles.statNumber}>{skillsStarted}</Text>
          <Text style={styles.statLabel}>Skills started</Text>
        </View>
        <View style={[styles.statCard, Shadows.card]}>
          <View style={[styles.statIcon, { backgroundColor: colors.accentIndigo + '12' }]}>
            <Ionicons name="flash-outline" size={16} color={colors.accentIndigo} />
          </View>
          <Text style={styles.statNumber}>{totalSessions}</Text>
          <Text style={styles.statLabel}>Practice sessions</Text>
        </View>
      </View>

      {/* Section label */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>All skills</Text>
        <Text style={styles.sectionCount}>{FUTURE_SKILLS.length}</Text>
      </View>

      {/* Skills — single column on phone; 3-up tiles on laptop web */}
      <View style={[styles.grid, isWebLaptop && styles.gridWebLaptop]}>
        {FUTURE_SKILLS.map((skill, idx) => {
          const sessions = sessionCountForSkill(skill.id);
          const hasPracticed = sessions > 0;

          return (
            <Animated.View
              key={skill.id}
              style={[
                isWebLaptop && styles.cardWebLaptopWrap,
                {
                  opacity: cardAnims[idx],
                  transform: [{ translateY: cardAnims[idx].interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
                },
              ]}
            >
              <TouchableOpacity
                style={[styles.card, Shadows.card, isWebLaptop && styles.cardWebLaptop]}
                onPress={() => router.push(`/skill-lab/${skill.id}`)}
                activeOpacity={0.75}
              >
                <View style={[styles.iconCircle, { backgroundColor: skill.color + '18' }]}>
                  <Ionicons name={skill.icon as any} size={22} color={skill.color} />
                </View>

                <View style={[styles.cardContent, isWebLaptop && styles.cardContentWebLaptop]}>
                  <Text style={styles.skillName}>{skill.name}</Text>
                  <Text style={[styles.skillTagline, isWebLaptop && styles.skillTaglineWeb]} numberOfLines={isWebLaptop ? 2 : 1}>
                    {skill.tagline}
                  </Text>

                  <View style={styles.metaRow}>
                    <Ionicons name="layers-outline" size={12} color={colors.textMuted} />
                    <Text style={styles.metaText}>{skill.atomicSkills.length} sub-skills</Text>
                  </View>

                  {/* Progress bar */}
                  {hasPracticed && (
                    <View style={styles.progressBarWrap}>
                      <View style={[styles.progressBarTrack, { backgroundColor: colors.border }]}>
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              backgroundColor: skill.color,
                              width: `${Math.min(100, (sessions / (skill.atomicSkills.length * 3)) * 100)}%` as any,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.progressBarText, { color: colors.textMuted }]}>
                        {sessions} {sessions === 1 ? 'session' : 'sessions'}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={[styles.cardRight, isWebLaptop && styles.cardRightWebLaptop]}>
                  {hasPracticed ? (
                    <View style={[styles.progressBadge, { backgroundColor: colors.primary + '12' }]}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                      <Text style={[styles.progressText, { color: colors.primary }]}>
                        {sessions}
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.startBadge, { borderColor: skill.color, backgroundColor: skill.color + '08' }]}>
                      <Text style={[styles.startText, { color: skill.color }]}>Start</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
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
      paddingBottom: Spacing['2xl'],
      maxWidth: Layout.maxWidth,
      alignSelf: 'center',
      width: '100%',
    },
    contentWebLaptop: {
      maxWidth: 1120,
      paddingHorizontal: Spacing.xl,
    },
    header: {
      paddingTop: Platform.OS === 'ios' ? 52 : Spacing.lg,
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing.md,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.sm,
    },
    backBtn: {
      marginTop: 2,
    },
    headerText: {
      flex: 1,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginBottom: Spacing.xs,
    },
    headerIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: Typography.fontSize['2xl'],
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      lineHeight: Typography.fontSize.sm * 1.5,
    },
    statsRow: {
      flexDirection: 'row',
      paddingHorizontal: Spacing.md,
      gap: Spacing.sm,
      marginBottom: Spacing.lg,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.floating,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Spacing.md,
      alignItems: 'center',
      gap: Spacing.xs,
    },
    statIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statNumber: {
      fontSize: Typography.fontSize['2xl'],
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
    },
    statLabel: {
      fontSize: Typography.fontSize.xs,
      color: colors.textMuted,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
      marginBottom: Spacing.sm,
      gap: Spacing.sm,
    },
    sectionLabel: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textSecondary,
    },
    sectionCount: {
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.medium,
      color: colors.textMuted,
      backgroundColor: colors.surface,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: Radius.full,
      overflow: 'hidden',
    },
    grid: {
      paddingHorizontal: Spacing.md,
      gap: Spacing.sm,
    },
    gridWebLaptop: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      width: '100%',
      paddingHorizontal: 0,
      gap: Spacing.md,
      justifyContent: 'flex-start',
    },
    card: {
      backgroundColor: colors.floating,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    cardWebLaptopWrap: {
      width: '32%' as any,
      maxWidth: 340,
    },
    cardWebLaptop: {
      flexDirection: 'column',
      alignItems: 'stretch',
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    cardContentWebLaptop: {
      flex: 0,
      width: '100%',
    },
    skillTaglineWeb: {
      marginBottom: Spacing.sm,
    },
    cardRightWebLaptop: {
      marginTop: 'auto' as any,
      flexDirection: 'row',
      alignSelf: 'flex-end',
    },
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardContent: {
      flex: 1,
    },
    skillName: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      marginBottom: 2,
    },
    skillTagline: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      marginBottom: Spacing.xs,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontSize: Typography.fontSize.xs,
      color: colors.textMuted,
    },
    progressBarWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginTop: Spacing.xs,
    },
    progressBarTrack: {
      flex: 1,
      height: 3,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 2,
    },
    progressBarText: {
      fontSize: Typography.fontSize.micro,
    },
    cardRight: {
      alignItems: 'center',
      gap: Spacing.xs,
    },
    progressBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
      borderRadius: Radius.full,
    },
    progressText: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
    },
    startBadge: {
      borderWidth: 1,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
    },
    startText: {
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.medium,
    },
  });
