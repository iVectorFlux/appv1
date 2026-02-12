/**
 * Pre-Meeting Reset — Mode 4 (2-3 min)
 *
 * Steps:
 *  1. Breath downshift — 3 breaths (4-2-6)
 *  2. Goal framing — "What is your goal?"
 *  3. Tone priming — tag selection
 *  4. Posture cue + anchor sentence
 *
 * Design: clean professional interface, timer visible, no scroll.
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
const ANCHOR_HOLD = 8000; // 8s to read anchor sentence

const TONE_OPTIONS = PRE_MEETING_STEPS[2].options;

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
  const startTime = useRef(Date.now());

  // ── Transition helper ─────────────────────────────────────────
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

  // ── Breathing ─────────────────────────────────────────────────
  const runBreathCycle = useCallback(
    (cycle: number) => {
      if (cycle >= BREATH_CYCLES) {
        fadeToStep('goal');
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
    runBreathCycle(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Anchor countdown ──────────────────────────────────────────
  useEffect(() => {
    if (step !== 'anchor') return;
    setAnchorCountdown(Math.ceil(ANCHOR_HOLD / 1000));
    const iv = setInterval(() => {
      setAnchorCountdown((c) => {
        if (c <= 1) {
          clearInterval(iv);
          onComplete(100);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [step, onComplete]);

  const styles = createStyles(colors);

  const phaseLabel = breathPhase === 'in' ? 'Breathe in' : breathPhase === 'hold' ? 'Hold' : 'Breathe out';

  return (
    <View style={styles.container}>
      {/* Close */}
      <TouchableOpacity style={styles.closeBtn} onPress={onExit}>
        <Ionicons name="close" size={24} color={colors.textMuted} />
      </TouchableOpacity>

      <Animated.View style={[styles.center, { opacity: textFade }]}>

        {/* ── BREATHE ─────────────────────────────────────── */}
        {step === 'breathe' && (
          <>
            <Animated.View style={[styles.orb, { transform: [{ scale: orbScale }] }]} />
            <Text style={styles.heading}>{phaseLabel}</Text>
            <Text style={styles.counter}>Breath {breathCycle + 1} of {BREATH_CYCLES}</Text>
          </>
        )}

        {/* ── GOAL ────────────────────────────────────────── */}
        {step === 'goal' && (
          <>
            <Ionicons name="flag-outline" size={36} color={colors.primary} style={{ marginBottom: Spacing.xl }} />
            <Text style={styles.heading}>What's your goal{'\n'}for this?</Text>
            <TextInput
              value={goalText}
              onChangeText={setGoalText}
              placeholder="e.g. Stay calm and listen"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              multiline
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.primaryBtn, !goalText.trim() && { opacity: 0.4 }]}
              onPress={() => goalText.trim() && fadeToStep('tone')}
              activeOpacity={0.8}
              disabled={!goalText.trim()}
            >
              <Text style={styles.primaryBtnText}>Next</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── TONE ────────────────────────────────────────── */}
        {step === 'tone' && (
          <>
            <Ionicons name="mic-outline" size={36} color={colors.primary} style={{ marginBottom: Spacing.xl }} />
            <Text style={styles.heading}>How do you want{'\n'}to come across?</Text>
            <View style={styles.toneWrap}>
              {TONE_OPTIONS.map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setSelectedTone(selectedTone === t ? null : t)}
                  style={[
                    styles.toneTag,
                    selectedTone === t && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.toneTagText,
                      selectedTone === t && { color: colors.primaryForeground },
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.primaryBtn, !selectedTone && { opacity: 0.4 }]}
              onPress={() => selectedTone && fadeToStep('anchor')}
              activeOpacity={0.8}
              disabled={!selectedTone}
            >
              <Text style={styles.primaryBtnText}>Next</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── ANCHOR ──────────────────────────────────────── */}
        {step === 'anchor' && (
          <>
            <Ionicons name="body-outline" size={36} color={colors.primary} style={{ marginBottom: Spacing.xl }} />
            <Text style={styles.anchorInstruction}>
              Sit tall. Shoulders back.{'\n'}Feet flat on the floor.
            </Text>
            <View style={styles.anchorCard}>
              <Text style={styles.anchorSentence}>
                "I am prepared and present."
              </Text>
            </View>
            <Text style={styles.counter}>{anchorCountdown}s</Text>
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
      backgroundColor: colors.accentCalm,
      marginBottom: Spacing['3xl'],
      opacity: 0.7,
    },

    /* ── Goal input ──────────────────────────────────── */
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
      marginBottom: Spacing.xl,
    },

    /* ── Tone tags ───────────────────────────────────── */
    toneWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: Spacing.sm,
      marginBottom: Spacing['2xl'],
    },
    toneTag: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    toneTagText: {
      fontSize: Typography.fontSize.sm,
      color: colors.textPrimary,
      fontFamily: Typography.fontFamily.primary,
    },

    /* ── Anchor ──────────────────────────────────────── */
    anchorInstruction: {
      fontSize: Typography.fontSize.xl,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      fontFamily: Typography.fontFamily.heading,
      textAlign: 'center',
      lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.xl,
      marginBottom: Spacing['2xl'],
    },
    anchorCard: {
      backgroundColor: colors.surface,
      borderRadius: Radius.xl,
      paddingHorizontal: Spacing['2xl'],
      paddingVertical: Spacing.xl,
      borderWidth: 1,
      borderColor: colors.primary + '30',
      marginBottom: Spacing.lg,
    },
    anchorSentence: {
      fontSize: Typography.fontSize.xl,
      fontWeight: Typography.fontWeight.medium,
      color: colors.primary,
      fontFamily: Typography.fontFamily.heading,
      textAlign: 'center',
      fontStyle: 'italic',
    },

    /* ── Buttons ─────────────────────────────────────── */
    primaryBtn: {
      backgroundColor: colors.primary,
      borderRadius: Radius.lg,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing['3xl'],
      alignSelf: 'center',
    },
    primaryBtnText: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.primaryForeground,
      fontFamily: Typography.fontFamily.primary,
    },
  });
