/**
 * Skill Lab — save practice context (background, role, industry, seniority)
 * for tailored scenarios. Stored locally only.
 */

import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useColors,
  Spacing,
  Typography,
  Radius,
} from '@/constants/design-tokens';
import {
  DEFAULT_SKILL_PRACTICE_CONTEXT,
  loadSkillPracticeContext,
  saveSkillPracticeContext,
  clearSkillPracticeContext,
  getContextCompleteness,
  type PracticeBackground,
  type SkillPracticeContext,
  PRACTICE_BACKGROUND_LABELS,
} from '@/services/skill-practice-context';

const BACKGROUND_OPTIONS: { key: Exclude<PracticeBackground, ''>; icon: string; emoji: string }[] = [
  { key: 'student', icon: 'school-outline', emoji: '🎓' },
  { key: 'early_career', icon: 'trending-up-outline', emoji: '🚀' },
  { key: 'professional', icon: 'briefcase-outline', emoji: '💼' },
  { key: 'entrepreneur', icon: 'bulb-outline', emoji: '💡' },
  { key: 'leader', icon: 'people-outline', emoji: '👔' },
  { key: 'other', icon: 'ellipsis-horizontal-outline', emoji: '✦' },
];

export default function PracticeSetupScreen() {
  const router = useRouter();
  const colors = useColors();
  const [ctx, setCtx] = useState<SkillPracticeContext>({ ...DEFAULT_SKILL_PRACTICE_CONTEXT });
  const [loaded, setLoaded] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadSkillPracticeContext().then((c) => {
      setCtx(c);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [loaded, fadeAnim]);

  const styles = createStyles(colors);
  const completeness = getContextCompleteness(ctx);

  const onSave = useCallback(async () => {
    await saveSkillPracticeContext(ctx);
    setSavedFlash(true);
    flashAnim.setValue(0);
    Animated.timing(flashAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    setTimeout(() => setSavedFlash(false), 2500);
  }, [ctx, flashAnim]);

  const onClear = useCallback(async () => {
    await clearSkillPracticeContext();
    setCtx({ ...DEFAULT_SKILL_PRACTICE_CONTEXT });
  }, []);

  if (!loaded) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted }}>Loading…</Text>
      </View>
    );
  }

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <View style={styles.titleRow}>
              <View style={[styles.headerIcon, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="person-outline" size={18} color={colors.primary} />
              </View>
              <Text style={styles.title}>Practice context</Text>
            </View>
            <Text style={styles.subtitle}>
              Optional details help generate scenarios that fit your world — school, work, industry, and level.
            </Text>
          </View>
        </View>

        {/* Completeness indicator */}
        <View style={[styles.completenessCard, { borderColor: colors.border, backgroundColor: colors.floating }]}>
          <View style={styles.completenessRow}>
            <Text style={[styles.completenessLabel, { color: colors.textSecondary }]}>Profile completeness</Text>
            <Text style={[styles.completenessValue, { color: completeness.filled === completeness.total ? colors.primary : colors.textMuted }]}>
              {completeness.filled}/{completeness.total}
            </Text>
          </View>
          <View style={[styles.completenessTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.completenessFill,
                {
                  backgroundColor: completeness.filled === completeness.total ? colors.primary : colors.accentIndigo,
                  width: `${(completeness.filled / completeness.total) * 100}%` as any,
                },
              ]}
            />
          </View>
          {completeness.filled === 0 && (
            <Text style={[styles.completenessHint, { color: colors.textMuted }]}>
              Fill in any fields below to help tailor AI scenarios to your world.
            </Text>
          )}
        </View>

        {/* Background — cards with icons */}
        <Text style={styles.fieldLabel}>Background</Text>
        <View style={styles.bgGrid}>
          <TouchableOpacity
            style={[
              styles.bgCard,
              {
                borderColor: ctx.background === '' ? colors.primary : colors.border,
                backgroundColor: ctx.background === '' ? colors.primary + '10' : colors.surface,
              },
            ]}
            onPress={() => setCtx((c) => ({ ...c, background: '' }))}
            activeOpacity={0.75}
          >
            <Text style={styles.bgEmoji}>—</Text>
            <Text style={[styles.bgLabel, { color: ctx.background === '' ? colors.primary : colors.textSecondary }]}>
              Prefer not to say
            </Text>
          </TouchableOpacity>
          {BACKGROUND_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.bgCard,
                {
                  borderColor: ctx.background === opt.key ? colors.primary : colors.border,
                  backgroundColor: ctx.background === opt.key ? colors.primary + '10' : colors.surface,
                },
              ]}
              onPress={() => setCtx((c) => ({ ...c, background: opt.key }))}
              activeOpacity={0.75}
            >
              <Text style={styles.bgEmoji}>{opt.emoji}</Text>
              <Text
                style={[
                  styles.bgLabel,
                  { color: ctx.background === opt.key ? colors.primary : colors.textSecondary },
                ]}
              >
                {PRACTICE_BACKGROUND_LABELS[opt.key]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Form fields — grouped card */}
        <View style={[styles.formGroup, { borderColor: colors.border, backgroundColor: colors.floating }]}>
          <View style={styles.formField}>
            <Text style={styles.formFieldLabel}>Role or title</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.textPrimary }]}
              value={ctx.roleTitle}
              onChangeText={(roleTitle) => setCtx((c) => ({ ...c, roleTitle }))}
              placeholder="e.g. Product manager, teacher, founder"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={[styles.formDivider, { backgroundColor: colors.border }]} />

          <View style={styles.formField}>
            <Text style={styles.formFieldLabel}>Industry</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.textPrimary }]}
              value={ctx.industry}
              onChangeText={(industry) => setCtx((c) => ({ ...c, industry }))}
              placeholder="e.g. Healthcare, education, software"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={[styles.formDivider, { backgroundColor: colors.border }]} />

          <View style={styles.formField}>
            <Text style={styles.formFieldLabel}>Seniority</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.textPrimary }]}
              value={ctx.seniority}
              onChangeText={(seniority) => setCtx((c) => ({ ...c, seniority }))}
              placeholder="e.g. Individual contributor, manager, director"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={onSave}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            <Text style={styles.saveBtnText}>Save context</Text>
          </TouchableOpacity>
        </View>

        {completeness.filled > 0 && (
          <TouchableOpacity onPress={onClear} style={styles.clearLink} activeOpacity={0.65}>
            <Ionicons name="trash-outline" size={14} color={colors.destructive} />
            <Text style={[styles.clearLinkText, { color: colors.destructive }]}>Clear all fields</Text>
          </TouchableOpacity>
        )}

        {savedFlash && (
          <Animated.View style={[styles.flashRow, { opacity: flashAnim }]}>
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            <Text style={[styles.flashText, { color: colors.primary }]}>Saved. Scenarios will use this until you change it.</Text>
          </Animated.View>
        )}
      </ScrollView>
    </Animated.View>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    container: { flex: 1, backgroundColor: colors.background },
    content: {
      paddingBottom: Spacing['2xl'],
      paddingHorizontal: Spacing.md,
      maxWidth: 560,
      alignSelf: 'center',
      width: '100%',
    },
    header: {
      paddingTop: Platform.OS === 'ios' ? 52 : Spacing.lg,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.sm,
      marginBottom: Spacing.lg,
    },
    backBtn: { marginTop: 2 },
    headerText: { flex: 1 },
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

    /* Completeness */
    completenessCard: {
      borderWidth: 1,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.lg,
      gap: Spacing.sm,
    },
    completenessRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    completenessLabel: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.medium,
    },
    completenessValue: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.bold,
    },
    completenessTrack: {
      height: 4,
      borderRadius: 2,
      overflow: 'hidden',
    },
    completenessFill: {
      height: '100%',
      borderRadius: 2,
    },
    completenessHint: {
      fontSize: Typography.fontSize.xs,
      lineHeight: Typography.fontSize.xs * 1.45,
    },

    /* Background selector */
    fieldLabel: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      marginBottom: Spacing.sm,
    },
    bgGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
      marginBottom: Spacing.lg,
    },
    bgCard: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm + 2,
      borderRadius: Radius.md,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    bgEmoji: {
      fontSize: 16,
    },
    bgLabel: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.medium,
    },

    /* Form group */
    formGroup: {
      borderWidth: 1,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.md,
      gap: Spacing.sm,
    },
    formField: {
      gap: Spacing.xs,
    },
    formFieldLabel: {
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textSecondary,
    },
    formDivider: {
      height: 1,
      marginVertical: Spacing.xs,
    },
    input: {
      borderWidth: 1,
      borderRadius: Radius.md,
      padding: Spacing.sm + 2,
      fontSize: Typography.fontSize.base,
    },

    /* Actions */
    actionsRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    saveBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      borderRadius: Radius.lg,
      paddingVertical: Spacing.md,
    },
    saveBtnText: {
      color: '#fff',
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
    },
    clearLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      marginTop: Spacing.md,
      paddingVertical: Spacing.xs,
    },
    clearLinkText: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.medium,
    },
    flashRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginTop: Spacing.md,
      backgroundColor: colors.primary + '10',
      borderRadius: Radius.md,
      padding: Spacing.sm,
    },
    flashText: {
      flex: 1,
      fontSize: Typography.fontSize.sm,
      lineHeight: Typography.fontSize.sm * 1.45,
    },
  });
