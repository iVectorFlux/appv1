/**
 * Grounding Entry Screen
 *
 * State machine: 'detect' → 'select' → 'active' → 'complete'
 *
 * - detect:  Self-rate stress + emotional tone → recommended mode
 * - select:  Browse all 5 modes (optional)
 * - active:  Renders chosen mode component full-screen
 * - complete: Post-session stress re-rate + save
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Typography, Radius, Shadows } from '@/constants/design-tokens';
import { useAuthStore } from '@/stores/auth-store';
import { saveRecoverySession } from '@/services/recovery-storage';
import { GROUNDING_MODES, EMOTIONAL_TONES, recommendMode } from '@/data/grounding-content';
import type {
  GroundingMode,
  StressLevel,
  EmotionalTone,
  GroundingSession,
} from '@/types/grounding';

// Mode components
import { QuickReset } from '@/components/grounding/quick-reset';
import { SensoryAnchor } from '@/components/grounding/sensory-anchor';
import { PanicInterrupt } from '@/components/grounding/panic-interrupt';
import { PreMeeting } from '@/components/grounding/pre-meeting';
import { PostConflict } from '@/components/grounding/post-conflict';

type ScreenState = 'detect' | 'select' | 'active' | 'complete';

export default function GroundingScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuthStore();

  // State machine
  const [screen, setScreen] = useState<ScreenState>('detect');

  // Detection
  const [stressLevel, setStressLevel] = useState<StressLevel>(3);
  const [emotionalTone, setEmotionalTone] = useState<EmotionalTone | null>(null);

  // Mode selection
  const [selectedMode, setSelectedMode] = useState<GroundingMode | null>(null);

  // Session tracking
  const [sessionStart, setSessionStart] = useState<string>('');
  const [stressAfter, setStressAfter] = useState<StressLevel>(3);
  const [completionPct, setCompletionPct] = useState(0);

  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const recommended = recommendMode(stressLevel, emotionalTone);
  const recommendedConfig = GROUNDING_MODES.find((m) => m.id === recommended)!;

  // ── Transition helper ──────────────────────────────────────────────
  const transitionTo = useCallback(
    (next: ScreenState) => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setScreen(next);
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    },
    [fadeAnim],
  );

  // ── Begin a mode ───────────────────────────────────────────────────
  const beginMode = useCallback(
    (mode: GroundingMode) => {
      setSelectedMode(mode);
      setSessionStart(new Date().toISOString());
      transitionTo('active');
    },
    [transitionTo],
  );

  // ── Mode completion callback ───────────────────────────────────────
  const handleModeComplete = useCallback(
    (pct: number) => {
      setCompletionPct(pct);
      setStressAfter(stressLevel); // default; user re-rates next
      transitionTo('complete');
    },
    [stressLevel, transitionTo],
  );

  const handleModeExit = useCallback(() => {
    transitionTo('detect');
  }, [transitionTo]);

  // ── Save session & close ───────────────────────────────────────────
  const handleDone = useCallback(async () => {
    if (user?.id && selectedMode) {
      const session: GroundingSession = {
        mode: selectedMode,
        stressBefore: stressLevel,
        stressAfter,
        emotionalTone,
        completionPct,
        durationMs: Date.now() - new Date(sessionStart).getTime(),
        startedAt: sessionStart,
        completedAt: new Date().toISOString(),
      };
      try {
        await saveRecoverySession(user.id, session);
      } catch (e) {
        console.error('[Grounding] Save failed:', e);
      }
    }
    router.back();
  }, [user, selectedMode, stressLevel, stressAfter, emotionalTone, completionPct, sessionStart, router]);

  const styles = createStyles(colors);

  // ══════════════════════════════════════════════════════════════════
  // ACTIVE — Render the chosen mode component full-screen
  // ══════════════════════════════════════════════════════════════════
  if (screen === 'active' && selectedMode) {
    const modeProps = {
      stressLevel,
      emotionalTone,
      onComplete: handleModeComplete,
      onExit: handleModeExit,
    };
    switch (selectedMode) {
      case 'quick_reset':
        return <QuickReset {...modeProps} />;
      case 'sensory_anchor':
        return <SensoryAnchor {...modeProps} />;
      case 'panic_interrupt':
        return <PanicInterrupt {...modeProps} />;
      case 'pre_meeting':
        return <PreMeeting {...modeProps} />;
      case 'post_conflict':
        return <PostConflict {...modeProps} />;
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // DETECT — Stress + tone self-report
  // ══════════════════════════════════════════════════════════════════
  if (screen === 'detect') {
    return (
      <View style={styles.container}>
        {/* Close button */}
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>

        <Animated.View style={[styles.detectWrap, { opacity: fadeAnim }]}>
          <ScrollView contentContainerStyle={styles.detectScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.heading}>How are you right now?</Text>

            {/* Stress level */}
            <Text style={styles.label}>Stress level</Text>
            <View style={styles.stressRow}>
              {([1, 2, 3, 4, 5] as StressLevel[]).map((level) => (
                <TouchableOpacity
                  key={level}
                  onPress={() => setStressLevel(level)}
                  style={[
                    styles.stressPill,
                    stressLevel === level && { backgroundColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.stressPillText,
                      stressLevel === level && { color: colors.primaryForeground },
                    ]}
                  >
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.stressLabels}>
              <Text style={styles.stressCaption}>Low</Text>
              <Text style={styles.stressCaption}>High</Text>
            </View>

            {/* Emotional tone */}
            <Text style={[styles.label, { marginTop: Spacing['2xl'] }]}>What best describes how you feel?</Text>
            <View style={styles.toneWrap}>
              {EMOTIONAL_TONES.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setEmotionalTone(emotionalTone === t.id ? null : t.id)}
                  style={[
                    styles.toneTag,
                    emotionalTone === t.id && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.toneTagText,
                      emotionalTone === t.id && { color: colors.primaryForeground },
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Recommendation */}
            <View style={styles.recommendCard}>
              <Ionicons name={(recommendedConfig.icon as any)} size={24} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <Text style={styles.recommendLabel}>Recommended</Text>
                <Text style={styles.recommendTitle}>{recommendedConfig.label}</Text>
                <Text style={styles.recommendDuration}>{recommendedConfig.duration}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.beginBtn} onPress={() => beginMode(recommended)} activeOpacity={0.8}>
              <Text style={styles.beginBtnText}>Begin</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.chooseOther} onPress={() => transitionTo('select')}>
              <Text style={styles.chooseOtherText}>Choose another mode</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // SELECT — All 5 modes
  // ══════════════════════════════════════════════════════════════════
  if (screen === 'select') {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => transitionTo('detect')}>
          <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>

        <Animated.View style={[styles.selectWrap, { opacity: fadeAnim }]}>
          <ScrollView contentContainerStyle={styles.selectScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.heading}>Choose a mode</Text>
            {GROUNDING_MODES.map((mode) => (
              <TouchableOpacity
                key={mode.id}
                style={[
                  styles.modeCard,
                  mode.id === recommended && { borderColor: colors.primary },
                ]}
                activeOpacity={0.7}
                onPress={() => beginMode(mode.id)}
              >
                <View style={styles.modeCardIcon}>
                  <Ionicons name={(mode.icon as any)} size={24} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.modeCardHeader}>
                    <Text style={styles.modeCardTitle}>{mode.label}</Text>
                    {mode.id === recommended && (
                      <View style={styles.recommendBadge}>
                        <Text style={styles.recommendBadgeText}>Recommended</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.modeCardSub}>{mode.subtitle} · {mode.duration}</Text>
                  <Text style={styles.modeCardDesc}>{mode.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // COMPLETE — Post-session stress re-rate & save
  // ══════════════════════════════════════════════════════════════════
  const delta = stressLevel - stressAfter;
  const modeLabel = GROUNDING_MODES.find((m) => m.id === selectedMode)?.label ?? '';

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.completeWrap, { opacity: fadeAnim }]}>
        <Ionicons name="checkmark-circle" size={56} color={colors.primary} style={{ marginBottom: Spacing.xl }} />
        <Text style={styles.heading}>How do you feel now?</Text>

        {/* Stress after */}
        <Text style={[styles.label, { marginTop: Spacing['2xl'] }]}>Stress level</Text>
        <View style={styles.stressRow}>
          {([1, 2, 3, 4, 5] as StressLevel[]).map((level) => (
            <TouchableOpacity
              key={level}
              onPress={() => setStressAfter(level)}
              style={[
                styles.stressPill,
                stressAfter === level && { backgroundColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.stressPillText,
                  stressAfter === level && { color: colors.primaryForeground },
                ]}
              >
                {level}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.stressLabels}>
          <Text style={styles.stressCaption}>Low</Text>
          <Text style={styles.stressCaption}>High</Text>
        </View>

        {/* Delta summary */}
        {delta > 0 && (
          <Text style={styles.deltaText}>
            Stress dropped by {delta} point{delta > 1 ? 's' : ''}
          </Text>
        )}

        <TouchableOpacity style={[styles.beginBtn, { marginTop: Spacing['3xl'] }]} onPress={handleDone} activeOpacity={0.8}>
          <Text style={styles.beginBtnText}>Done</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════════

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    /* ── Close / back buttons ─────────────────────────────────── */
    closeBtn: {
      position: 'absolute',
      top: Spacing['3xl'],
      right: Spacing.xl,
      zIndex: 10,
      padding: Spacing.sm,
    },
    backBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.lg,
      gap: Spacing.xs,
    },
    backBtnText: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      fontWeight: Typography.fontWeight.medium,
      fontFamily: Typography.fontFamily.primary,
    },

    /* ── Detect screen ────────────────────────────────────────── */
    detectWrap: {
      flex: 1,
    },
    detectScroll: {
      padding: Spacing.xl,
      paddingTop: Spacing['5xl'],
      paddingBottom: Spacing['5xl'],
    },
    heading: {
      fontSize: Typography.fontSize['3xl'],
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      fontFamily: Typography.fontFamily.heading,
      marginBottom: Spacing['2xl'],
    },
    label: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textSecondary,
      fontFamily: Typography.fontFamily.primary,
      marginBottom: Spacing.md,
    },
    stressRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    stressPill: {
      flex: 1,
      height: 48,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    stressPillText: {
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      fontFamily: Typography.fontFamily.primary,
    },
    stressLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: Spacing.xs,
    },
    stressCaption: {
      fontSize: Typography.fontSize.xs,
      color: colors.textMuted,
      fontFamily: Typography.fontFamily.primary,
    },

    /* ── Tone tags ────────────────────────────────────────────── */
    toneWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    toneTag: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    toneTagText: {
      fontSize: Typography.fontSize.sm,
      color: colors.textPrimary,
      fontFamily: Typography.fontFamily.primary,
    },

    /* ── Recommendation card ──────────────────────────────────── */
    recommendCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: Radius.xl,
      padding: Spacing.lg,
      marginTop: Spacing['3xl'],
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    recommendLabel: {
      fontSize: Typography.fontSize.xs,
      color: colors.textMuted,
      fontFamily: Typography.fontFamily.primary,
      marginBottom: 2,
    },
    recommendTitle: {
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      fontFamily: Typography.fontFamily.heading,
    },
    recommendDuration: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      fontFamily: Typography.fontFamily.primary,
      marginTop: 2,
    },

    /* ── Begin button ─────────────────────────────────────────── */
    beginBtn: {
      backgroundColor: colors.primary,
      borderRadius: Radius.lg,
      paddingVertical: Spacing.lg,
      alignItems: 'center',
      marginTop: Spacing.xl,
    },
    beginBtnText: {
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.primaryForeground,
      fontFamily: Typography.fontFamily.primary,
    },

    /* ── Choose another ───────────────────────────────────────── */
    chooseOther: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: Spacing.xl,
      gap: Spacing.xs,
    },
    chooseOtherText: {
      fontSize: Typography.fontSize.sm,
      color: colors.textMuted,
      fontFamily: Typography.fontFamily.primary,
    },

    /* ── Select screen ────────────────────────────────────────── */
    selectWrap: {
      flex: 1,
    },
    selectScroll: {
      padding: Spacing.xl,
      paddingBottom: Spacing['5xl'],
    },
    modeCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.surface,
      borderRadius: Radius.xl,
      padding: Spacing.lg,
      marginBottom: Spacing.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    modeCardIcon: {
      width: 44,
      height: 44,
      borderRadius: Radius.md,
      backgroundColor: colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.md,
    },
    modeCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginBottom: 2,
    },
    modeCardTitle: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      fontFamily: Typography.fontFamily.heading,
    },
    recommendBadge: {
      backgroundColor: colors.primary + '20',
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: Radius.full,
    },
    recommendBadgeText: {
      fontSize: Typography.fontSize.xs,
      color: colors.primary,
      fontWeight: Typography.fontWeight.medium,
      fontFamily: Typography.fontFamily.primary,
    },
    modeCardSub: {
      fontSize: Typography.fontSize.xs,
      color: colors.textMuted,
      fontFamily: Typography.fontFamily.primary,
      marginBottom: Spacing.xs,
    },
    modeCardDesc: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      fontFamily: Typography.fontFamily.primary,
      lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
    },

    /* ── Complete screen ──────────────────────────────────────── */
    completeWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.xl,
    },
    deltaText: {
      fontSize: Typography.fontSize.base,
      color: colors.success,
      fontWeight: Typography.fontWeight.medium,
      fontFamily: Typography.fontFamily.primary,
      marginTop: Spacing.lg,
    },
  });
