/**
 * Pre-Meeting Reset — Mode 4 (2-3 min)
 *
 * Steps:
 *  1. Breath downshift — 3 breaths (4-2-6) with glowing orb
 *  2. Goal framing — "What is your goal?"
 *  3. Tone priming — tag selection
 *  4. Posture cue + anchor sentence
 *
 * Design: clean professional interface, glowing orb, elevated cards,
 *         step progress, dark bg.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import { PRE_MEETING_STEPS } from '@/data/grounding-content';
import type { GroundingModeProps } from '@/types/grounding';

type Step = 'breathe' | 'goal' | 'tone' | 'anchor';

const BREATH = { inhale: 4000, hold: 2000, exhale: 6000 };
const BREATH_CYCLES = 3;
const ANCHOR_HOLD = 8000;
const TONE_OPTIONS = PRE_MEETING_STEPS[2].options;

const STEP_LABELS: Record<Step, string> = {
  breathe: 'Step 1 of 4 · Breath Downshift',
  goal: 'Step 2 of 4 · Goal Framing',
  tone: 'Step 3 of 4 · Tone Priming',
  anchor: 'Step 4 of 4 · Anchor',
};

const STEP_ORDER: Step[] = ['breathe', 'goal', 'tone', 'anchor'];

export function PreMeeting({ onComplete, onExit }: GroundingModeProps) {
  const colors = useColors();
  const [step, setStep] = useState<Step>('breathe');
  const [breathPhase, setBreathPhase] = useState<'in' | 'hold' | 'out'>('in');
  const [breathCycle, setBreathCycle] = useState(0);
  const [goalText, setGoalText] = useState('');
  const [selectedTone, setSelectedTone] = useState<string | null>(null);
  const [anchorCountdown, setAnchorCountdown] = useState(0);

  const textFade = useRef(new Animated.Value(1)).current;
  const orbScale = useRef(new Animated.Value(1)).current;
  const orbOpacity = useRef(new Animated.Value(0.5)).current;
  const ringPulse = useRef(new Animated.Value(1)).current;

  const currentStepIdx = STEP_ORDER.indexOf(step);

  // Ambient ring pulse
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(ringPulse, { toValue: 1.06, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(ringPulse, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [ringPulse]);

  const fadeToStep = useCallback(
    (next: Step) => {
      Animated.timing(textFade, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
        setStep(next);
        textFade.setValue(0);
        Animated.timing(textFade, { toValue: 1, duration: 350, useNativeDriver: true }).start();
      });
    },
    [textFade],
  );

  // Breathing
  const runBreathCycle = useCallback(
    (cycle: number) => {
      if (cycle >= BREATH_CYCLES) { fadeToStep('goal'); return; }
      setBreathCycle(cycle);
      setBreathPhase('in');
      Animated.parallel([
        Animated.timing(orbScale, { toValue: 1.35, duration: BREATH.inhale, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.timing(orbOpacity, { toValue: 0.85, duration: BREATH.inhale, useNativeDriver: true }),
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
    [fadeToStep, orbScale, orbOpacity],
  );

  useEffect(() => { runBreathCycle(0); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Anchor countdown
  useEffect(() => {
    if (step !== 'anchor') return;
    setAnchorCountdown(Math.ceil(ANCHOR_HOLD / 1000));
    const iv = setInterval(() => {
      setAnchorCountdown((c) => {
        if (c <= 1) { clearInterval(iv); onComplete(100); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [step, onComplete]);

  const styles = createStyles(colors);
  const phaseLabel = breathPhase === 'in' ? 'Breathe in' : breathPhase === 'hold' ? 'Hold' : 'Breathe out';

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.stepLabel}>{STEP_LABELS[step]}</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onExit} hitSlop={12}>
          <Ionicons name="close" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Progress segments */}
      <View style={styles.progressRow}>
        {STEP_ORDER.map((s, i) => (
          <View key={s} style={[styles.progressSeg, i <= currentStepIdx && { backgroundColor: colors.primary }]} />
        ))}
      </View>

      <Animated.View style={[styles.center, { opacity: textFade }]}>
        {/* ── BREATHE ─────────────────────────────────── */}
        {step === 'breathe' && (
          <>
            <View style={styles.orbContainer}>
              <Animated.View style={[styles.orbRing3, { transform: [{ scale: Animated.multiply(orbScale, ringPulse) }], opacity: Animated.multiply(orbOpacity, new Animated.Value(0.12)) }]} />
              <Animated.View style={[styles.orbRing2, { transform: [{ scale: orbScale }], opacity: Animated.multiply(orbOpacity, new Animated.Value(0.25)) }]} />
              <Animated.View style={[styles.orbCore, { transform: [{ scale: orbScale }], opacity: orbOpacity }]} />
            </View>
            <Text style={styles.heading}>{phaseLabel}</Text>
            <Text style={styles.counterText}>Breath {breathCycle + 1} of {BREATH_CYCLES}</Text>
          </>
        )}

        {/* ── GOAL ────────────────────────────────────── */}
        {step === 'goal' && (
          <>
            <View style={styles.iconGlow}>
              <Ionicons name="flag-outline" size={36} color={colors.primary} />
            </View>
            <Text style={styles.heading}>What's your goal{'\n'}for this?</Text>
            <View style={styles.inputCard}>
              <TextInput
                value={goalText}
                onChangeText={setGoalText}
                placeholder="e.g. Stay calm and listen"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                multiline
                textAlignVertical="top"
              />
            </View>
            <TouchableOpacity
              style={[styles.primaryBtn, !goalText.trim() && { opacity: 0.35 }]}
              onPress={() => goalText.trim() && fadeToStep('tone')}
              activeOpacity={0.8}
              disabled={!goalText.trim()}
            >
              <Text style={styles.primaryBtnText}>Next</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />
            </TouchableOpacity>
          </>
        )}

        {/* ── TONE ────────────────────────────────────── */}
        {step === 'tone' && (
          <>
            <View style={styles.iconGlow}>
              <Ionicons name="mic-outline" size={36} color={colors.primary} />
            </View>
            <Text style={styles.heading}>How do you want{'\n'}to come across?</Text>
            <View style={styles.toneWrap}>
              {TONE_OPTIONS.map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setSelectedTone(selectedTone === t ? null : t)}
                  style={[styles.toneTag, selectedTone === t && styles.toneTagActive]}
                >
                  <Text style={[styles.toneTagText, selectedTone === t && styles.toneTagTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.primaryBtn, !selectedTone && { opacity: 0.35 }]}
              onPress={() => selectedTone && fadeToStep('anchor')}
              activeOpacity={0.8}
              disabled={!selectedTone}
            >
              <Text style={styles.primaryBtnText}>Next</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />
            </TouchableOpacity>
          </>
        )}

        {/* ── ANCHOR ──────────────────────────────────── */}
        {step === 'anchor' && (
          <>
            <View style={styles.iconGlow}>
              <Ionicons name="body-outline" size={36} color={colors.primary} />
            </View>
            <Text style={styles.anchorInstruction}>Sit tall. Shoulders back.{'\n'}Feet flat on the floor.</Text>
            <View style={styles.anchorCard}>
              <Text style={styles.anchorQuote}>"</Text>
              <Text style={styles.anchorSentence}>I am prepared and present.</Text>
              <Text style={[styles.anchorQuote, { textAlign: 'right' }]}>"</Text>
            </View>
            <View style={[styles.timerCircle, { borderColor: colors.primary + '50' }]}>
              <Text style={[styles.timerNumber, { color: colors.primary }]}>{anchorCountdown}</Text>
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

    /* ── Top ───────────────────────────────────────────── */
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingTop: Spacing['4xl'] },
    stepLabel: { fontSize: Typography.fontSize.xs, color: colors.textMuted, fontFamily: Typography.fontFamily.primary, letterSpacing: 0.5 },
    closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: colors.surface },

    /* ── Progress ─────────────────────────────────────── */
    progressRow: { flexDirection: 'row', gap: 4, paddingHorizontal: Spacing.xl, marginTop: Spacing.md },
    progressSeg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.surface },

    /* ── Center ───────────────────────────────────────── */
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },

    /* ── Orb ───────────────────────────────────────────── */
    orbContainer: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing['3xl'] },
    orbRing3: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: colors.accentCalm },
    orbRing2: { position: 'absolute', width: 170, height: 170, borderRadius: 85, backgroundColor: colors.accentCalm },
    orbCore: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.accentCalm },

    /* ── Typography ────────────────────────────────────── */
    heading: { fontSize: 28, fontWeight: Typography.fontWeight.bold, color: colors.textPrimary, fontFamily: Typography.fontFamily.heading, textAlign: 'center', lineHeight: 38, marginBottom: Spacing.lg },
    counterText: { fontSize: Typography.fontSize.sm, color: colors.textMuted, fontFamily: Typography.fontFamily.primary },

    /* ── Icon glow ─────────────────────────────────────── */
    iconGlow: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary + '15', borderWidth: 1.5, borderColor: colors.primary + '30', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing['2xl'] },

    /* ── Goal input ───────────────────────────────────── */
    inputCard: { width: '100%', backgroundColor: colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: colors.borderLight, marginBottom: Spacing.xl, overflow: 'hidden' },
    input: { padding: Spacing.lg, fontSize: Typography.fontSize.base, color: colors.textPrimary, fontFamily: Typography.fontFamily.primary, minHeight: 88 },

    /* ── Tone tags ────────────────────────────────────── */
    toneWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm, marginBottom: Spacing['2xl'] },
    toneTag: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm + 2, borderRadius: Radius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
    toneTagActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    toneTagText: { fontSize: Typography.fontSize.sm, color: colors.textPrimary, fontFamily: Typography.fontFamily.primary, fontWeight: Typography.fontWeight.medium },
    toneTagTextActive: { color: colors.primaryForeground },

    /* ── Anchor ────────────────────────────────────────── */
    anchorInstruction: { fontSize: 24, fontWeight: Typography.fontWeight.semibold, color: colors.textPrimary, fontFamily: Typography.fontFamily.heading, textAlign: 'center', lineHeight: 34, marginBottom: Spacing['2xl'] },
    anchorCard: { backgroundColor: colors.surface, borderRadius: Radius['2xl'], paddingHorizontal: Spacing['2xl'], paddingVertical: Spacing.xl, borderWidth: 1.5, borderColor: colors.primary + '25', marginBottom: Spacing['2xl'], width: '100%' },
    anchorQuote: { fontSize: 36, color: colors.primary + '40', fontFamily: Typography.fontFamily.heading, lineHeight: 36 },
    anchorSentence: { fontSize: 22, fontWeight: Typography.fontWeight.medium, color: colors.primary, fontFamily: Typography.fontFamily.heading, textAlign: 'center', fontStyle: 'italic', paddingVertical: Spacing.sm },

    /* ── Timer circle ──────────────────────────────────── */
    timerCircle: { width: 64, height: 64, borderRadius: 32, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
    timerNumber: { fontSize: 24, fontWeight: Typography.fontWeight.bold, fontFamily: Typography.fontFamily.heading },

    /* ── Primary button ────────────────────────────────── */
    primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: colors.primary, borderRadius: Radius.lg, paddingVertical: Spacing.md, paddingHorizontal: Spacing['2xl'] },
    primaryBtnText: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: colors.primaryForeground, fontFamily: Typography.fontFamily.primary },
  });
