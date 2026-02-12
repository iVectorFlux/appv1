/**
 * Post-Conflict Reset — Mode 5 (4-6 min)
 *
 * Steps:
 *  1. Label emotion — selection buttons
 *  2. Locate in body — text prompt (body map future)
 *  3. Breath release — 3 slow breaths
 *  4. Fact vs interpretation — two text prompts
 *
 * Design: slower pacing, longer transitions, dark bg, no scroll.
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
  const startTime = useRef(Date.now());

  // ── Transition helper (slower pacing) ─────────────────────────
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

  // ── Breathing ─────────────────────────────────────────────────
  const runBreathCycle = useCallback(
    (cycle: number) => {
      if (cycle >= BREATH_CYCLES) {
        fadeToStep('reframe');
        return;
      }
      setBreathCycle(cycle);

      setBreathPhase('in');
      Animated.timing(orbScale, { toValue: 1.3, duration: BREATH.inhale, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(() => {
        setBreathPhase('hold');
        setTimeout(() => {
          setBreathPhase('out');
          Animated.timing(orbScale, { toValue: 1, duration: BREATH.exhale, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(() => {
            runBreathCycle(cycle + 1);
          });
        }, BREATH.hold);
      });
    },
    [fadeToStep, orbScale],
  );

  useEffect(() => {
    if (step === 'breathe') {
      runBreathCycle(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const styles = createStyles(colors);

  const phaseLabel = breathPhase === 'in' ? 'Breathe in' : breathPhase === 'hold' ? 'Hold' : 'Let it out';

  return (
    <View style={styles.container}>
      {/* Close */}
      <TouchableOpacity style={styles.closeBtn} onPress={onExit}>
        <Ionicons name="close" size={24} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Step indicator */}
      <View style={styles.stepRow}>
        {(['label', 'locate', 'breathe', 'reframe'] as Step[]).map((s, i) => (
          <View
            key={s}
            style={[
              styles.stepDot,
              (step === s || (['label', 'locate', 'breathe', 'reframe'].indexOf(step) > i)) && { backgroundColor: colors.primary },
            ]}
          />
        ))}
      </View>

      <Animated.View style={[styles.center, { opacity: textFade }]}>

        {/* ── LABEL EMOTION ───────────────────────────────── */}
        {step === 'label' && (
          <>
            <Text style={styles.heading}>What are you feeling{'\n'}right now?</Text>
            <View style={styles.emotionWrap}>
              {POST_CONFLICT_EMOTIONS.map((e) => (
                <TouchableOpacity
                  key={e}
                  onPress={() => setSelectedEmotion(selectedEmotion === e ? null : e)}
                  style={[
                    styles.emotionTag,
                    selectedEmotion === e && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.emotionTagText,
                      selectedEmotion === e && { color: colors.primaryForeground },
                    ]}
                  >
                    {e}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.primaryBtn, !selectedEmotion && { opacity: 0.4 }]}
              onPress={() => selectedEmotion && fadeToStep('locate')}
              activeOpacity={0.8}
              disabled={!selectedEmotion}
            >
              <Text style={styles.primaryBtnText}>Next</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── LOCATE IN BODY ──────────────────────────────── */}
        {step === 'locate' && (
          <>
            <Ionicons name="body-outline" size={40} color={colors.accentSoft} style={{ marginBottom: Spacing.xl }} />
            <Text style={styles.heading}>Where do you feel this{'\n'}in your body?</Text>
            <View style={styles.emotionWrap}>
              {BODY_LOCATIONS.map((loc) => (
                <TouchableOpacity
                  key={loc}
                  onPress={() => setSelectedBody(selectedBody === loc ? null : loc)}
                  style={[
                    styles.emotionTag,
                    selectedBody === loc && { backgroundColor: colors.accentSoft, borderColor: colors.accentSoft },
                  ]}
                >
                  <Text
                    style={[
                      styles.emotionTagText,
                      selectedBody === loc && { color: colors.primaryForeground },
                    ]}
                  >
                    {loc}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.primaryBtn, !selectedBody && { opacity: 0.4 }]}
              onPress={() => selectedBody && fadeToStep('breathe')}
              activeOpacity={0.8}
              disabled={!selectedBody}
            >
              <Text style={styles.primaryBtnText}>Next</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── BREATH RELEASE ──────────────────────────────── */}
        {step === 'breathe' && (
          <>
            <Animated.View style={[styles.orb, { transform: [{ scale: orbScale }] }]} />
            <Text style={styles.heading}>{phaseLabel}</Text>
            <Text style={styles.counter}>Breath {breathCycle + 1} of {BREATH_CYCLES}</Text>
          </>
        )}

        {/* ── FACT vs INTERPRETATION ──────────────────────── */}
        {step === 'reframe' && (
          <ScrollView
            style={{ flex: 1, width: '100%' }}
            contentContainerStyle={{ alignItems: 'center', paddingBottom: Spacing['5xl'] }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.heading, { marginTop: Spacing['2xl'] }]}>Separate fact from story</Text>

            <Text style={styles.inputLabel}>What actually happened?</Text>
            <TextInput
              value={factText}
              onChangeText={setFactText}
              placeholder="Just the facts"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              multiline
              textAlignVertical="top"
            />

            <Text style={[styles.inputLabel, { marginTop: Spacing.xl }]}>
              What story am I telling myself?
            </Text>
            <TextInput
              value={storyText}
              onChangeText={setStoryText}
              placeholder="The interpretation"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              multiline
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.primaryBtn, { marginTop: Spacing['2xl'] }]}
              onPress={() => onComplete(100)}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryBtnText}>Finish</Text>
            </TouchableOpacity>

            <Text style={styles.note}>Nothing is saved. This space is temporary.</Text>
          </ScrollView>
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
    stepRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: Spacing.sm,
      marginTop: Spacing['5xl'],
    },
    stepDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.surface,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.xl,
    },
    heading: {
      fontSize: Typography.fontSize['2xl'],
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      fontFamily: Typography.fontFamily.heading,
      textAlign: 'center',
      lineHeight: Typography.lineHeight.relaxed * Typography.fontSize['2xl'],
      marginBottom: Spacing.xl,
    },
    counter: {
      fontSize: Typography.fontSize.sm,
      color: colors.textMuted,
      fontFamily: Typography.fontFamily.primary,
      marginTop: Spacing.sm,
    },
    orb: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.accentSoft,
      marginBottom: Spacing['3xl'],
      opacity: 0.7,
    },

    /* ── Emotion / body tags ─────────────────────────── */
    emotionWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: Spacing.sm,
      marginBottom: Spacing['2xl'],
      maxWidth: 340,
    },
    emotionTag: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    emotionTagText: {
      fontSize: Typography.fontSize.sm,
      color: colors.textPrimary,
      fontFamily: Typography.fontFamily.primary,
    },

    /* ── Text inputs ─────────────────────────────────── */
    inputLabel: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textSecondary,
      fontFamily: Typography.fontFamily.primary,
      alignSelf: 'flex-start',
      marginBottom: Spacing.sm,
    },
    input: {
      width: '100%',
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      fontSize: Typography.fontSize.base,
      color: colors.textPrimary,
      fontFamily: Typography.fontFamily.primary,
      minHeight: 80,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    note: {
      fontSize: Typography.fontSize.xs,
      color: colors.textMuted,
      fontFamily: Typography.fontFamily.primary,
      textAlign: 'center',
      marginTop: Spacing.xl,
    },

    /* ── Buttons ─────────────────────────────────────── */
    primaryBtn: {
      backgroundColor: colors.primary,
      borderRadius: Radius.lg,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing['3xl'],
    },
    primaryBtnText: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.primaryForeground,
      fontFamily: Typography.fontFamily.primary,
    },
  });
