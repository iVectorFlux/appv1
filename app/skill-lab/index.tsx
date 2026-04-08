/**
 * Skill Lab — landing (route: /skill-lab)
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
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

export default function SkillLabScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuthStore();
  const [progress, setProgress] = useState<Record<string, SkillProgress>>({});

  const loadProgress = useCallback(() => {
    if (user?.id) {
      getSkillsProgress(user.id).then(setProgress);
    } else {
      setProgress({});
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

  const styles = createStyles(colors);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Skill Lab</Text>
          <Text style={styles.subtitle}>
            {`The ${FUTURE_SKILLS.length} skills that matter most in an AI-powered world — practice with AI coaching`}
          </Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, Shadows.card]}>
          <Text style={styles.statNumber}>
            {Object.values(progress).filter((p) => p.sessionsCompleted > 0).length}
          </Text>
          <Text style={styles.statLabel}>Skills started</Text>
        </View>
        <View style={[styles.statCard, Shadows.card]}>
          <Text style={styles.statNumber}>
            {Object.values(progress).reduce((sum, p) => sum + p.sessionsCompleted, 0)}
          </Text>
          <Text style={styles.statLabel}>Practice sessions</Text>
        </View>
      </View>

      {/* Skills grid */}
      <View style={styles.grid}>
        {FUTURE_SKILLS.map((skill) => {
          const p = progress[skill.id];
          const hasPracticed = (p?.sessionsCompleted ?? 0) > 0;

          return (
            <TouchableOpacity
              key={skill.id}
              style={[styles.card, Shadows.card]}
              onPress={() => router.push(`/skill-lab/${skill.id}`)}
              activeOpacity={0.75}
            >
              {/* Icon */}
              <View style={[styles.iconCircle, { backgroundColor: skill.color + '18' }]}>
                <Ionicons name={skill.icon as any} size={22} color={skill.color} />
              </View>

              {/* Content */}
              <View style={styles.cardContent}>
                <Text style={styles.skillName}>{skill.name}</Text>
                <Text style={styles.skillTagline} numberOfLines={1}>
                  {skill.tagline}
                </Text>

                {/* Atomic skill count */}
                <View style={styles.metaRow}>
                  <Ionicons name="layers-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.metaText}>{skill.atomicSkills.length} sub-skills</Text>
                </View>
              </View>

              {/* Progress / Status */}
              <View style={styles.cardRight}>
                {hasPracticed ? (
                  <View style={styles.progressBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                    <Text style={[styles.progressText, { color: colors.primary }]}>
                      {p.sessionsCompleted}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.startBadge, { borderColor: skill.color }]}>
                    <Text style={[styles.startText, { color: skill.color }]}>Start</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
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
    title: {
      fontSize: Typography.fontSize['2xl'],
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
      marginBottom: Spacing.xs,
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
    },
    statNumber: {
      fontSize: Typography.fontSize['2xl'],
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
    },
    statLabel: {
      fontSize: Typography.fontSize.xs,
      color: colors.textMuted,
      marginTop: Spacing.xs,
    },
    grid: {
      paddingHorizontal: Spacing.md,
      gap: Spacing.sm,
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
    cardRight: {
      alignItems: 'center',
      gap: Spacing.xs,
    },
    progressBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
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
