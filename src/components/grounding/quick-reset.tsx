/**
 * Quick Reset — Mode 1 (60 seconds, auto-complete)
 *
 * Steps:
 *  1. Physiological sigh breathing with glowing orb (3 cycles ≈ 30s)
 *  2. "Name 3 objects you can see" text prompt (15s)
 *  3. "Press feet into floor" hold timer (10s)
 *
 * Design: immersive dark bg, multi-ring glowing orb, large typography,
 *         breath-synced motion, colour sweep (cool → warm), no scroll.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Typography, Radius, Layout } from '@/constants/design-tokens';
import type { GroundingModeProps } from '@/types/grounding';
import { PHYSIOLOGICAL_SIGH_PATTERN } from '@/data/grounding-content';

type Step = 'breathe' | 'anchor' | 'ground';
type BreathPhase = 'in' | 'hold' | 'out';

// Map physiological sigh pattern (seconds) to ms for animation
const BREATH = {
  inhale: PHYSIOLOGICAL_SIGH_PATTERN.inhale * 1000,
  hold:   PHYSIOLOGICAL_SIGH_PATTERN.sighInhale * 1000,
  exhale: PHYSIOLOGICAL_SIGH_PATTERN.exhale * 1000,
};
const BREATH_CYCLES = 3;
const ANCHOR_DURATION = 15_000;
const GROUND_DURATION = 10_000;
const TOTAL_DURATION =
  BREATH_CYCLES * (BREATH.inhale + BREATH.hold + BREATH.exhale) + ANCHOR_DURATION + GROUND_DURATION;

const STEP_LABELS: Record<Step, string> = {
  breathe: 'Step 1 of 3 · Breathing',
  anchor:  'Step 2 of 3 · Visual anchor',
  ground:  'Step 3 of 3 · Grounding',
};

// Phase display config
const PHASE_INFO: Record<BreathPhase, { label: string; timing: string; color: string }> = {
  in:   { label: 'Breathe in through your nose',      timing: `${PHYSIOLOGICAL_SIGH_PATTERN.inhale}s`,       color: '#6EA8FE' },
  hold: { label: 'Take a short top-up inhale',        timing: `${PHYSIOLOGICAL_SIGH_PATTERN.sighInhale}s`,   color: '#A78BFA' },
  out:  { label: 'Long exhale through your mouth',    timing: `${PHYSIOLOGICAL_SIGH_PATTERN.exhale}s`,       color: '#F97316' },
};

export function QuickReset({ onComplete, onExit }: GroundingModeProps) {
  const colors = useColors();
  const [step, setStep]             = useState<Step>('breathe');
  const [breathPhase, setBreathPhase] = useState<BreathPhase>('in');
  const [breathCycle, setBreathCycle] = useState(0);
  const [countdown, setCountdown]   = useState(0);

  // Orb animations
  const orbScale    = useRef(new Animated.Value(1)).current;
  const orbOpacity  = useRef(new Animated.Value(0.5)).current;
  const ringPulse   = useRef(new Animated.Value(1)).current;
  const textFade    = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const startTime   = useRef(Date.now());

  // Memoized Animated.multiply results so they are not re-created on every render
  const ring3Opacity = useRef(Animated.multiply(orbOpacity, new Animated.Value(0.12))).current;
  const ring2Opacity = useRef(Animated.multiply(orbOpacity, new Animated.Value(0.25))).current;
  const ring3Scale   = useRef(Animated.multiply(orbScale, ringPulse)).current;

  // Ambient ring pulse (continuous)
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(ringPulse, { toValue: 1.08, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(ringPulse, { toValue: 1,    duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [ringPulse]);

  // Progress bar
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: 100,
      duration: TOTAL_DURATION,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  }, [progressAnim]);

  const fadeToStep = useCallback(
    (next: Step) => {
      Animated.timing(textFade, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setStep(next);
        textFade.setValue(0);
        Animated.timing(textFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      });
    },
    [textFade],
  );

  // Breathing animation with phase colours
  const runBreathCycle = useCallback(
    (cycle: number) => {
      if (cycle >= BREATH_CYCLES) {
        fadeToStep('anchor');
        return;
      }
      setBreathCycle(cycle);

      // Inhale – cool blue expansion
      setBreathPhase('in');
      Animated.parallel([
        Animated.timing(orbScale, {
          toValue: 1.25,
          duration: BREATH.inhale,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(orbOpacity, { toValue: 0.85, duration: BREATH.inhale, useNativeDriver: true }),
      ]).start(() => {
        // Top-up inhale
        setBreathPhase('hold');
        Animated.parallel([
          Animated.timing(orbScale, {
            toValue: 1.35,
            duration: BREATH.hold,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(orbOpacity, { toValue: 0.95, duration: BREATH.hold, useNativeDriver: true }),
        ]).start(() => {
          // Long exhale – warm amber
          setBreathPhase('out');
          Animated.parallel([
            Animated.timing(orbScale, {
              toValue: 1,
              duration: BREATH.exhale,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(orbOpacity, { toValue: 0.5, duration: BREATH.exhale, useNativeDriver: true }),
          ]).start(() => runBreathCycle(cycle + 1));
        });
      });
    },
    [fadeToStep, orbOpacity, orbScale],
  );

  useEffect(() => { runBreathCycle(0); }, [runBreathCycle]);

  // Anchor countdown
  useEffect(() => {
    if (step !== 'anchor') return;
    setCountdown(Math.ceil(ANCHOR_DURATION / 1000));
    const iv = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(iv); fadeToStep('ground'); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [step, fadeToStep]);

  // Ground countdown
  useEffect(() => {
    if (step !== 'ground') return;
    setCountdown(Math.ceil(GROUND_DURATION / 1000));
    const iv = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(iv);
          onComplete(Math.min(100, Math.round(((Date.now() - startTime.current) / TOTAL_DURATION) * 100)));
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [step, onComplete]);

  const styles = createStyles(colors);
  const phaseInfo = PHASE_INFO[breathPhase];
  const orbColor  = step === 'breathe' ? phaseInfo.color : colors.destructive;

  return (
    <View style={styles.container}>
      {/* Progress */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, {
          width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
          backgroundColor: orbColor,
        }]} />
      </View>

      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.stepLabel}>{STEP_LABELS[step]}</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onExit} hitSlop={12}>
          <Ionicons name="close" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <Animated.View style={[styles.center, { opacity: textFade }]}>
        {step === 'breathe' && (
          <>
            {/* Multi-ring glowing orb */}
            <View style={styles.orbContainer}>
              <Animated.View style={[
                styles.orbRing3,
                {
                  backgroundColor: orbColor,
                  transform: [{ scale: ring3Scale }],
                  opacity: ring3Opacity,
                },
              ]} />
              <Animated.View style={[
                styles.orbRing2,
                {
                  backgroundColor: orbColor,
                  transform: [{ scale: orbScale }],
                  opacity: ring2Opacity,
                },
              ]} />
              <Animated.View style={[
                styles.orbCore,
                { backgroundColor: orbColor, transform: [{ scale: orbScale }], opacity: orbOpacity },
              ]} />
            </View>

            <View style={styles.breathTextBlock}>
              <Text style={[styles.phaseText, { color: colors.textPrimary }]}>{phaseInfo.label}</Text>
              <View style={styles.metaRow}>
                <View style={[styles.metaPill, { borderColor: phaseInfo.color + '50', backgroundColor: phaseInfo.color + '14' }]}>
                  <Text style={[styles.metaPillText, { color: phaseInfo.color }]}>{phaseInfo.timing}</Text>
                </View>
                <View style={styles.metaPill}>
                  <Text style={styles.metaPillText}>
                    Breath {breathCycle + 1}/{BREATH_CYCLES}
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}

        {step === 'anchor' && (
          <>
            <View style={styles.iconGlow}>
              <Ionicons name="eye-outline" size={44} color={colors.destructive} />
            </View>
            <Text style={styles.promptText}>Name 3 objects{'\n'}you can see right now</Text>
            <Text style={styles.promptHint}>Look around slowly</Text>
            <View style={styles.timerCircle}>
              <Text style={styles.timerNumber}>{countdown}</Text>
            </View>
          </>
        )}

        {step === 'ground' && (
          <>
            <View style={styles.iconGlow}>
              <Ionicons name="footsteps-outline" size={44} color={colors.destructive} />
            </View>
            <Text style={styles.promptText}>Press your feet{'\n'}firmly into the floor</Text>
            <Text style={styles.promptHint}>Hold it. Feel the ground beneath you.</Text>
            <View style={styles.timerCircle}>
              <Text style={styles.timerNumber}>{countdown}</Text>
            </View>
          </>
        )}
      </Animated.View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    /* ── Progress ─────────────────────────────────────── */
    progressTrack: { height: 3, backgroundColor: colors.surface, position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
    progressFill: { height: 3, borderRadius: 2 },

    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Layout.paddingHorizontal, paddingTop: Spacing.xl, paddingBottom: Spacing.sm, zIndex: 10 },
    stepLabel: { fontSize: Typography.fontSize.sm, color: colors.textMuted, fontFamily: Typography.fontFamily.primary },
    closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.full, backgroundColor: colors.surface },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Layout.paddingHorizontal },

    orbContainer: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
    orbRing3: { position: 'absolute', width: 220, height: 220, borderRadius: 110 },
    orbRing2: { position: 'absolute', width: 170, height: 170, borderRadius: 85 },
    orbCore:  { width: 120, height: 120, borderRadius: 60 },

    breathTextBlock: { alignItems: 'center', marginTop: Spacing.lg, maxWidth: 320 },
    phaseText: {
      fontSize: Typography.fontSize.heroCard,
      fontWeight: Typography.fontWeight.semibold,
      fontFamily: Typography.fontFamily.heading,
      textAlign: 'center',
      lineHeight: 36,
      marginBottom: Spacing.md,
    },
    metaRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', justifyContent: 'center' },
    metaPill: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.full,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    metaPillText: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      fontFamily: Typography.fontFamily.primary,
      fontWeight: Typography.fontWeight.semibold,
    },

    iconGlow: {
      width: 72, height: 72, borderRadius: 36,
      backgroundColor: colors.destructive + '18',
      borderWidth: 1.5, borderColor: colors.destructive + '30',
      alignItems: 'center', justifyContent: 'center',
      marginBottom: Spacing.lg,
    },
    promptText: {
      fontSize: Typography.fontSize.heroCard, fontWeight: Typography.fontWeight.semibold, color: colors.textPrimary,
      fontFamily: Typography.fontFamily.heading, textAlign: 'center',
      lineHeight: 36, marginBottom: Spacing.md,
    },
    promptHint: { fontSize: Typography.fontSize.base, color: colors.textSecondary, fontFamily: Typography.fontFamily.primary, textAlign: 'center', marginBottom: Spacing.xl },

    timerCircle: {
      width: 64, height: 64, borderRadius: 32,
      borderWidth: 2.5, borderColor: colors.destructive + '50',
      alignItems: 'center', justifyContent: 'center',
    },
    timerNumber: { fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold, color: colors.destructive, fontFamily: Typography.fontFamily.heading },
  });
