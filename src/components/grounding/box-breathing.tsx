/**
 * Box breathing — 4-5 min
 *
 * Steps:
 *  1. Box breathing 4-4-4-4 (4 cycles) — animated square with glowing corners
 *  2. Identity anchor — name / date / location
 *  3. Progressive muscle tension release (clench + release × 3)
 *
 * Design: directive tone, bold text, glowing square, dark bg.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import { BOX_BREATHING_STEPS } from '@/data/grounding-content';
import type { GroundingModeProps } from '@/types/grounding';

const useNativeDriver = Platform.OS !== 'web';

type Step = 'box_breathe' | 'identity' | 'release';

const BOX_SIDE_MS = 4000;
const BOX_CYCLES = 4;
const IDENTITY_PROMPTS = BOX_BREATHING_STEPS[1].prompts;
const RELEASE_CYCLES = 3;
const RELEASE_HOLD = 5000;
const RELEASE_REST = 5000;

const STEP_LABELS: Record<Step, string> = {
  box_breathe: 'Step 1 of 3 · Box breath',
  identity: 'Step 2 of 3 · Identity anchor',
  release: 'Step 3 of 3 · Tension release',
};

const PHASE_COPY: Record<'in' | 'hold' | 'out' | 'holdEmpty', { main: string; sub: string }> = {
  in: { main: 'Inhale', sub: 'Fill slowly' },
  hold: { main: 'Hold', sub: 'Keep it gentle' },
  out: { main: 'Exhale', sub: 'Let it go' },
  holdEmpty: { main: 'Hold', sub: 'Rest' },
};

export function BoxBreathing({ onComplete, onExit }: GroundingModeProps) {
  const colors = useColors();
  const [step, setStep] = useState<Step>('box_breathe');
  const [boxPhase, setBoxPhase] = useState<'in' | 'hold' | 'out' | 'holdEmpty'>('in');
  const [boxCycle, setBoxCycle] = useState(0);
  const [identityIdx, setIdentityIdx] = useState(0);
  const [releaseCycle, setReleaseCycle] = useState(0);
  const [releasePhase, setReleasePhase] = useState<'clench' | 'release'>('clench');
  const [countdown, setCountdown] = useState(0);

  const textFade = useRef(new Animated.Value(1)).current;
  const traceProgress = useRef(new Animated.Value(0)).current;

  const fadeToStep = useCallback(
    (next: Step) => {
      Animated.timing(textFade, { toValue: 0, duration: 300, useNativeDriver }).start(() => {
        setStep(next);
        textFade.setValue(0);
        Animated.timing(textFade, { toValue: 1, duration: 400, useNativeDriver }).start();
      });
    },
    [textFade],
  );

  const runBoxCycle = useCallback(
    (cycle: number) => {
      if (cycle >= BOX_CYCLES) { fadeToStep('identity'); return; }
      setBoxCycle(cycle);

      const phases: Array<'in' | 'hold' | 'out' | 'holdEmpty'> = ['in', 'hold', 'out', 'holdEmpty'];
      let phaseIdx = 0;

      const nextPhase = () => {
        if (phaseIdx >= phases.length) { runBoxCycle(cycle + 1); return; }
        setBoxPhase(phases[phaseIdx]);
        traceProgress.setValue(0);
        Animated.timing(traceProgress, {
          toValue: 1,
          duration: BOX_SIDE_MS,
          easing: Easing.linear,
          useNativeDriver,
        }).start(() => { phaseIdx++; nextPhase(); });
      };
      nextPhase();
    },
    [fadeToStep, traceProgress],
  );

  useEffect(() => { runBoxCycle(0); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Identity anchor
  const advanceIdentity = useCallback(() => {
    const nextIdx = identityIdx + 1;
    if (nextIdx >= IDENTITY_PROMPTS.length) { fadeToStep('release'); return; }
    Animated.timing(textFade, { toValue: 0, duration: 200, useNativeDriver }).start(() => {
      setIdentityIdx(nextIdx);
      textFade.setValue(0);
      Animated.timing(textFade, { toValue: 1, duration: 300, useNativeDriver }).start();
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
  const phaseCopy = PHASE_COPY[boxPhase];
  const phaseOrder = ['in', 'hold', 'out', 'holdEmpty'].indexOf(boxPhase);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.stepLabel}>{STEP_LABELS[step]}</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onExit} hitSlop={12}>
          <Ionicons name="close" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={[styles.center, { opacity: textFade }]}>
          {step === 'box_breathe' && (
            <>
              <View style={[styles.phaseCard, { borderColor: colors.primary + '40' }]}>
                <Text style={[styles.phaseMain, { color: colors.primary }]}>{phaseCopy.main}</Text>
                <Text style={styles.phaseSub}>{phaseCopy.sub}</Text>
              </View>
              <View style={styles.progressBarWrap}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    {
                      width: traceProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.phaseHint}>4 in · 4 hold · 4 out · 4 hold</Text>
              <Text style={styles.counterText}>Breath {boxCycle + 1} of {BOX_CYCLES}</Text>
            </>
          )}

          {step === 'identity' && (
            <>
              <View style={styles.iconGlow}>
                <Ionicons name="person-outline" size={44} color={colors.primary} />
              </View>
              <Text style={styles.directiveText}>{IDENTITY_PROMPTS[identityIdx]}</Text>
              <Text style={styles.directiveSub}>Say it out loud or in your head</Text>
              <TouchableOpacity style={styles.actionBtn} onPress={advanceIdentity} activeOpacity={0.8}>
                <Text style={styles.actionBtnText}>{identityIdx < IDENTITY_PROMPTS.length - 1 ? 'Next' : 'Continue'}</Text>
                <Ionicons name="arrow-forward" size={20} color={colors.primaryForeground} />
              </TouchableOpacity>
            </>
          )}

          {step === 'release' && (
            <>
              <View style={[styles.releaseCircle, { borderColor: releasePhase === 'clench' ? colors.warning + '60' : colors.success + '60', backgroundColor: releasePhase === 'clench' ? colors.warning + '12' : colors.success + '12' }]}>
                <Ionicons name={releasePhase === 'clench' ? 'hand-left' : 'hand-left-outline'} size={52} color={releasePhase === 'clench' ? colors.warning : colors.success} />
              </View>
              <Text style={styles.directiveText}>
                {releasePhase === 'clench' ? 'Clench your fists tight' : 'Release. Let it go.'}
              </Text>
              <Text style={styles.directiveSub}>
                {releasePhase === 'clench' ? 'Hold for 5 seconds' : 'Rest for 5 seconds'}
              </Text>
              <View style={[styles.timerCircle, { borderColor: releasePhase === 'clench' ? colors.warning + '50' : colors.success + '50' }]}>
                <Text style={[styles.timerNumber, { color: releasePhase === 'clench' ? colors.warning : colors.success }]}>{countdown}</Text>
              </View>
              <Text style={styles.counterText}>Round {releaseCycle + 1} of {RELEASE_CYCLES}</Text>
            </>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.xl,
      paddingBottom: Spacing.sm,
    },
    stepLabel: { fontSize: Typography.fontSize.sm, color: colors.textMuted, fontFamily: Typography.fontFamily.primary, fontWeight: Typography.fontWeight.medium },
    closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.full, backgroundColor: colors.surface },
    scrollContent: { flexGrow: 1, paddingBottom: Spacing['3xl'] },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, minHeight: 320 },

    phaseCard: {
      width: '100%',
      maxWidth: 280,
      paddingVertical: Spacing.xl,
      paddingHorizontal: Spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderRadius: Radius.xl,
      borderWidth: 2,
      marginBottom: Spacing.xl,
    },
    progressBarWrap: {
      width: '100%',
      maxWidth: 280,
      height: 8,
      backgroundColor: colors.border,
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: Spacing.md,
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 4,
    },
    phaseMain: {
      fontSize: Typography.fontSize['2xl'],
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      fontFamily: Typography.fontFamily.heading,
      textAlign: 'center',
      marginBottom: Spacing.xs,
    },
    phaseSub: { fontSize: Typography.fontSize.base, color: colors.textSecondary, fontFamily: Typography.fontFamily.primary, textAlign: 'center', marginBottom: Spacing.sm },
    phaseHint: { fontSize: Typography.fontSize.xs, color: colors.textMuted, fontFamily: Typography.fontFamily.primary, textAlign: 'center', marginTop: Spacing.xs },
    counterText: { fontSize: Typography.fontSize.sm, color: colors.textMuted, fontFamily: Typography.fontFamily.primary, marginTop: Spacing.md },

    directiveText: {
      fontSize: Typography.fontSize.xl,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      fontFamily: Typography.fontFamily.heading,
      textAlign: 'center',
      lineHeight: 32,
      marginBottom: Spacing.sm,
      paddingHorizontal: Spacing.lg,
    },
    directiveSub: { fontSize: Typography.fontSize.base, color: colors.textSecondary, fontFamily: Typography.fontFamily.primary, textAlign: 'center', marginBottom: Spacing.lg },
    iconGlow: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primary + '18',
      borderWidth: 1.5,
      borderColor: colors.primary + '35',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.lg,
    },
    releaseCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.lg,
    },
    timerCircle: { width: 72, height: 72, borderRadius: 36, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md },
    timerNumber: { fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold, fontFamily: Typography.fontFamily.heading },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      backgroundColor: colors.primary,
      borderRadius: Radius.md,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xl,
      marginTop: Spacing.lg,
    },
    actionBtnText: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: colors.primaryForeground, fontFamily: Typography.fontFamily.primary },
  });
