/**
 * Pre-Meeting Reset - Mode 4 (2-3 min grounding)
 *
 * Overhauled to deliver a premium, minimalist stock iOS mindfulness layout:
 *  - Overlapping translucent ambient color shifts.
 *  - Re-uses our unified, silky-smooth Lotus Breathe visualizer.
 *  - Sleek glassmorphic reflection sheets and focus cards.
 *  - Elegant, glowing focus text input borders.
 *  - Premium bento-style tone tags with delicate borders.
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
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography, Radius, useColors } from '@/constants/design-tokens';
import { PRE_MEETING_STEPS } from '@/data/grounding-content';
import type { GroundingModeProps } from '@/types/grounding';
import { TagChip } from '@/components/ui/tag-chip';
import { GlassCard } from '@/components/ui/glass-card';
import { PhotonBreathCluster } from '@/components/grounding/photon-breath-cluster';

const useND = Platform.OS !== 'web';

type Step = 'breathe' | 'goal' | 'tone' | 'anchor';

const BREATH = { inhale: 4000, hold: 2000, exhale: 6000 };
const BREATH_CYCLES = 3;
const ANCHOR_HOLD = 8000;
const TONE_OPTIONS = PRE_MEETING_STEPS[2].options;
const STEP_ORDER: Step[] = ['breathe', 'goal', 'tone', 'anchor'];

const BG = '#0C1222';
const SURFACE = 'rgba(255,255,255,0.04)';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT_PRIMARY = '#E2E8F0';
const TEXT_MUTED = '#94A3B8';
const ACCENT = '#fb923c'; // Warm amber tone for pre-meeting focus

export function PreMeeting({ onComplete, onExit }: GroundingModeProps) {
  const colors = useColors();
  const [step, setStep] = useState<Step>('breathe');
  const [breathPhase, setBreathPhase] = useState<'in' | 'hold' | 'out'>('in');
  const [breathCycle, setBreathCycle] = useState(0);
  const [goalText, setGoalText] = useState('');
  const [selectedTone, setSelectedTone] = useState<string | null>(null);
  const [anchorCountdown, setAnchorCountdown] = useState(0);
  const [isFocused, setIsFocused] = useState(false);

  const textFade = useRef(new Animated.Value(1)).current;
  const pulseRing = useRef(new Animated.Value(1)).current;

  const currentStepIdx = STEP_ORDER.indexOf(step);

  // continuous breathing-like pulses for orbital rings
  useEffect(() => {
    if (step === 'breathe') return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseRing, { toValue: 1.08, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: useND }),
        Animated.timing(pulseRing, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: useND }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [step]);

  const fadeToStep = useCallback(
    (next: Step) => {
      Animated.timing(textFade, { toValue: 0, duration: 250, useNativeDriver: useND }).start(() => {
        setStep(next);
        textFade.setValue(0);
        Animated.timing(textFade, { toValue: 1, duration: 350, useNativeDriver: useND }).start();
      });
    },
    [textFade],
  );

  const runBreathCycle = useCallback(
    (cycle: number) => {
      if (cycle >= BREATH_CYCLES) { fadeToStep('goal'); return; }
      setBreathCycle(cycle);
      setBreathPhase('in');
      setTimeout(() => {
        setBreathPhase('hold');
        setTimeout(() => {
          setBreathPhase('out');
          setTimeout(() => {
            runBreathCycle(cycle + 1);
          }, BREATH.exhale);
        }, BREATH.hold);
      }, BREATH.inhale);
    },
    [fadeToStep],
  );

  useEffect(() => { runBreathCycle(0); }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const phaseLabel = breathPhase === 'in' ? 'Breathe in slowly' : breathPhase === 'hold' ? 'Hold' : 'Exhale deeply';
  const phaseColor = breathPhase === 'in' ? '#38bdf8' : breathPhase === 'hold' ? '#a78bfa' : '#fb923c';
  const activeColor = step === 'breathe' ? phaseColor : ACCENT;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={s.container}
    >
      <LinearGradient colors={[BG, '#080d1a', BG]} style={StyleSheet.absoluteFill} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />

      {/* Deep atmospheric metal glow overlay */}
      <View style={[s.accentGlow, { backgroundColor: activeColor }]} />

      {/* Top Header Bar */}
      <View style={s.topBar}>
        <Text style={s.stepLabel}>
          {step === 'breathe' ? 'Step 1 of 4 · Breath downshift' : step === 'goal' ? 'Step 2 of 4 · Clear intent' : step === 'tone' ? 'Step 3 of 4 · Relational tone' : 'Step 4 of 4 · Presence'}
        </Text>
        <TouchableOpacity
          style={s.closeBtn}
          onPress={onExit}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Exit exercise"
        >
          <Ionicons name="chevron-back" size={20} color={TEXT_MUTED} />
        </TouchableOpacity>
      </View>

      {/* Bento Progress Segments */}
      <View style={s.progressRow}>
        {STEP_ORDER.map((st, i) => (
          <View key={st} style={[s.progressSeg, i <= currentStepIdx && { backgroundColor: activeColor, opacity: 0.85 }]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Animated.View style={[s.center, { opacity: textFade }]}>
          {step === 'breathe' && (
            <View style={s.fullWidthCenter}>
              <View style={s.orbWrap}>
                <PhotonBreathCluster
                  visualKey={`pre-meeting-breath-${breathCycle}-${breathPhase}`}
                  durationMs={breathPhase === 'in' ? BREATH.inhale : breathPhase === 'hold' ? BREATH.hold : BREATH.exhale}
                  orb={breathPhase === 'in' ? 'expand' : breathPhase === 'hold' ? 'holdHigh' : 'contract'}
                  accent={phaseColor}
                />
              </View>
              <Text style={s.breathHeading}>{phaseLabel}</Text>
              <Text style={s.counterText}>Breath {breathCycle + 1} of {BREATH_CYCLES}</Text>
            </View>
          )}

          {step === 'goal' && (
            <GlassCard style={s.glassContainer}>
              <View style={s.iconGlowWrapper}>
                <Animated.View style={[s.glowRingOutline, { borderColor: ACCENT + '30', transform: [{ scale: pulseRing }] }]} />
                <View style={s.promptIcon}><Ionicons name="flag-outline" size={30} color={ACCENT} /></View>
              </View>

              <Text style={s.heading}>Define your goal</Text>
              <Text style={s.subheading}>Specify a simple focal intention for this meeting.</Text>

              <View style={[s.inputCard, isFocused && { borderColor: ACCENT + '80' }]}>
                <TextInput
                  value={goalText}
                  onChangeText={setGoalText}
                  placeholder="e.g. Listen deeply, speak with clarity..."
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  style={s.input}
                  multiline
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={[s.primaryBtn, !goalText.trim() && { opacity: 0.35 }]}
                onPress={() => goalText.trim() && fadeToStep('tone')}
                activeOpacity={0.85}
                disabled={!goalText.trim()}
              >
                <Text style={s.primaryBtnText}>Set Intention</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            </GlassCard>
          )}

          {step === 'tone' && (
            <GlassCard style={s.glassContainer}>
              <View style={s.iconGlowWrapper}>
                <Animated.View style={[s.glowRingOutline, { borderColor: ACCENT + '30', transform: [{ scale: pulseRing }] }]} />
                <View style={s.promptIcon}><Ionicons name="mic-outline" size={30} color={ACCENT} /></View>
              </View>

              <Text style={s.heading}>Prime your tone</Text>
              <Text style={s.subheading}>Select the primary energy you want to convey.</Text>

              <View style={s.toneWrap}>
                {TONE_OPTIONS.map((t) => (
                  <TagChip
                    key={t}
                    label={t}
                    selected={selectedTone === t}
                    selectedColor={ACCENT}
                    onPress={() => setSelectedTone(selectedTone === t ? null : t)}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[s.primaryBtn, !selectedTone && { opacity: 0.35 }]}
                onPress={() => selectedTone && fadeToStep('anchor')}
                activeOpacity={0.85}
                disabled={!selectedTone}
              >
                <Text style={s.primaryBtnText}>Apply Tone</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            </GlassCard>
          )}

          {step === 'anchor' && (
            <GlassCard style={s.glassContainer}>
              <View style={s.iconGlowWrapper}>
                <Animated.View style={[s.glowRingOutline, { borderColor: ACCENT + '30', transform: [{ scale: pulseRing }] }]} />
                <View style={s.promptIcon}><Ionicons name="body-outline" size={30} color={ACCENT} /></View>
              </View>

              <Text style={s.anchorInstruction}>Sit tall. Shoulders back.{'\n'}Feet flat on the floor.</Text>
              
              <View style={s.anchorCard}>
                <Text style={s.anchorQuote}>“</Text>
                <Text style={s.anchorSentence}>I am fully prepared and present.</Text>
                <Text style={[s.anchorQuote, { textAlign: 'right' }]}>”</Text>
              </View>

              <View style={[s.timerRing, { borderColor: ACCENT + '25' }]}>
                <Text style={[s.timerNum, { color: ACCENT }]}>{anchorCountdown}</Text>
              </View>
            </GlassCard>
          )}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  accentGlow: {
    position: 'absolute',
    top: -200,
    left: -120,
    right: -120,
    height: 550,
    borderRadius: 275,
    opacity: 0.08,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    zIndex: 10,
  },
  stepLabel: {
    fontSize: Typography.fontSize.xs,
    color: TEXT_MUTED,
    fontFamily: Typography.fontFamily.primary,
    fontWeight: Typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.8,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },

  progressRow: {
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xs,
    zIndex: 10,
  },
  progressSeg: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  scroll: { flexGrow: 1, paddingBottom: Spacing['2xl'] },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    minHeight: 460,
  },
  fullWidthCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },

  /* Step 1 visuals */
  orbWrap: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  breathHeading: {
    fontSize: 28,
    fontWeight: Typography.fontWeight.medium,
    color: TEXT_PRIMARY,
    fontFamily: Typography.fontFamily.heading,
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: -0.5,
    marginBottom: Spacing.xs,
  },
  counterText: {
    fontSize: Typography.fontSize.sm,
    color: TEXT_MUTED,
    fontFamily: Typography.fontFamily.primary,
    opacity: 0.9,
  },

  /* Reflection glass sheets */
  glassContainer: {
    width: '100%',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  iconGlowWrapper: {
    width: 110,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  glowRingOutline: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 1,
  },
  promptIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  heading: {
    fontSize: 24,
    fontWeight: Typography.fontWeight.semibold,
    color: TEXT_PRIMARY,
    fontFamily: Typography.fontFamily.heading,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: Spacing.xs,
  },
  subheading: {
    fontSize: Typography.fontSize.sm,
    color: TEXT_MUTED,
    fontFamily: Typography.fontFamily.primary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    lineHeight: 18,
  },

  /* Focus text input fields */
  inputCard: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  input: {
    padding: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: TEXT_PRIMARY,
    fontFamily: Typography.fontFamily.primary,
    minHeight: 90,
  },

  /* Bento tags list */
  toneWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
    maxWidth: 320,
  },

  /* Anchor cues styling */
  anchorInstruction: {
    fontSize: 22,
    fontWeight: Typography.fontWeight.semibold,
    color: TEXT_PRIMARY,
    fontFamily: Typography.fontFamily.heading,
    textAlign: 'center',
    lineHeight: 32,
    letterSpacing: -0.3,
    marginBottom: Spacing.lg,
  },
  anchorCard: {
    backgroundColor: SURFACE,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: Spacing.lg,
    width: '100%',
  },
  anchorQuote: {
    fontSize: 28,
    color: ACCENT + '30',
    fontFamily: Typography.fontFamily.heading,
    lineHeight: 28,
  },
  anchorSentence: {
    fontSize: 20,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.heading,
    color: ACCENT,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: Spacing.xs,
  },

  timerRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerNum: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    fontVariant: ['tabular-nums'],
    fontFamily: Typography.fontFamily.heading,
  },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: ACCENT,
    borderRadius: Radius.md,
    paddingVertical: 13,
    paddingHorizontal: Spacing.xl,
  },
  primaryBtnText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: '#fff',
    fontFamily: Typography.fontFamily.primary,
  },
});
