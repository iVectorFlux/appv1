/**
 * Panic Interrupt — Mode 3 (4-5 min)
 *
 * Steps:
 *  1. Box breathing 4-4-4-4 (4 cycles)
 *  2. Identity anchor — name / date / location
 *  3. Progressive muscle tension release (clench + release × 3)
 *
 * Design: directive tone, firmer/bolder text, breath grid animation,
 *         dark bg, no scroll.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import { PANIC_INTERRUPT_STEPS } from '@/data/grounding-content';
import type { GroundingModeProps } from '@/types/grounding';

type Step = 'box_breathe' | 'identity' | 'release';

const BOX = { side: 4000 }; // 4s each side
const BOX_CYCLES = 4;
const IDENTITY_PROMPTS = PANIC_INTERRUPT_STEPS[1].prompts;
const RELEASE_CYCLES = 3;
const RELEASE_HOLD = 5000; // 5s clench
const RELEASE_REST = 5000; // 5s release

export function PanicInterrupt({ onComplete, onExit }: GroundingModeProps) {
  const colors = useColors();
  const [step, setStep] = useState<Step>('box_breathe');
  const [boxPhase, setBoxPhase] = useState<'in' | 'hold' | 'out' | 'holdEmpty'>('in');
  const [boxCycle, setBoxCycle] = useState(0);
  const [identityIdx, setIdentityIdx] = useState(0);
  const [releaseCycle, setReleaseCycle] = useState(0);
  const [releasePhase, setReleasePhase] = useState<'clench' | 'release'>('clench');
  const [countdown, setCountdown] = useState(0);

  const textFade = useRef(new Animated.Value(1)).current;
  const squareProgress = useRef(new Animated.Value(0)).current; // 0→4 for each side
  const startTime = useRef(Date.now());

  // ── Transition helper ─────────────────────────────────────────
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

  // ── Box breathing ─────────────────────────────────────────────
  const runBoxCycle = useCallback(
    (cycle: number) => {
      if (cycle >= BOX_CYCLES) {
        fadeToStep('identity');
        return;
      }
      setBoxCycle(cycle);

      const phases: Array<'in' | 'hold' | 'out' | 'holdEmpty'> = ['in', 'hold', 'out', 'holdEmpty'];
      let phaseIdx = 0;

      const nextPhase = () => {
        if (phaseIdx >= phases.length) {
          runBoxCycle(cycle + 1);
          return;
        }
        setBoxPhase(phases[phaseIdx]);
        squareProgress.setValue(phaseIdx);
        Animated.timing(squareProgress, {
          toValue: phaseIdx + 1,
          duration: BOX.side,
          easing: Easing.linear,
          useNativeDriver: false,
        }).start(() => {
          phaseIdx++;
          nextPhase();
        });
      };

      nextPhase();
    },
    [fadeToStep, squareProgress],
  );

  useEffect(() => {
    runBoxCycle(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Identity anchor — advance on tap ──────────────────────────
  const advanceIdentity = useCallback(() => {
    const nextIdx = identityIdx + 1;
    if (nextIdx >= IDENTITY_PROMPTS.length) {
      fadeToStep('release');
      return;
    }
    Animated.timing(textFade, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setIdentityIdx(nextIdx);
      textFade.setValue(0);
      Animated.timing(textFade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    });
  }, [identityIdx, fadeToStep, textFade]);

  // ── Tension release cycles ────────────────────────────────────
  const runReleaseCycle = useCallback(
    (cycle: number) => {
      if (cycle >= RELEASE_CYCLES) {
        onComplete(100);
        return;
      }
      setReleaseCycle(cycle);
      setReleasePhase('clench');
      setCountdown(Math.ceil(RELEASE_HOLD / 1000));

      let secs = Math.ceil(RELEASE_HOLD / 1000);
      const clenchIv = setInterval(() => {
        secs--;
        setCountdown(secs);
        if (secs <= 0) {
          clearInterval(clenchIv);
          // Release phase
          setReleasePhase('release');
          setCountdown(Math.ceil(RELEASE_REST / 1000));
          let rsecs = Math.ceil(RELEASE_REST / 1000);
          const releaseIv = setInterval(() => {
            rsecs--;
            setCountdown(rsecs);
            if (rsecs <= 0) {
              clearInterval(releaseIv);
              runReleaseCycle(cycle + 1);
            }
          }, 1000);
        }
      }, 1000);
    },
    [onComplete],
  );

  useEffect(() => {
    if (step === 'release') {
      runReleaseCycle(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const styles = createStyles(colors);

  const boxLabel =
    boxPhase === 'in' ? 'Breathe in' : boxPhase === 'hold' ? 'Hold' : boxPhase === 'out' ? 'Breathe out' : 'Hold empty';

  return (
    <View style={styles.container}>
      {/* Close */}
      <TouchableOpacity style={styles.closeBtn} onPress={onExit}>
        <Ionicons name="close" size={24} color={colors.textMuted} />
      </TouchableOpacity>

      <Animated.View style={[styles.center, { opacity: textFade }]}>
        {/* ── BOX BREATHING ───────────────────────────────────── */}
        {step === 'box_breathe' && (
          <>
            {/* Simple square outline with animated side */}
            <View style={styles.squareWrap}>
              <View style={[styles.square, { borderColor: colors.primary + '40' }]} />
              {/* animated fill overlay left → top → right → bottom */}
            </View>
            <Text style={styles.directiveText}>{boxLabel}</Text>
            <Text style={styles.counterText}>Cycle {boxCycle + 1} of {BOX_CYCLES}</Text>
          </>
        )}

        {/* ── IDENTITY ANCHOR ─────────────────────────────────── */}
        {step === 'identity' && (
          <>
            <Ionicons name="person-outline" size={40} color={colors.primary} style={{ marginBottom: Spacing.xl }} />
            <Text style={styles.directiveText}>{IDENTITY_PROMPTS[identityIdx]}</Text>
            <Text style={styles.hint}>Say it out loud, then tap to continue</Text>
            <TouchableOpacity style={styles.tapBtn} onPress={advanceIdentity} activeOpacity={0.7}>
              <Text style={styles.tapBtnText}>
                {identityIdx < IDENTITY_PROMPTS.length - 1 ? 'Next' : 'Continue'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── TENSION RELEASE ─────────────────────────────────── */}
        {step === 'release' && (
          <>
            <Ionicons
              name={releasePhase === 'clench' ? 'hand-left' : 'hand-left-outline'}
              size={48}
              color={releasePhase === 'clench' ? colors.warning : colors.success}
              style={{ marginBottom: Spacing.xl }}
            />
            <Text style={styles.directiveText}>
              {releasePhase === 'clench' ? 'Clench your fists — tight' : 'Release. Let it go.'}
            </Text>
            <Text style={styles.bigTimer}>{countdown}</Text>
            <Text style={styles.counterText}>
              Round {releaseCycle + 1} of {RELEASE_CYCLES}
            </Text>
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

    /* ── Box breathing visuals ──────────────────────────── */
    squareWrap: {
      width: 140,
      height: 140,
      marginBottom: Spacing['3xl'],
      alignItems: 'center',
      justifyContent: 'center',
    },
    square: {
      width: 120,
      height: 120,
      borderWidth: 3,
      borderRadius: Radius.sm,
    },

    /* ── Typography ─────────────────────────────────────── */
    directiveText: {
      fontSize: Typography.fontSize['2xl'],
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
      fontFamily: Typography.fontFamily.heading,
      textAlign: 'center',
      lineHeight: Typography.lineHeight.relaxed * Typography.fontSize['2xl'],
      marginBottom: Spacing.md,
    },
    counterText: {
      fontSize: Typography.fontSize.sm,
      color: colors.textMuted,
      fontFamily: Typography.fontFamily.primary,
      marginTop: Spacing.sm,
    },
    hint: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      fontFamily: Typography.fontFamily.primary,
      textAlign: 'center',
      marginBottom: Spacing.xl,
    },
    bigTimer: {
      fontSize: 56,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
      fontFamily: Typography.fontFamily.heading,
      marginVertical: Spacing.lg,
    },

    /* ── Buttons ────────────────────────────────────────── */
    tapBtn: {
      backgroundColor: colors.primary,
      borderRadius: Radius.lg,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing['3xl'],
    },
    tapBtnText: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.primaryForeground,
      fontFamily: Typography.fontFamily.primary,
    },
  });
