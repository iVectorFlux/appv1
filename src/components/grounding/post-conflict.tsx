/**
 * Post-Conflict Reset — Mode 5 (4-6 min)
 *
 * Steps:
 *  1. Label emotion — selection buttons with glow
 *  2. Locate in body — body area tags
 *  3. Breath release — 3 slow breaths with glowing orb
 *  4. Fact vs interpretation — two text prompts
 *
 * Design: slower pacing, longer transitions, glowing orb, elevated cards,
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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import { POST_CONFLICT_EMOTIONS, POST_CONFLICT_STEPS } from '@/data/grounding-content';
import type { GroundingModeProps } from '@/types/grounding';

type Step = 'label' | 'locate' | 'breathe' | 'reframe';

const BODY_LOCATIONS = POST_CONFLICT_STEPS[1].bodyPrompts;
const BREATH = { inhale: 4000, hold: 2000, exhale: 6000 };
const BREATH_CYCLES = 3;

const STEP_LABELS: Record<Step, string> = {
  label: 'Step 1 of 4 · Name It',
  locate: 'Step 2 of 4 · Locate It',
  breathe: 'Step 3 of 4 · Release',
  reframe: 'Step 4 of 4 · Reframe',
};

const STEP_ORDER: Step[] = ['label', 'locate', 'breathe', 'reframe'];

export function PostConflict({ onComplete, onExit }: GroundingModeProps) {
  const colors = useColors();
  const [step, setStep] = useState<Step>('label');
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [selectedBody, setSelectedBody] = useState<string | null>(null);
  const [breathPhase, setBreathPhase] = useState<'in' | 'hold' | 'out'>('in');
  const [breathCycle, setBreathCycle] = useState(0);
  const [factText, setFactText] = useState('');
  const [storyText, setStoryText] = useState('');

  const textFade = useRef(new Animated.Value(1)).current;
  const orbScale = useRef(new Animated.Value(1)).current;
  const orbOpacity = useRef(new Animated.Value(0.5)).current;
  const ringPulse = useRef(new Animated.Value(1)).current;

  const currentStepIdx = STEP_ORDER.indexOf(step);

  // Ambient pulse
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(ringPulse, { toValue: 1.06, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(ringPulse, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [ringPulse]);

  // Slower transitions for this mode
  const fadeToStep = useCallback(
    (next: Step) => {
      Animated.timing(textFade, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
        setStep(next);
        textFade.setValue(0);
        Animated.timing(textFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      });
    },
    [textFade],
  );

  // Breathing
  const runBreathCycle = useCallback(
    (cycle: number) => {
      if (cycle >= BREATH_CYCLES) { fadeToStep('reframe'); return; }
      setBreathCycle(cycle);
      setBreathPhase('in');
      Animated.parallel([
        Animated.timing(orbScale, { toValue: 1.3, duration: BREATH.inhale, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
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

  useEffect(() => { if (step === 'breathe') runBreathCycle(0); }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const styles = createStyles(colors);
  const phaseLabel = breathPhase === 'in' ? 'Breathe in deeply' : breathPhase === 'hold' ? 'Hold gently' : 'Let it all out';

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
          <View key={s} style={[styles.progressSeg, i <= currentStepIdx && { backgroundColor: colors.accentSoft }]} />
        ))}
      </View>

      <Animated.View style={[styles.center, { opacity: textFade }]}>

        {/* ── LABEL EMOTION ───────────────────────────── */}
        {step === 'label' && (
          <>
            <Text style={styles.heading}>What are you feeling{'\n'}right now?</Text>
            <Text style={styles.subheading}>Choose the closest match</Text>
            <View style={styles.tagWrap}>
              {POST_CONFLICT_EMOTIONS.map((e) => (
                <TouchableOpacity
                  key={e}
                  onPress={() => setSelectedEmotion(selectedEmotion === e ? null : e)}
                  style={[styles.tag, selectedEmotion === e && { backgroundColor: colors.accentSoft, borderColor: colors.accentSoft }]}
                >
                  <Text style={[styles.tagText, selectedEmotion === e && { color: colors.primaryForeground }]}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.primaryBtn, !selectedEmotion && { opacity: 0.35 }]}
              onPress={() => selectedEmotion && fadeToStep('locate')}
              activeOpacity={0.8}
              disabled={!selectedEmotion}
            >
              <Text style={styles.primaryBtnText}>Next</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />
            </TouchableOpacity>
          </>
        )}

        {/* ── LOCATE IN BODY ──────────────────────────── */}
        {step === 'locate' && (
          <>
            <View style={styles.iconGlow}>
              <Ionicons name="body-outline" size={40} color={colors.accentSoft} />
            </View>
            <Text style={styles.heading}>Where do you feel this{'\n'}in your body?</Text>
            <View style={styles.tagWrap}>
              {BODY_LOCATIONS.map((loc) => (
                <TouchableOpacity
                  key={loc}
                  onPress={() => setSelectedBody(selectedBody === loc ? null : loc)}
                  style={[styles.tag, selectedBody === loc && { backgroundColor: colors.accentSoft, borderColor: colors.accentSoft }]}
                >
                  <Text style={[styles.tagText, selectedBody === loc && { color: colors.primaryForeground }]}>{loc}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.primaryBtn, !selectedBody && { opacity: 0.35 }]}
              onPress={() => selectedBody && fadeToStep('breathe')}
              activeOpacity={0.8}
              disabled={!selectedBody}
            >
              <Text style={styles.primaryBtnText}>Next</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />
            </TouchableOpacity>
          </>
        )}

        {/* ── BREATH RELEASE ──────────────────────────── */}
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

        {/* ── FACT vs INTERPRETATION ──────────────────── */}
        {step === 'reframe' && (
          <ScrollView
            style={{ flex: 1, width: '100%' }}
            contentContainerStyle={{ alignItems: 'center', paddingBottom: Spacing['5xl'] }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.heading, { marginTop: Spacing.xl }]}>Separate fact from story</Text>
            <Text style={styles.subheading}>This helps you see clearly</Text>

            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>What actually happened?</Text>
              <TextInput
                value={factText}
                onChangeText={setFactText}
                placeholder="Just the facts — no judgment"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={[styles.inputCard, { marginTop: Spacing.md }]}>
              <Text style={styles.inputLabel}>What story am I telling myself?</Text>
              <TextInput
                value={storyText}
                onChangeText={setStoryText}
                placeholder="The interpretation, the assumptions"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                multiline
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, { marginTop: Spacing['2xl'] }]}
              onPress={() => onComplete(100)}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryBtnText}>Finish</Text>
              <Ionicons name="checkmark" size={18} color={colors.primaryForeground} />
            </TouchableOpacity>

            <Text style={styles.privacyNote}>Nothing is saved. This space is just for you.</Text>
          </ScrollView>
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

    /* ── Typography ────────────────────────────────────── */
    heading: { fontSize: 28, fontWeight: Typography.fontWeight.bold, color: colors.textPrimary, fontFamily: Typography.fontFamily.heading, textAlign: 'center', lineHeight: 38, marginBottom: Spacing.sm },
    subheading: { fontSize: Typography.fontSize.base, color: colors.textSecondary, fontFamily: Typography.fontFamily.primary, textAlign: 'center', marginBottom: Spacing['2xl'] },
    counterText: { fontSize: Typography.fontSize.sm, color: colors.textMuted, fontFamily: Typography.fontFamily.primary },

    /* ── Icon glow ─────────────────────────────────────── */
    iconGlow: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.accentSoft + '18', borderWidth: 1.5, borderColor: colors.accentSoft + '30', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing['2xl'] },

    /* ── Orb ───────────────────────────────────────────── */
    orbContainer: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing['3xl'] },
    orbRing3: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: colors.accentSoft },
    orbRing2: { position: 'absolute', width: 155, height: 155, borderRadius: 78, backgroundColor: colors.accentSoft },
    orbCore: { width: 110, height: 110, borderRadius: 55, backgroundColor: colors.accentSoft },

    /* ── Tags ──────────────────────────────────────────── */
    tagWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm, marginBottom: Spacing['2xl'], maxWidth: 360 },
    tag: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm + 2, borderRadius: Radius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
    tagText: { fontSize: Typography.fontSize.sm, color: colors.textPrimary, fontFamily: Typography.fontFamily.primary, fontWeight: Typography.fontWeight.medium },

    /* ── Input cards ───────────────────────────────────── */
    inputCard: { width: '100%', backgroundColor: colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: colors.borderLight, overflow: 'hidden' },
    inputLabel: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, color: colors.textSecondary, fontFamily: Typography.fontFamily.primary, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
    input: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, paddingTop: Spacing.sm, fontSize: Typography.fontSize.base, color: colors.textPrimary, fontFamily: Typography.fontFamily.primary, minHeight: 80 },
    privacyNote: { fontSize: Typography.fontSize.xs, color: colors.textMuted, fontFamily: Typography.fontFamily.primary, textAlign: 'center', marginTop: Spacing.xl },

    /* ── Primary button ────────────────────────────────── */
    primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: colors.accentSoft, borderRadius: Radius.lg, paddingVertical: Spacing.md, paddingHorizontal: Spacing['2xl'] },
    primaryBtnText: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: colors.primaryForeground, fontFamily: Typography.fontFamily.primary },
  });
