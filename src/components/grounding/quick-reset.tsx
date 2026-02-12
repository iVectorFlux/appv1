/**
 * Quick Reset — Mode 1 (60 seconds, auto-complete)
 *
 * Steps:
 *  1. 4-2-6 breathing with expanding orb (3 cycles ≈ 36s)
 *  2. "Name 3 objects you can see" text prompt (15s)
 *  3. "Press feet into floor" hold timer (10s)
 *
 * Design: dark neutral bg, expanding orb, minimal text, no scroll.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import type { GroundingModeProps } from '@/types/grounding';

type Step = 'breathe' | 'anchor' | 'ground';

const BREATH = { inhale: 4000, hold: 2000, exhale: 6000 }; // ms
const BREATH_CYCLES = 3;
const ANCHOR_DURATION = 15_000;
const GROUND_DURATION = 10_000;
const TOTAL_DURATION = BREATH_CYCLES * (BREATH.inhale + BREATH.hold + BREATH.exhale) + ANCHOR_DURATION + GROUND_DURATION;

export function QuickReset({ onComplete, onExit }: GroundingModeProps) {
  const colors = useColors();
  const [step, setStep] = useState<Step>('breathe');
  const [breathPhase, setBreathPhase] = useState<'in' | 'hold' | 'out'>('in');
  const [breathCycle, setBreathCycle] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const orbScale = useRef(new Animated.Value(1)).current;
  const orbOpacity = useRef(new Animated.Value(0.6)).current;
  const textFade = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const startTime = useRef(Date.now());

  // ── Progress bar ──────────────────────────────────────────────
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: 100,
      duration: TOTAL_DURATION,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  }, [progressAnim]);

  // ── Breathing animation ───────────────────────────────────────
  const runBreathCycle = useCallback(
    (cycle: number) => {
      if (cycle >= BREATH_CYCLES) {
        // Done breathing → next step
        fadeToStep('anchor');
        return;
      }
      setBreathCycle(cycle);

      // Inhale
      setBreathPhase('in');
      Animated.parallel([
        Animated.timing(orbScale, { toValue: 1.4, duration: BREATH.inhale, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.timing(orbOpacity, { toValue: 1, duration: BREATH.inhale, useNativeDriver: true }),
      ]).start(() => {
        // Hold
        setBreathPhase('hold');
        setTimeout(() => {
          // Exhale
          setBreathPhase('out');
          Animated.parallel([
            Animated.timing(orbScale, { toValue: 1, duration: BREATH.exhale, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
            Animated.timing(orbOpacity, { toValue: 0.6, duration: BREATH.exhale, useNativeDriver: true }),
          ]).start(() => {
            runBreathCycle(cycle + 1);
          });
        }, BREATH.hold);
      });
    },
    [orbScale, orbOpacity],
  );

  useEffect(() => {
    runBreathCycle(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Step transitions ──────────────────────────────────────────
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

  // ── Anchor countdown ──────────────────────────────────────────
  useEffect(() => {
    if (step !== 'anchor') return;
    setCountdown(Math.ceil(ANCHOR_DURATION / 1000));
    const iv = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(iv);
          fadeToStep('ground');
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [step, fadeToStep]);

  // ── Ground countdown ──────────────────────────────────────────
  useEffect(() => {
    if (step !== 'ground') return;
    setCountdown(Math.ceil(GROUND_DURATION / 1000));
    const iv = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(iv);
          const elapsed = Date.now() - startTime.current;
          onComplete(Math.min(100, Math.round((elapsed / TOTAL_DURATION) * 100)));
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [step, onComplete]);

  const styles = createStyles(colors);

  const phaseLabel =
    breathPhase === 'in' ? 'Breathe in' : breathPhase === 'hold' ? 'Hold' : 'Breathe out';

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      {/* Close */}
      <TouchableOpacity style={styles.closeBtn} onPress={onExit}>
        <Ionicons name="close" size={24} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Content */}
      <Animated.View style={[styles.center, { opacity: textFade }]}>
        {step === 'breathe' && (
          <>
            <Animated.View
              style={[
                styles.orb,
                { transform: [{ scale: orbScale }], opacity: orbOpacity },
              ]}
            />
            <Text style={styles.phaseText}>{phaseLabel}</Text>
            <Text style={styles.counterText}>
              Breath {breathCycle + 1} of {BREATH_CYCLES}
            </Text>
          </>
        )}

        {step === 'anchor' && (
          <>
            <Ionicons name="eye-outline" size={40} color={colors.accentCalm} style={{ marginBottom: Spacing.xl }} />
            <Text style={styles.promptText}>Name 3 objects{'\n'}you can see right now</Text>
            <Text style={styles.counterText}>{countdown}s</Text>
          </>
        )}

        {step === 'ground' && (
          <>
            <Ionicons name="footsteps-outline" size={40} color={colors.accentCalm} style={{ marginBottom: Spacing.xl }} />
            <Text style={styles.promptText}>Press your feet{'\n'}firmly into the floor</Text>
            <Text style={styles.subText}>Hold it. Feel the ground.</Text>
            <Text style={styles.counterText}>{countdown}s</Text>
          </>
        )}
      </Animated.View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    progressTrack: {
      height: 3,
      backgroundColor: colors.surface,
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
    },
    progressFill: {
      height: 3,
      backgroundColor: colors.primary,
    },
    closeBtn: {
      position: 'absolute',
      top: Spacing['3xl'],
      right: Spacing.xl,
      zIndex: 10,
      padding: Spacing.sm,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.xl,
    },
    orb: {
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: colors.accentCalm,
      marginBottom: Spacing['3xl'],
    },
    phaseText: {
      fontSize: Typography.fontSize['2xl'],
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      fontFamily: Typography.fontFamily.heading,
      marginBottom: Spacing.md,
    },
    promptText: {
      fontSize: Typography.fontSize['2xl'],
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      fontFamily: Typography.fontFamily.heading,
      textAlign: 'center',
      lineHeight: Typography.lineHeight.relaxed * Typography.fontSize['2xl'],
      marginBottom: Spacing.lg,
    },
    subText: {
      fontSize: Typography.fontSize.base,
      color: colors.textSecondary,
      fontFamily: Typography.fontFamily.primary,
      textAlign: 'center',
      marginBottom: Spacing.lg,
    },
    counterText: {
      fontSize: Typography.fontSize.sm,
      color: colors.textMuted,
      fontFamily: Typography.fontFamily.primary,
    },
  });
