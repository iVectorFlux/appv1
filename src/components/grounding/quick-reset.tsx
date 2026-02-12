/**
 * Quick Reset — Mode 1 (60 seconds, auto-complete)
 *
 * Steps:
 *  1. 4-2-6 breathing with glowing orb (3 cycles ≈ 36s)
 *  2. "Name 3 objects you can see" text prompt (15s)
 *  3. "Press feet into floor" hold timer (10s)
 *
 * Design: immersive dark bg, multi-ring glowing orb, large typography,
 *         breath-synced motion, no scroll.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import type { GroundingModeProps } from '@/types/grounding';

type Step = 'breathe' | 'anchor' | 'ground';

const BREATH = { inhale: 4000, hold: 2000, exhale: 6000 };
const BREATH_CYCLES = 3;
const ANCHOR_DURATION = 15_000;
const GROUND_DURATION = 10_000;
const TOTAL_DURATION = BREATH_CYCLES * (BREATH.inhale + BREATH.hold + BREATH.exhale) + ANCHOR_DURATION + GROUND_DURATION;

const STEP_LABELS: Record<Step, string> = {
  breathe: 'Step 1 of 3 · Breathing',
  anchor: 'Step 2 of 3 · Visual Anchor',
  ground: 'Step 3 of 3 · Grounding',
};

export function QuickReset({ onComplete, onExit }: GroundingModeProps) {
  const colors = useColors();
  const [step, setStep] = useState<Step>('breathe');
  const [breathPhase, setBreathPhase] = useState<'in' | 'hold' | 'out'>('in');
  const [breathCycle, setBreathCycle] = useState(0);
  const [countdown, setCountdown] = useState(0);

  // Orb animations
  const orbScale = useRef(new Animated.Value(1)).current;
  const orbOpacity = useRef(new Animated.Value(0.5)).current;
  const ringPulse = useRef(new Animated.Value(1)).current;
  const textFade = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const startTime = useRef(Date.now());

  // Ambient ring pulse (continuous)
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(ringPulse, { toValue: 1.08, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(ringPulse, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
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

  // Breathing animation
  const runBreathCycle = useCallback(
    (cycle: number) => {
      if (cycle >= BREATH_CYCLES) {
        fadeToStep('anchor');
        return;
      }
      setBreathCycle(cycle);

      setBreathPhase('in');
      Animated.parallel([
        Animated.timing(orbScale, { toValue: 1.35, duration: BREATH.inhale, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.timing(orbOpacity, { toValue: 0.9, duration: BREATH.inhale, useNativeDriver: true }),
      ]).start(() => {
        setBreathPhase('hold');
        setTimeout(() => {
          setBreathPhase('out');
          Animated.parallel([
            Animated.timing(orbScale, { toValue: 1, duration: BREATH.exhale, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
            Animated.timing(orbOpacity, { toValue: 0.5, duration: BREATH.exhale, useNativeDriver: true }),
          ]).start(() => runBreathCycle(cycle + 1));
        }, BREATH.hold);
      });
    },
    [orbScale, orbOpacity],
  );

  useEffect(() => { runBreathCycle(0); }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  const phaseLabel = breathPhase === 'in' ? 'Breathe in' : breathPhase === 'hold' ? 'Hold' : 'Breathe out';
  const phaseTiming = breathPhase === 'in' ? '4s' : breathPhase === 'hold' ? '2s' : '6s';

  return (
    <View style={styles.container}>
      {/* Progress */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]} />
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
              <Animated.View style={[styles.orbRing3, { transform: [{ scale: Animated.multiply(orbScale, ringPulse) }], opacity: Animated.multiply(orbOpacity, new Animated.Value(0.12)) }]} />
              <Animated.View style={[styles.orbRing2, { transform: [{ scale: orbScale }], opacity: Animated.multiply(orbOpacity, new Animated.Value(0.25)) }]} />
              <Animated.View style={[styles.orbCore, { transform: [{ scale: orbScale }], opacity: orbOpacity }]} />
            </View>

            <Text style={styles.phaseText}>{phaseLabel}</Text>
            <Text style={styles.phaseTiming}>{phaseTiming}</Text>
            <Text style={styles.counterText}>Breath {breathCycle + 1} of {BREATH_CYCLES}</Text>
          </>
        )}

        {step === 'anchor' && (
          <>
            <View style={styles.iconGlow}>
              <Ionicons name="eye-outline" size={44} color={colors.accentCalm} />
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
              <Ionicons name="footsteps-outline" size={44} color={colors.accentCalm} />
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
    progressFill: { height: 3, backgroundColor: colors.primary, borderRadius: 2 },

    /* ── Top bar ──────────────────────────────────────── */
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingTop: Spacing['4xl'], zIndex: 10 },
    stepLabel: { fontSize: Typography.fontSize.xs, color: colors.textMuted, fontFamily: Typography.fontFamily.primary, letterSpacing: 0.5 },
    closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: colors.surface },

    /* ── Center ───────────────────────────────────────── */
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },

    /* ── Glowing orb ──────────────────────────────────── */
    orbContainer: { width: 260, height: 260, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing['3xl'] },
    orbRing3: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: colors.accentCalm },
    orbRing2: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: colors.accentCalm },
    orbCore: { width: 140, height: 140, borderRadius: 70, backgroundColor: colors.accentCalm },

    /* ── Breath text ──────────────────────────────────── */
    phaseText: { fontSize: Typography.fontSize['3xl'], fontWeight: Typography.fontWeight.bold, color: colors.textPrimary, fontFamily: Typography.fontFamily.heading, marginBottom: Spacing.xs },
    phaseTiming: { fontSize: Typography.fontSize.base, color: colors.textSecondary, fontFamily: Typography.fontFamily.primary, marginBottom: Spacing.lg },
    counterText: { fontSize: Typography.fontSize.sm, color: colors.textMuted, fontFamily: Typography.fontFamily.primary },

    /* ── Prompt screens ───────────────────────────────── */
    iconGlow: {
      width: 88, height: 88, borderRadius: 44,
      backgroundColor: colors.accentCalm + '18',
      borderWidth: 1.5, borderColor: colors.accentCalm + '30',
      alignItems: 'center', justifyContent: 'center',
      marginBottom: Spacing['2xl'],
    },
    promptText: {
      fontSize: 28, fontWeight: Typography.fontWeight.bold, color: colors.textPrimary,
      fontFamily: Typography.fontFamily.heading, textAlign: 'center',
      lineHeight: 40, marginBottom: Spacing.md,
    },
    promptHint: { fontSize: Typography.fontSize.base, color: colors.textSecondary, fontFamily: Typography.fontFamily.primary, textAlign: 'center', marginBottom: Spacing['3xl'] },

    /* ── Timer circle ─────────────────────────────────── */
    timerCircle: {
      width: 72, height: 72, borderRadius: 36,
      borderWidth: 2.5, borderColor: colors.primary + '50',
      alignItems: 'center', justifyContent: 'center',
    },
    timerNumber: { fontSize: 28, fontWeight: Typography.fontWeight.bold, color: colors.primary, fontFamily: Typography.fontFamily.heading },
  });
