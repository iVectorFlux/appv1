/**
 * Panic Interrupt — Mode 3 (4-5 min)
 *
 * Steps:
 *  1. Box breathing 4-4-4-4 (4 cycles) — animated square with glowing corners
 *  2. Identity anchor — name / date / location
 *  3. Progressive muscle tension release (clench + release × 3)
 *
 * Design: directive tone, bold text, glowing square, dark bg.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import { PANIC_INTERRUPT_STEPS } from '@/data/grounding-content';
import type { GroundingModeProps } from '@/types/grounding';

type Step = 'box_breathe' | 'identity' | 'release';

const BOX = { side: 4000 };
const BOX_CYCLES = 4;
const IDENTITY_PROMPTS = PANIC_INTERRUPT_STEPS[1].prompts;
const RELEASE_CYCLES = 3;
const RELEASE_HOLD = 5000;
const RELEASE_REST = 5000;

const STEP_LABELS: Record<Step, string> = {
  box_breathe: 'Step 1 of 3 · Box Breathing',
  identity: 'Step 2 of 3 · Identity Anchor',
  release: 'Step 3 of 3 · Tension Release',
};

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
  const squareGlow = useRef(new Animated.Value(0.3)).current;
  const squareScale = useRef(new Animated.Value(1)).current;

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

  // Box breathing
  const runBoxCycle = useCallback(
    (cycle: number) => {
      if (cycle >= BOX_CYCLES) { fadeToStep('identity'); return; }
      setBoxCycle(cycle);

      const phases: Array<'in' | 'hold' | 'out' | 'holdEmpty'> = ['in', 'hold', 'out', 'holdEmpty'];
      let phaseIdx = 0;

      const glowTarget = (p: number) => [0.6, 0.9, 0.4, 0.2][p];
      const scaleTarget = (p: number) => [1.06, 1.06, 0.98, 0.98][p];

      const nextPhase = () => {
        if (phaseIdx >= phases.length) { runBoxCycle(cycle + 1); return; }
        setBoxPhase(phases[phaseIdx]);
        Animated.parallel([
          Animated.timing(squareGlow, { toValue: glowTarget(phaseIdx), duration: BOX.side, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(squareScale, { toValue: scaleTarget(phaseIdx), duration: BOX.side, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        ]).start(() => { phaseIdx++; nextPhase(); });
      };
      nextPhase();
    },
    [fadeToStep, squareGlow, squareScale],
  );

  useEffect(() => { runBoxCycle(0); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Identity anchor
  const advanceIdentity = useCallback(() => {
    const nextIdx = identityIdx + 1;
    if (nextIdx >= IDENTITY_PROMPTS.length) { fadeToStep('release'); return; }
    Animated.timing(textFade, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setIdentityIdx(nextIdx);
      textFade.setValue(0);
      Animated.timing(textFade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    });
  }, [identityIdx, fadeToStep, textFade]);

  // Tension release
  const runReleaseCycle = useCallback(
    (cycle: number) => {
      if (cycle >= RELEASE_CYCLES) { onComplete(100); return; }
      setReleaseCycle(cycle);
      setReleasePhase('clench');
      setCountdown(Math.ceil(RELEASE_HOLD / 1000));
      let secs = Math.ceil(RELEASE_HOLD / 1000);
      const clenchIv = setInterval(() => {
        secs--;
        setCountdown(secs);
        if (secs <= 0) {
          clearInterval(clenchIv);
          setReleasePhase('release');
          setCountdown(Math.ceil(RELEASE_REST / 1000));
          let rsecs = Math.ceil(RELEASE_REST / 1000);
          const releaseIv = setInterval(() => {
            rsecs--;
            setCountdown(rsecs);
            if (rsecs <= 0) { clearInterval(releaseIv); runReleaseCycle(cycle + 1); }
          }, 1000);
        }
      }, 1000);
    },
    [onComplete],
  );

  useEffect(() => { if (step === 'release') runReleaseCycle(0); }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const styles = createStyles(colors);
  const boxLabel = boxPhase === 'in' ? 'Breathe in' : boxPhase === 'hold' ? 'Hold' : boxPhase === 'out' ? 'Breathe out' : 'Hold empty';

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.stepLabel}>{STEP_LABELS[step]}</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onExit} hitSlop={12}>
          <Ionicons name="close" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.center, { opacity: textFade }]}>
        {/* BOX BREATHING */}
        {step === 'box_breathe' && (
          <>
            <View style={styles.squareContainer}>
              {/* Outer glow */}
              <Animated.View style={[styles.squareGlow, { opacity: Animated.multiply(squareGlow, new Animated.Value(0.3)), transform: [{ scale: squareScale }] }]} />
              {/* Main square */}
              <Animated.View style={[styles.square, { opacity: squareGlow, transform: [{ scale: squareScale }] }]}>
                {/* Corner dots */}
                {[styles.cornerTL, styles.cornerTR, styles.cornerBL, styles.cornerBR].map((pos, i) => (
                  <Animated.View key={i} style={[styles.cornerDot, pos, { opacity: squareGlow }]} />
                ))}
              </Animated.View>
            </View>
            <Text style={styles.directiveText}>{boxLabel}</Text>
            <Text style={styles.directiveSub}>4 seconds each side</Text>
            <Text style={styles.counterText}>Cycle {boxCycle + 1} of {BOX_CYCLES}</Text>
          </>
        )}

        {/* IDENTITY ANCHOR */}
        {step === 'identity' && (
          <>
            <View style={styles.iconGlow}>
              <Ionicons name="person-outline" size={40} color={colors.primary} />
            </View>
            <Text style={styles.directiveText}>{IDENTITY_PROMPTS[identityIdx]}</Text>
            <Text style={styles.directiveSub}>Say it out loud</Text>
            <TouchableOpacity style={styles.actionBtn} onPress={advanceIdentity} activeOpacity={0.8}>
              <Text style={styles.actionBtnText}>{identityIdx < IDENTITY_PROMPTS.length - 1 ? 'Next' : 'Continue'}</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />
            </TouchableOpacity>
          </>
        )}

        {/* TENSION RELEASE */}
        {step === 'release' && (
          <>
            <View style={[styles.releaseCircle, { borderColor: releasePhase === 'clench' ? colors.warning + '60' : colors.success + '60', backgroundColor: releasePhase === 'clench' ? colors.warning + '10' : colors.success + '10' }]}>
              <Ionicons name={releasePhase === 'clench' ? 'hand-left' : 'hand-left-outline'} size={48} color={releasePhase === 'clench' ? colors.warning : colors.success} />
            </View>
            <Text style={styles.directiveText}>
              {releasePhase === 'clench' ? 'Clench your fists — tight' : 'Release. Let it go.'}
            </Text>
            <View style={[styles.timerCircle, { borderColor: releasePhase === 'clench' ? colors.warning + '50' : colors.success + '50' }]}>
              <Text style={[styles.timerNumber, { color: releasePhase === 'clench' ? colors.warning : colors.success }]}>{countdown}</Text>
            </View>
            <Text style={styles.counterText}>Round {releaseCycle + 1} of {RELEASE_CYCLES}</Text>
          </>
        )}
      </Animated.View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingTop: Spacing['4xl'] },
    stepLabel: { fontSize: Typography.fontSize.xs, color: colors.textMuted, fontFamily: Typography.fontFamily.primary, letterSpacing: 0.5 },
    closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: colors.surface },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },

    /* ── Square ────────────────────────────────────────── */
    squareContainer: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing['3xl'] },
    squareGlow: { position: 'absolute', width: 180, height: 180, borderRadius: Radius.lg, backgroundColor: colors.primary },
    square: { width: 140, height: 140, borderWidth: 2.5, borderColor: colors.primary, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
    cornerDot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
    cornerTL: { top: -5, left: -5 },
    cornerTR: { top: -5, right: -5 },
    cornerBL: { bottom: -5, left: -5 },
    cornerBR: { bottom: -5, right: -5 },

    /* ── Typography ────────────────────────────────────── */
    directiveText: { fontSize: 28, fontWeight: Typography.fontWeight.bold, color: colors.textPrimary, fontFamily: Typography.fontFamily.heading, textAlign: 'center', lineHeight: 38, marginBottom: Spacing.sm },
    directiveSub: { fontSize: Typography.fontSize.base, color: colors.textSecondary, fontFamily: Typography.fontFamily.primary, textAlign: 'center', marginBottom: Spacing.lg },
    counterText: { fontSize: Typography.fontSize.sm, color: colors.textMuted, fontFamily: Typography.fontFamily.primary, marginTop: Spacing.md },

    /* ── Icon glow ─────────────────────────────────────── */
    iconGlow: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.primary + '15', borderWidth: 1.5, borderColor: colors.primary + '30', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing['2xl'] },

    /* ── Release circle ────────────────────────────────── */
    releaseCircle: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing['2xl'] },

    /* ── Timer circle ──────────────────────────────────── */
    timerCircle: { width: 72, height: 72, borderRadius: 36, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md },
    timerNumber: { fontSize: 28, fontWeight: Typography.fontWeight.bold, fontFamily: Typography.fontFamily.heading },

    /* ── Action button ─────────────────────────────────── */
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: colors.primary, borderRadius: Radius.lg, paddingVertical: Spacing.md, paddingHorizontal: Spacing['2xl'], marginTop: Spacing.lg },
    actionBtnText: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: colors.primaryForeground, fontFamily: Typography.fontFamily.primary },
  });
