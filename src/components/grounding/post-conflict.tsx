/**
 * Post-Conflict Reset - Mode 5 (4-6 min grounding)
 *
 * Overhauled to deliver a premium, minimalist stock iOS mindfulness layout:
 *  - Overlapping translucent ambient color shifts.
 *  - Re-uses our unified, silky-smooth Lotus Breathe visualizer.
 *  - Premium bento-style emotion & body location tags.
 *  - Double-input reflection sheets with glowing focus indicators.
 *  - Minimalist, high-end visual cards.
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
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography, Radius, useColors } from '@/constants/design-tokens';
import { POST_CONFLICT_EMOTIONS, POST_CONFLICT_STEPS } from '@/data/grounding-content';
import type { GroundingModeProps } from '@/types/grounding';
import { TagChip } from '@/components/ui/tag-chip';
import { GlassCard } from '@/components/ui/glass-card';
import { PhotonBreathCluster } from '@/components/grounding/photon-breath-cluster';

const useND = Platform.OS !== 'web';

type Step = 'label' | 'locate' | 'breathe' | 'reframe';

const BODY_LOCATIONS = POST_CONFLICT_STEPS[1].bodyPrompts;
const BREATH = { inhale: 4000, hold: 2000, exhale: 6000 };
const BREATH_CYCLES = 3;
const STEP_ORDER: Step[] = ['label', 'locate', 'breathe', 'reframe'];

const BG = '#0C1222';
const SURFACE = 'rgba(255,255,255,0.04)';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT_PRIMARY = '#E2E8F0';
const TEXT_MUTED = '#94A3B8';
const ACCENT = '#f472b6'; // Rose/Pink accent for post-conflict restoration

export function PostConflict({ onComplete, onExit }: GroundingModeProps) {
  const colors = useColors();
  const [step, setStep] = useState<Step>('label');
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [selectedBody, setSelectedBody] = useState<string | null>(null);
  const [breathPhase, setBreathPhase] = useState<'in' | 'hold' | 'out'>('in');
  const [breathCycle, setBreathCycle] = useState(0);
  const [factText, setFactText] = useState('');
  const [storyText, setStoryText] = useState('');
  const [breathTimingLabel, setBreathTimingLabel] = useState('Inhale · 4s');
  const [activeInput, setActiveInput] = useState<'fact' | 'story' | null>(null);

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
      if (cycle >= BREATH_CYCLES) { fadeToStep('reframe'); return; }
      setBreathCycle(cycle);
      setBreathPhase('in');
      setBreathTimingLabel('Inhale · 4s');
      setTimeout(() => {
        setBreathPhase('hold');
        setBreathTimingLabel('Hold · 2s');
        setTimeout(() => {
          setBreathPhase('out');
          setBreathTimingLabel('Exhale · 6s');
          setTimeout(() => {
            runBreathCycle(cycle + 1);
          }, BREATH.exhale);
        }, BREATH.hold);
      }, BREATH.inhale);
    },
    [fadeToStep],
  );

  useEffect(() => { if (step === 'breathe') runBreathCycle(0); }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const orbColor = breathPhase === 'out' ? '#fb923c' : breathPhase === 'hold' ? '#a78bfa' : '#38bdf8';
  const phaseLabel = breathPhase === 'in' ? 'Breathe in slowly' : breathPhase === 'hold' ? 'Hold gently' : 'Let it all out';
  const activeColor = step === 'breathe' ? orbColor : ACCENT;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={s.container}
    >
      <LinearGradient colors={[BG, '#080d1a', BG]} style={StyleSheet.absoluteFill} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />

      {/* Dynamic atmospheric color shift aura overlay */}
      <View style={[s.accentGlow, { backgroundColor: activeColor }]} />

      {/* Navigation Top Bar */}
      <View style={s.header}>
        <TouchableOpacity onPress={onExit} hitSlop={16} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>
          Post Conflict Reset
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={s.topStepBlock}>
        <View style={s.stepRowInline}>
          <Text style={s.stepMeta} accessibilityLiveRegion="polite" numberOfLines={1}>
            {step === 'label' ? 'Step 1 of 4 · Name emotion' : step === 'locate' ? 'Step 2 of 4 · Locate it' : step === 'breathe' ? 'Step 3 of 4 · Release' : 'Step 4 of 4 · Reframe'}
          </Text>
          <View style={s.phaseSegRow}>
            {STEP_ORDER.map((st, i) => (
              <View key={st} style={[s.phaseSeg, i <= currentStepIdx && { backgroundColor: activeColor, opacity: 0.85 }]} />
            ))}
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Animated.View style={[s.center, { opacity: textFade }]}>

          {step === 'label' && (
            <GlassCard style={s.glassContainer} tint="dark" backgroundColor="rgba(255, 255, 255, 0.03)" borderColor="rgba(255, 255, 255, 0.08)">
              <Text style={s.heading}>What are you feeling?</Text>
              <Text style={s.subheading}>Label the emotion to take away its power.</Text>
              
              <View style={s.tagWrap}>
                {POST_CONFLICT_EMOTIONS.map((e) => (
                  <TagChip
                    key={e}
                    label={e}
                    selected={selectedEmotion === e}
                    selectedColor={ACCENT}
                    onPress={() => setSelectedEmotion(selectedEmotion === e ? null : e)}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[s.primaryBtn, !selectedEmotion && { opacity: 0.35 }]}
                onPress={() => selectedEmotion && fadeToStep('locate')}
                activeOpacity={0.85}
                disabled={!selectedEmotion}
              >
                <Text style={s.primaryBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            </GlassCard>
          )}

          {step === 'locate' && (
            <GlassCard style={s.glassContainer} tint="dark" backgroundColor="rgba(255, 255, 255, 0.03)" borderColor="rgba(255, 255, 255, 0.08)">
              <View style={s.iconGlowWrapper}>
                <Animated.View style={[s.glowRingOutline, { borderColor: ACCENT + '30', transform: [{ scale: pulseRing }] }]} />
                <View style={s.promptIcon}><Ionicons name="body-outline" size={30} color={ACCENT} /></View>
              </View>

              <Text style={s.heading}>Where is it located?</Text>
              <Text style={s.subheading}>Locate the physical sensation in your body.</Text>

              <View style={s.tagWrap}>
                {BODY_LOCATIONS.map((loc) => (
                  <TagChip
                    key={loc}
                    label={loc}
                    selected={selectedBody === loc}
                    selectedColor={ACCENT}
                    onPress={() => setSelectedBody(selectedBody === loc ? null : loc)}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[s.primaryBtn, !selectedBody && { opacity: 0.35 }]}
                onPress={() => selectedBody && fadeToStep('breathe')}
                activeOpacity={0.85}
                disabled={!selectedBody}
              >
                <Text style={s.primaryBtnText}>Release Tension</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            </GlassCard>
          )}

          {step === 'breathe' && (
            <View style={s.fullWidthCenter}>
              <View style={s.orbWrap}>
                <PhotonBreathCluster
                  visualKey={`post-conflict-breath-${breathCycle}-${breathPhase}`}
                  durationMs={breathPhase === 'in' ? BREATH.inhale : breathPhase === 'hold' ? BREATH.hold : BREATH.exhale}
                  orb={breathPhase === 'in' ? 'expand' : breathPhase === 'hold' ? 'holdHigh' : 'contract'}
                  accent={orbColor}
                />
              </View>
              <Text style={s.breathHeading}>{phaseLabel}</Text>
              <Text style={[s.breathTiming, { color: orbColor }]}>{breathTimingLabel}</Text>
              <Text style={s.counterText}>Breath {breathCycle + 1} of {BREATH_CYCLES}</Text>
            </View>
          )}

          {step === 'reframe' && (
            <GlassCard style={s.glassContainer} tint="dark" backgroundColor="rgba(255, 255, 255, 0.03)" borderColor="rgba(255, 255, 255, 0.08)">
              <Text style={s.heading}>Separate facts from stories</Text>
              <Text style={s.subheading}>Filter the objective reality from your interpretation.</Text>

              <View style={[s.inputCard, activeInput === 'fact' && { borderColor: ACCENT + '80' }]}>
                <Text style={s.inputLabel}>What actually happened?</Text>
                <TextInput
                  value={factText}
                  onChangeText={setFactText}
                  placeholder="The objective facts only, no judgment..."
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  style={s.input}
                  multiline
                  onFocus={() => setActiveInput('fact')}
                  onBlur={() => setActiveInput(null)}
                  textAlignVertical="top"
                />
              </View>

              <View style={[s.inputCard, activeInput === 'story' && { borderColor: ACCENT + '80' }, { marginTop: Spacing.sm }]}>
                <Text style={s.inputLabel}>What story am I telling myself?</Text>
                <TextInput
                  value={storyText}
                  onChangeText={setStoryText}
                  placeholder="My assumptions, fears, interpretations..."
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  style={s.input}
                  multiline
                  onFocus={() => setActiveInput('story')}
                  onBlur={() => setActiveInput(null)}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity style={[s.primaryBtn, { marginTop: Spacing.lg }]} onPress={() => onComplete(100)} activeOpacity={0.85}>
                <Text style={s.primaryBtnText}>Finish Session</Text>
                <Ionicons name="checkmark" size={16} color="#fff" />
              </TouchableOpacity>

              <Text style={s.privacyNote}>Nothing is saved. This space is purely for you.</Text>
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.sm,
    zIndex: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginLeft: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: TEXT_PRIMARY,
    fontFamily: Typography.fontFamily.heading,
    lineHeight: 20,
    letterSpacing: 0.5,
    opacity: 0.85,
  },
  topStepBlock: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  stepRowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  stepMeta: {
    fontSize: Typography.fontSize.xs,
    color: TEXT_MUTED,
    fontFamily: Typography.fontFamily.primary,
    fontWeight: Typography.fontWeight.semibold,
    flexShrink: 0,
    opacity: 0.8,
  },
  phaseSegRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    minWidth: 0,
  },
  phaseSeg: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    opacity: 0.4,
  },

  scroll: { flexGrow: 1, justifyContent: 'center', paddingBottom: Spacing['2xl'] },
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

  /* Step 3 breathing */
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
  breathTiming: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily.primary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  counterText: {
    fontSize: Typography.fontSize.sm,
    color: TEXT_MUTED,
    fontFamily: Typography.fontFamily.primary,
    opacity: 0.9,
    textAlign: 'center',
  },

  /* Glass reflection sheets */
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

  /* Bento tags list */
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
    maxWidth: 320,
  },

  /* Fact/Story Double input card style */
  inputCard: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  inputLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: TEXT_MUTED,
    fontFamily: Typography.fontFamily.primary,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  input: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    paddingTop: Spacing.xs,
    fontSize: Typography.fontSize.base,
    color: TEXT_PRIMARY,
    fontFamily: Typography.fontFamily.primary,
    minHeight: 70,
  },
  privacyNote: {
    fontSize: Typography.fontSize.xs,
    color: TEXT_MUTED,
    fontFamily: Typography.fontFamily.primary,
    textAlign: 'center',
    marginTop: Spacing.md,
    opacity: 0.8,
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
