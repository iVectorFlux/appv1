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
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import { BOX_BREATHING_STEPS } from '@/data/grounding-content';
import type { GroundingModeProps } from '@/types/grounding';

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
      Animated.timing(textFade, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setStep(next);
        textFade.setValue(0);
        Animated.timing(textFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
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
          useNativeDriver: true,
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

      <Animated.View style={[styles.center, { opacity: textFade }]}>
        {step === 'box_breathe' && (
          <>
            <View style={styles.boxWrap}>
              <View style={styles.boxOutline} />
              <Animated.View
                style={[
                  styles.boxTrace,
                  {
                    transform: [{
                      rotate: traceProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [`${phaseOrder * 90}deg`, `${phaseOrder * 90 + 90}deg`],
                      }),
                    }],
                  },
                ]}
              >
                <View style={[styles.boxTraceSegment, { backgroundColor: colors.primary }]} />
              </Animated.View>
            </View>
            <Text style={styles.phaseMain}>{phaseCopy.main}</Text>
            <Text style={styles.phaseSub}>{phaseCopy.sub}</Text>
            <Text style={styles.counterText}>{boxCycle + 1} of {BOX_CYCLES}</Text>
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

    /* ── Box breathing trace ───────────────────────────── */
    boxWrap: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing['3xl'] },
    boxOutline: { position: 'absolute', width: 140, height: 140, borderWidth: 2, borderColor: colors.primary + '50', borderRadius: Radius.md },
    boxTrace: { position: 'absolute', width: 140, height: 140, alignItems: 'center', justifyContent: 'flex-start' },
    boxTraceSegment: { width: 12, height: 12, borderRadius: 6, marginTop: -6 },
    phaseMain: { fontSize: 26, fontWeight: Typography.fontWeight.bold, color: colors.textPrimary, fontFamily: Typography.fontFamily.heading, textAlign: 'center', marginBottom: Spacing.xs },
    phaseSub: { fontSize: Typography.fontSize.sm, color: colors.textSecondary, fontFamily: Typography.fontFamily.primary, textAlign: 'center', marginBottom: Spacing.lg },

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
