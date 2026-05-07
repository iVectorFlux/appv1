/**
 * Skill Lab — Landing (route: /skill-lab)
 *
 * Editorial enterprise design: paper background, serif + sans + mono triad,
 * single-column reading width, clean card surfaces with light borders.
 * Tap a skill to open sub-skills + practice on the detail screen.
 */

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  SLColors,
  SLTypography,
  SLSpacing,
  SLLayout,
  SLRadius,
  SLMotion,
} from '@/constants/skill-lab-tokens';
import { useAuthStore } from '@/stores/auth-store';
import { FUTURE_SKILLS } from '@/data/future-skills';
import { getSkillsProgress } from '@/services/skills-storage';
import type { SkillProgress } from '@/services/skills-storage';
import { getOfflineSessionCounts } from '@/services/skill-lab-offline-progress';
import { useWebLaptopLayout } from '@/hooks/useWebLaptopLayout';
import { ScreenHeader } from '@/components/ui/screen-header';

const STAGGER = 50;
const FADE_MS = SLMotion.normal;

export default function SkillLabScreen() {
  const router = useRouter();
  const isWebLaptop = useWebLaptopLayout();
  const { user } = useAuthStore();
  const [progress, setProgress] = useState<Record<string, SkillProgress>>({});
  const [offlineBySkill, setOfflineBySkill] = useState<Record<string, number>>({});

  const headerFade = useRef(new Animated.Value(0)).current;
  const railFade = useRef(new Animated.Value(0)).current;
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
    Animated.timing(railFade, { toValue: 1, duration: FADE_MS, useNativeDriver: true }).start();
    Animated.timing(headerFade, { toValue: 1, duration: FADE_MS + 100, useNativeDriver: true }).start();
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
  const progressPct = FUTURE_SKILLS.length > 0 ? (skillsStarted / FUTURE_SKILLS.length) * 100 : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, isWebLaptop && styles.contentWebLaptop]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Progress Rail ─────────────────────────────────────────── */}
      <Animated.View style={[styles.progressRail, { opacity: railFade }]}>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: `${progressPct}%` as any,
                backgroundColor: progressPct >= 100 ? SLColors.success : SLColors.brandPrimary,
              },
            ]}
          />
        </View>
      </Animated.View>

      <ScreenHeader title="Skill Lab" backFallbackHref="/(tabs)/home" showHomeButton />

      {/* ── Header + Stats ────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.intro,
          {
            opacity: headerFade,
            transform: [{ translateY: headerFade.interpolate({ inputRange: [0, 1], outputRange: [SLMotion.entranceOffset, 0] }) }],
          },
        ]}
      >
        <Text style={styles.pageSubtitle}>
          Choose a skill to see its sub-skills and start AI practice.
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statBlock}>
            <Text style={styles.statNumber}>{skillsStarted}</Text>
            <Text style={styles.statLabel}>
              {'/ ' + FUTURE_SKILLS.length + ' STARTED'}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBlock}>
            <Text style={styles.statNumber}>{totalSessions}</Text>
            <Text style={styles.statLabel}>
              {totalSessions === 1 ? 'SESSION' : 'SESSIONS'}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* ── Section Label ─────────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>SKILLS</Text>

      {/* ── Skill Cards ───────────────────────────────────────────── */}
      <View style={styles.cardList}>
        {FUTURE_SKILLS.map((skill, idx) => {
          const sessions = sessionCountForSkill(skill.id);
          const n = skill.atomicSkills.length;

          return (
            <Animated.View
              key={skill.id}
              style={[
                styles.cardWrapper,
                {
                  opacity: cardAnims[idx],
                  transform: [{ translateY: cardAnims[idx].interpolate({ inputRange: [0, 1], outputRange: [SLMotion.entranceOffset, 0] }) }],
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => router.push(`/skill-lab/${skill.id}`)}
                activeOpacity={0.82}
                style={styles.card}
              >
                {/* Left accent bar */}
                <View style={[styles.accentBar, { backgroundColor: skill.color }]} />

                <View style={styles.cardBody}>
                  <View style={styles.cardTop}>
                    <View style={[styles.iconTile, { backgroundColor: skill.color + '14' }]}>
                      <Ionicons name={skill.icon as any} size={22} color={skill.color} />
                    </View>
                    <View style={styles.cardTitleArea}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {skill.name}
                      </Text>
                      <Text style={styles.cardTagline} numberOfLines={2}>
                        {skill.tagline}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <View style={styles.metaChip}>
                      <Ionicons name="layers-outline" size={12} color={SLColors.inkMuted} />
                      <Text style={styles.metaText}>{n} sub-skills</Text>
                    </View>
                    {sessions > 0 && (
                      <View style={[styles.sessionBadge, { backgroundColor: skill.color + '14' }]}>
                        <Text style={[styles.sessionBadgeText, { color: skill.color }]}>
                          {sessions} {sessions === 1 ? 'session' : 'sessions'}
                        </Text>
                      </View>
                    )}
                    <View style={styles.cardArrow}>
                      <Ionicons name="chevron-forward" size={16} color={SLColors.inkDisabled} />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles — Editorial Enterprise Design
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SLColors.bgPage,
  },
  content: {
    paddingBottom: SLSpacing['5xl'],
    maxWidth: SLLayout.contentMaxWidth,
    alignSelf: 'center' as any,
    width: '100%' as any,
  },
  contentWebLaptop: {
    maxWidth: SLLayout.contentMaxWidth,
    paddingHorizontal: SLSpacing.xl,
  },

  // Progress rail
  progressRail: {
    paddingHorizontal: 0,
  },
  progressTrack: {
    height: SLLayout.progressRailHeight,
    backgroundColor: SLColors.borderDefault,
    overflow: 'hidden' as any,
  },
  progressFill: {
    height: '100%' as any,
    borderRadius: 2,
    ...(Platform.OS === 'web' ? { transition: 'width 0.4s ease' } : {}),
  } as any,

  // Intro
  intro: {
    paddingHorizontal: SLSpacing.lg,
    paddingBottom: SLSpacing['3xl'],
  },
  pageSubtitle: {
    fontFamily: SLTypography.fontFamily.serif,
    fontSize: SLTypography.fontSize.base,
    color: SLColors.inkSecondary,
    lineHeight: SLTypography.fontSize.base * SLTypography.lineHeight.loose,
    marginBottom: SLSpacing.lg,
  },

  // Stats
  statsRow: {
    flexDirection: 'row' as any,
    alignItems: 'center' as any,
    gap: SLSpacing.lg,
  },
  statBlock: {
    alignItems: 'flex-start' as any,
  },
  statNumber: {
    fontFamily: SLTypography.fontFamily.sans,
    fontSize: SLTypography.fontSize.xl,
    fontWeight: SLTypography.fontWeight.bold,
    color: SLColors.inkPrimary,
    letterSpacing: SLTypography.letterSpacing.tight,
  },
  statLabel: {
    fontFamily: SLTypography.fontFamily.mono,
    fontSize: SLTypography.fontSize.micro,
    fontWeight: SLTypography.fontWeight.medium,
    color: SLColors.inkMuted,
    letterSpacing: SLTypography.fontSize.micro * SLTypography.letterSpacing.uppercase,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: SLColors.borderDefault,
  },

  // Section label
  sectionLabel: {
    fontFamily: SLTypography.fontFamily.mono,
    fontSize: SLTypography.fontSize.xs,
    fontWeight: SLTypography.fontWeight.semibold,
    color: SLColors.inkMuted,
    letterSpacing: SLTypography.fontSize.xs * SLTypography.letterSpacing.label,
    paddingHorizontal: SLSpacing.lg,
    marginBottom: SLSpacing.sm,
  },

  // Card list
  cardList: {
    paddingHorizontal: SLSpacing.lg,
    gap: SLSpacing.sm,
  },

  cardWrapper: {},

  card: {
    backgroundColor: SLColors.bgSurface,
    borderWidth: 1,
    borderColor: SLColors.borderDefault,
    borderRadius: SLRadius.lg,
    overflow: 'hidden' as any,
    flexDirection: 'row' as any,
    ...(Platform.OS === 'web' ? { transition: 'border-color 0.15s ease, box-shadow 0.15s ease', cursor: 'pointer' } : {}),
  } as any,

  accentBar: {
    width: 3,
    alignSelf: 'stretch' as any,
  },

  cardBody: {
    flex: 1,
    paddingVertical: SLSpacing.md,
    paddingLeft: SLSpacing.md,
    paddingRight: SLSpacing.md,
    gap: SLSpacing.sm,
  },

  cardTop: {
    flexDirection: 'row' as any,
    alignItems: 'center' as any,
    gap: SLSpacing.sm,
  },

  iconTile: {
    width: 40,
    height: 40,
    borderRadius: SLRadius.md,
    alignItems: 'center' as any,
    justifyContent: 'center' as any,
  },

  cardTitleArea: {
    flex: 1,
  },

  cardTitle: {
    fontFamily: SLTypography.fontFamily.sans,
    fontSize: SLTypography.fontSize.base,
    fontWeight: SLTypography.fontWeight.semibold,
    color: SLColors.inkPrimary,
    letterSpacing: SLTypography.letterSpacing.tight,
  },

  cardTagline: {
    fontFamily: SLTypography.fontFamily.serif,
    fontSize: SLTypography.fontSize.sm,
    color: SLColors.inkSecondary,
    lineHeight: SLTypography.fontSize.sm * SLTypography.lineHeight.normal,
    fontStyle: 'italic' as any,
    marginTop: 2,
  },

  cardFooter: {
    flexDirection: 'row' as any,
    alignItems: 'center' as any,
    gap: SLSpacing.xs,
    marginTop: SLSpacing.xxs,
  },

  metaChip: {
    flexDirection: 'row' as any,
    alignItems: 'center' as any,
    gap: 4,
  },

  metaText: {
    fontFamily: SLTypography.fontFamily.mono,
    fontSize: SLTypography.fontSize.micro,
    color: SLColors.inkMuted,
    letterSpacing: SLTypography.fontSize.micro * SLTypography.letterSpacing.label,
  },

  sessionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: SLRadius.full,
  },

  sessionBadgeText: {
    fontFamily: SLTypography.fontFamily.mono,
    fontSize: SLTypography.fontSize.micro,
    fontWeight: SLTypography.fontWeight.medium,
  },

  cardArrow: {
    marginLeft: 'auto' as any,
  },
});
