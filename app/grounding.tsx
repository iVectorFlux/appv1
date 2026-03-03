/**
 * Grounding Hub Screen
 *
 * State machine: 'select' → 'active' → 'complete'
 *
 * - select:  Choose a tag + pick a technique
 * - active:  Renders chosen technique full-screen
 * - complete: Post-session stress re-rate + save
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Typography, Radius, Shadows } from '@/constants/design-tokens';
import { useAuthStore } from '@/stores/auth-store';
import { saveRecoverySession } from '@/services/recovery-storage';
import { GROUNDING_MODES } from '@/data/grounding-content';
import type { GroundingMode, StressLevel, EmotionalTone, GroundingSession } from '@/types/grounding';

// Mode components
import { QuickReset } from '@/components/grounding/quick-reset';
import { SensoryAnchor } from '@/components/grounding/sensory-anchor';
import { BoxBreathing } from '@/components/grounding/box-breathing';
import { PreMeeting } from '@/components/grounding/pre-meeting';
import { PostConflict } from '@/components/grounding/post-conflict';
import { TagChip } from '@/components/ui/tag-chip';

type ScreenState = 'select' | 'active' | 'complete';
type BreathingTag =
  | 'anger'
  | 'panic'
  | 'conflict'
  | 'pre_meeting'
  | 'calm'
  | 'reset'
  | 'focus'
  | 'post_meeting';

/** Stress level color gradient from cool → warm */
const STRESS_COLORS = ['#60A5FA', '#34D399', '#FBBF24', '#F97316', '#FB923C'];

export default function GroundingScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuthStore();

  const [screen, setScreen] = useState<ScreenState>('select');
  const [stressLevel, setStressLevel] = useState<StressLevel>(3);
  const [emotionalTone, setEmotionalTone] = useState<EmotionalTone | null>(null);
  const [selectedMode, setSelectedMode] = useState<GroundingMode | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<BreathingTag | null>(null);
  const [sessionStart, setSessionStart] = useState<string>('');
  const [stressAfter, setStressAfter] = useState<StressLevel | null>(null);
  const [completionPct, setCompletionPct] = useState(0);
  const [helpful, setHelpful] = useState<boolean | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const transitionTo = useCallback(
    (next: ScreenState) => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.97, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        setScreen(next);
        fadeAnim.setValue(0);
        scaleAnim.setValue(1.02);
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]).start();
      });
    },
    [fadeAnim, scaleAnim],
  );

  const beginMode = useCallback(
    (mode: GroundingMode) => {
      setSelectedMode(mode);
      setSessionStart(new Date().toISOString());
      transitionTo('active');
    },
    [transitionTo],
  );

  const handleModeComplete = useCallback(
    (pct: number) => {
      setCompletionPct(pct);
      // Stress re-rate only for techniques meant to reduce stress (not pre-meeting).
      setStressAfter(selectedMode && selectedMode !== 'pre_meeting' ? stressLevel : null);
      setHelpful(null);
      transitionTo('complete');
    },
    [selectedMode, stressLevel, transitionTo],
  );

  const handleModeExit = useCallback(() => transitionTo('select'), [transitionTo]);

  const handleDone = useCallback(async () => {
    if (!user?.id || !selectedMode) {
      router.back();
      return;
    }
    const session: GroundingSession = {
      mode: selectedMode,
      stressBefore: stressLevel,
      stressAfter,
      emotionalTone,
      completionPct,
      durationMs: Date.now() - new Date(sessionStart).getTime(),
      startedAt: sessionStart,
      completedAt: new Date().toISOString(),
      helpful,
    };
    setSaveError(null);
    try {
      await saveRecoverySession(user.id, session);
      router.back();
    } catch (e) {
      console.error('[Grounding] Save failed:', e);
      setSaveError(e instanceof Error ? e.message : 'Could not save. Check connection and try again.');
    }
  }, [user, selectedMode, stressLevel, stressAfter, emotionalTone, completionPct, sessionStart, helpful, router]);

  const styles = createStyles(colors);

  // ═══════════════════════════════════════════════════════════════════
  // ACTIVE
  // ═══════════════════════════════════════════════════════════════════
  if (screen === 'active' && selectedMode) {
    const modeProps = { stressLevel, emotionalTone, onComplete: handleModeComplete, onExit: handleModeExit };
    switch (selectedMode) {
      case 'quick_reset': return <QuickReset {...modeProps} />;
      case 'sensory_anchor': return <SensoryAnchor {...modeProps} />;
      case 'box_breathing': return <BoxBreathing {...modeProps} />;
      case 'pre_meeting': return <PreMeeting {...modeProps} />;
      case 'post_conflict': return <PostConflict {...modeProps} />;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // SELECT
  // ═══════════════════════════════════════════════════════════════════
  if (screen === 'select') {
    const tags: Array<{ id: BreathingTag; label: string; defaultStress: StressLevel }> = [
      { id: 'calm', label: 'Calm', defaultStress: 2 },
      { id: 'reset', label: 'Reset', defaultStress: 3 },
      { id: 'focus', label: 'Focus', defaultStress: 3 },
      { id: 'panic', label: 'Panic', defaultStress: 5 },
      { id: 'anger', label: 'Anger', defaultStress: 5 },
      { id: 'conflict', label: 'Conflict', defaultStress: 4 },
      { id: 'pre_meeting', label: 'Pre‑meeting', defaultStress: 4 },
      { id: 'post_meeting', label: 'Post‑meeting', defaultStress: 2 },
    ];

    const recommendedByTag: Record<BreathingTag, GroundingMode> = {
      calm: 'sensory_anchor',
      reset: 'quick_reset',
      focus: 'sensory_anchor',
      panic: 'box_breathing',
      anger: 'post_conflict',
      conflict: 'post_conflict',
      pre_meeting: 'pre_meeting',
      post_meeting: 'quick_reset',
    };

    const accentForMode = (mode: GroundingMode) => {
      if (mode === 'quick_reset') return colors.accentWarm;
      if (mode === 'box_breathing') return colors.primary;
      if (mode === 'sensory_anchor') return colors.accentCalm;
      if (mode === 'pre_meeting') return colors.accentEnergy;
      return colors.accentSoft;
    };

    const renderTechniqueCard = (mode: GroundingMode, isRecommended: boolean) => {
      const cfg = GROUNDING_MODES.find((m) => m.id === mode);
      const accent = accentForMode(mode);
      return (
        <TouchableOpacity
          key={mode}
          style={[
            styles.techniqueCard,
            Shadows.card,
            { borderColor: isRecommended ? accent : colors.borderLight },
          ]}
          activeOpacity={0.9}
          onPress={() => {
            setSelectedScenarioId(selectedTag);
            setEmotionalTone(null);
            beginMode(mode);
          }}
        >
          <View style={[styles.techniqueIconWrap, { backgroundColor: accent }]}>
            <Ionicons name={(cfg?.icon as any) ?? 'leaf-outline'} size={22} color={colors.primaryForeground} />
          </View>
          <Text style={styles.techniqueTitle}>{cfg?.label ?? mode}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      );
    };

    const recommendedMode = selectedTag ? recommendedByTag[selectedTag] : null;

    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.topTitle}>Grounding</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <Animated.View style={[styles.flexOne, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <ScrollView contentContainerStyle={styles.selectScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.heading}>What do you want to shift?</Text>

            <View style={styles.tagRow}>
              {tags.map((t) => {
                const active = selectedTag === t.id;
                const accent = accentForMode(recommendedByTag[t.id]);
                return (
                  <TagChip
                    key={t.id}
                    label={t.label}
                    selected={active}
                    selectedColor={accent}
                    onPress={() => {
                      setSelectedTag(active ? null : t.id);
                      setStressLevel(t.defaultStress);
                    }}
                    style={!active ? { borderColor: accent + '33' } : undefined}
                  />
                );
              })}
            </View>

            {recommendedMode && (
              <>
                <Text style={styles.sectionHeader}>Recommended</Text>
                {renderTechniqueCard(recommendedMode, true)}
              </>
            )}

            <Text style={styles.sectionHeader}>All techniques</Text>
            <View style={styles.techniqueList}>
              {GROUNDING_MODES.map((m) => renderTechniqueCard(m.id, recommendedMode === m.id))}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // COMPLETE
  // ═══════════════════════════════════════════════════════════════════
  const delta = stressAfter != null ? stressLevel - stressAfter : 0;
  const modeLabel = GROUNDING_MODES.find((m) => m.id === selectedMode)?.label ?? '';

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.completeWrap, { opacity: fadeAnim }]}>
        {/* Success icon with glow */}
        <View style={styles.successGlow}>
          <View style={styles.successInner}>
            <Ionicons name="checkmark" size={36} color={colors.success} />
          </View>
        </View>

        <Text style={styles.completeHeading}>Did it help?</Text>
        {modeLabel ? <Text style={styles.completeModeName}>{modeLabel}</Text> : null}

        <View style={styles.thumbRow}>
          <TouchableOpacity
            onPress={() => setHelpful(true)}
            activeOpacity={0.85}
            style={[styles.thumbBtn, helpful === true && styles.thumbBtnActive]}
          >
            <Ionicons name="thumbs-up-outline" size={22} color={helpful === true ? colors.primaryForeground : colors.textPrimary} />
            <Text style={[styles.thumbText, helpful === true && styles.thumbTextActive]}>Yes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setHelpful(false)}
            activeOpacity={0.85}
            style={[styles.thumbBtn, helpful === false && styles.thumbBtnActive]}
          >
            <Ionicons name="thumbs-down-outline" size={22} color={helpful === false ? colors.primaryForeground : colors.textPrimary} />
            <Text style={[styles.thumbText, helpful === false && styles.thumbTextActive]}>Not really</Text>
          </TouchableOpacity>
        </View>

        {stressAfter != null && (
          <>
            <Text style={[styles.stressSectionLabel, { marginTop: Spacing['2xl'], textAlign: 'center' }]}>
              How's your stress now?
            </Text>
            <View style={styles.stressRow}>
              {([1, 2, 3, 4, 5] as StressLevel[]).map((level) => {
                const isSelected = stressAfter === level;
                const accentColor = STRESS_COLORS[level - 1];
                return (
                  <TouchableOpacity
                    key={level}
                    onPress={() => setStressAfter(level)}
                    style={[styles.stressPill, isSelected && { backgroundColor: accentColor, borderColor: accentColor }]}
                  >
                    <Text style={[styles.stressPillText, isSelected && { color: '#fff' }]}>{level}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.stressLabelsRow}>
              <Text style={styles.stressCaption}>Low</Text>
              <Text style={styles.stressCaption}>High</Text>
            </View>
          </>
        )}

        {stressAfter != null && delta > 0 && (
          <View style={styles.deltaCard}>
            <Ionicons name="trending-down" size={20} color={colors.success} />
            <Text style={styles.deltaText}>Stress dropped by {delta} point{delta > 1 ? 's' : ''}</Text>
          </View>
        )}

        {saveError ? (
          <View style={styles.saveErrorWrap}>
            <Text style={styles.saveErrorText}>{saveError}</Text>
            <TouchableOpacity onPress={handleDone} style={styles.retrySaveBtn} activeOpacity={0.85}>
              <Text style={styles.retrySaveBtnText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.primaryBtn, { marginTop: Spacing['3xl'], alignSelf: 'stretch', opacity: helpful == null ? 0.6 : 1 }]}
          onPress={handleDone}
          activeOpacity={0.85}
          disabled={helpful == null}
        >
          <Text style={styles.primaryBtnText}>Done</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flexOne: { flex: 1 },

    /* ── Top bar ──────────────────────────────────────── */
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingTop: Spacing['3xl'] },
    topTitle: { fontSize: Typography.fontSize.sm, color: colors.textMuted, fontFamily: Typography.fontFamily.primary, fontWeight: Typography.fontWeight.medium, letterSpacing: 0.5 },
    closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: colors.surface },
    backRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    backText: { fontSize: Typography.fontSize.sm, color: colors.textSecondary, fontWeight: Typography.fontWeight.medium, fontFamily: Typography.fontFamily.primary },

    /* ── Headings & stress scale (used on complete screen) ───────────── */
    detectScroll: { padding: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing['5xl'] },
    heading: { fontSize: 26, fontWeight: Typography.fontWeight.bold, color: colors.textPrimary, fontFamily: Typography.fontFamily.heading, marginBottom: Spacing['2xl'], lineHeight: 34 },
    sectionLabel: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, color: colors.textSecondary, fontFamily: Typography.fontFamily.primary, marginBottom: Spacing.md },

    stressSectionLabel: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.medium, color: colors.textMuted, fontFamily: Typography.fontFamily.primary, marginBottom: Spacing.sm },
    stressRow: { flexDirection: 'row', gap: Spacing.xs },
    stressPill: {
      flex: 1, height: 36, borderRadius: Radius.md,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight,
    },
    stressPillText: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: colors.textPrimary, fontFamily: Typography.fontFamily.primary },
    stressLabelsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
    stressCaption: { fontSize: 10, color: colors.textMuted, fontFamily: Typography.fontFamily.primary },

    /* Tone tags (kept for future use if we reintroduce tone selection) */
    toneWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    toneTag: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
    toneTagActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    toneTagText: { fontSize: Typography.fontSize.sm, color: colors.textPrimary, fontFamily: Typography.fontFamily.primary, fontWeight: Typography.fontWeight.medium },
    toneTagTextActive: { color: colors.primaryForeground },

    /* Grounding hub */
    selectScroll: { padding: Spacing.xl, paddingBottom: Spacing['5xl'] },
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
    sectionHeader: {
      marginTop: Spacing['2xl'],
      marginBottom: Spacing.md,
      fontSize: Typography.fontSize.xs,
      color: colors.textMuted,
      fontFamily: Typography.fontFamily.primary,
      fontWeight: Typography.fontWeight.semibold,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    techniqueList: { gap: Spacing.md },
    techniqueCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      backgroundColor: colors.floating,
      borderRadius: Radius.xl,
      padding: Spacing.lg,
      borderWidth: 1.5,
    },
    techniqueIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    techniqueTitle: {
      flex: 1,
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      fontFamily: Typography.fontFamily.heading,
    },

    /* ── Complete ──────────────────────────────────────── */
    completeWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
    successGlow: {
      width: 100, height: 100, borderRadius: 50,
      backgroundColor: colors.success + '12',
      alignItems: 'center', justifyContent: 'center',
      marginBottom: Spacing.xl,
    },
    successInner: {
      width: 68, height: 68, borderRadius: 34,
      backgroundColor: colors.success + '20',
      borderWidth: 2, borderColor: colors.success + '40',
      alignItems: 'center', justifyContent: 'center',
    },
    completeHeading: { fontSize: 28, fontWeight: Typography.fontWeight.bold, color: colors.textPrimary, fontFamily: Typography.fontFamily.heading, marginBottom: Spacing.xs },
    completeModeName: { fontSize: Typography.fontSize.base, color: colors.textSecondary, fontFamily: Typography.fontFamily.primary },
    thumbRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing['2xl'] },
    thumbBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderRadius: Radius.full,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    thumbBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    thumbText: { fontSize: Typography.fontSize.base, color: colors.textPrimary, fontFamily: Typography.fontFamily.primary, fontWeight: Typography.fontWeight.semibold },
    thumbTextActive: { color: colors.primaryForeground },
    deltaCard: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      backgroundColor: colors.success + '12', borderRadius: Radius.lg,
      paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
      marginTop: Spacing.xl,
    },
    deltaText: { fontSize: Typography.fontSize.base, color: colors.success, fontWeight: Typography.fontWeight.medium, fontFamily: Typography.fontFamily.primary },

    saveErrorWrap: { marginTop: Spacing.lg, alignSelf: 'stretch', alignItems: 'center' },
    saveErrorText: { fontSize: Typography.fontSize.sm, color: colors.destructive, textAlign: 'center', marginBottom: Spacing.sm, fontFamily: Typography.fontFamily.primary },
    retrySaveBtn: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg },
    retrySaveBtnText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, color: colors.primary, fontFamily: Typography.fontFamily.primary },

    primaryBtn: {
      backgroundColor: colors.primary,
      borderRadius: Radius.lg,
      paddingVertical: Spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryBtnText: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, color: colors.primaryForeground, fontFamily: Typography.fontFamily.primary },
  });
