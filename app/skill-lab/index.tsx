/**
 * Skill Lab - landing (route: /skill-lab)
 *
 * Main skills only as a grid of cards; tap a skill to open sub-skills + practice on the detail screen.
 */

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useColors,
  Spacing,
  Typography,
  Radius,
  Layout,
  Shadows,
} from '@/constants/design-tokens';
import { useAuthStore } from '@/stores/auth-store';
import { FUTURE_SKILLS } from '@/data/future-skills';
import { getSkillsProgress } from '@/services/skills-storage';
import type { SkillProgress } from '@/services/skills-storage';
import { getOfflineSessionCounts } from '@/services/skill-lab-offline-progress';
import { useWebLaptopLayout } from '@/hooks/useWebLaptopLayout';
import { ScreenHeader } from '@/components/ui/screen-header';
import { GlassCard } from '@/components/ui/glass-card';

const STAGGER = 45;
const FADE_MS = 300;
const GAP = 12;

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
      <ScreenHeader title="Skill Lab" backFallbackHref="/(tabs)/home" showHomeButton />

      <Animated.View
        style={[
          styles.intro,
          { opacity: headerFade, transform: [{ translateY: headerFade.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] },
        ]}
      >
        <Text style={styles.subtitle}>
          Choose a skill to see its sub-skills and start AI practice.
        </Text>
        <View style={styles.statsInline}>
          <View style={styles.statPill}>
            <Ionicons name="rocket-outline" size={14} color={colors.primary} />
            <Text style={styles.statPillText}>
              <Text style={styles.statPillNum}>{skillsStarted}</Text>
              {` / ${FUTURE_SKILLS.length} started`}
            </Text>
          </View>
          <View style={styles.statPill}>
            <Ionicons name="flash-outline" size={14} color={colors.accentIndigo} />
            <Text style={styles.statPillText}>
              <Text style={styles.statPillNum}>{totalSessions}</Text>
              {` session${totalSessions === 1 ? '' : 's'}`}
            </Text>
          </View>
        </View>
      </Animated.View>

      <Text style={styles.sectionLabel}>Skills</Text>

      <View style={[styles.grid, isWebLaptop && styles.gridWeb]}>
        {FUTURE_SKILLS.map((skill, idx) => {
          const sessions = sessionCountForSkill(skill.id);
          const n = skill.atomicSkills.length;

          return (
            <Animated.View
              key={skill.id}
              style={[
                isWebLaptop ? styles.cellWeb : styles.cell,
                {
                  opacity: cardAnims[idx],
                  transform: [{ translateY: cardAnims[idx].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
                },
              ]}
            >
              <GlassCard
                borderRadius={Radius.xl}
                noPadding
                onPress={() => router.push(`/skill-lab/${skill.id}`)}
                style={[styles.cardOuter, Shadows.card]}
              >
                <View style={[styles.accentBar, { backgroundColor: skill.color }]} />
                <View style={styles.cardInner}>
                  <View style={[styles.iconTile, { backgroundColor: skill.color + '18' }]}>
                    <Ionicons name={skill.icon as any} size={28} color={skill.color} />
                  </View>
                  <Text style={styles.skillTitle} numberOfLines={2}>
                    {skill.name}
                  </Text>
                  <Text style={styles.skillTagline} numberOfLines={2}>
                    {skill.tagline}
                  </Text>
                  <View style={styles.cardFooter}>
                    <View style={styles.meta}>
                      <Ionicons name="layers-outline" size={13} color={colors.textMuted} />
                      <Text style={styles.metaText}>{n} sub-skills</Text>
                    </View>
                    {sessions > 0 && (
                      <View style={[styles.sessDot, { backgroundColor: colors.primary + '18' }]}>
                        <Text style={[styles.sessText, { color: colors.primary }]}>{sessions}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </GlassCard>
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
      maxWidth: 960,
      paddingHorizontal: Spacing.xl,
    },
    intro: {
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing.md,
    },
    subtitle: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      lineHeight: Typography.fontSize.sm * 1.5,
      textAlign: 'left',
    },
    statsInline: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
      marginTop: Spacing.md,
    },
    statPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: Spacing.sm + 2,
      paddingVertical: 6,
      borderRadius: Radius.full,
      backgroundColor: colors.floating,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statPillText: {
      fontSize: Typography.fontSize.xs,
      color: colors.textSecondary,
    },
    statPillNum: {
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
    },
    sectionLabel: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textSecondary,
      paddingHorizontal: Spacing.md,
      marginBottom: Spacing.sm,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: Spacing.md,
      gap: GAP,
      justifyContent: 'space-between',
    },
    gridWeb: {
      justifyContent: 'flex-start',
    },
    cell: {
      width: '48%' as any,
      minWidth: 148,
    },
    cellWeb: {
      width: '31%' as any,
      maxWidth: 300,
      minWidth: 200,
    },
    cardOuter: {
      overflow: 'hidden',
      minHeight: 168,
    },
    accentBar: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
      borderTopLeftRadius: Radius.xl - 1,
      borderBottomLeftRadius: Radius.xl - 1,
    },
    cardInner: {
      paddingLeft: Spacing.md + 6,
      paddingRight: Spacing.md,
      paddingVertical: Spacing.md,
      flex: 1,
    },
    iconTile: {
      width: 52,
      height: 52,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.sm,
    },
    skillTitle: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
      letterSpacing: -0.2,
      marginBottom: 4,
    },
    skillTagline: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      lineHeight: Typography.fontSize.sm * 1.35,
      marginBottom: Spacing.sm,
      minHeight: 36,
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 'auto' as any,
    },
    meta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    metaText: {
      fontSize: Typography.fontSize.xs,
      color: colors.textMuted,
    },
    sessDot: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: Radius.full,
    },
    sessText: {
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.semibold,
    },
  });
