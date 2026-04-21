/**
 * Pre-Meeting Reset — Mode 4 (2-3 min)
 *
 * Steps:
 *  1. Breath downshift — 3 breaths (4-2-6) with glowing orb
 *  2. Goal framing — "What is your goal?"
 *  3. Tone priming — tag selection
 *  4. Posture cue + anchor sentence
 *
 * Dark immersive background, atmospheric orb, clean card-like inputs.
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography, Radius } from '@/constants/design-tokens';
import { PRE_MEETING_STEPS } from '@/data/grounding-content';
import type { GroundingModeProps } from '@/types/grounding';
import { TagChip } from '@/components/ui/tag-chip';

const useND = Platform.OS !== 'web';

type Step = 'breathe' | 'goal' | 'tone' | 'anchor';

const BREATH = { inhale: 4000, hold: 2000, exhale: 6000 };
const BREATH_CYCLES = 3;
const ANCHOR_HOLD = 8000;
const TONE_OPTIONS = PRE_MEETING_STEPS[2].options;
const STEP_ORDER: Step[] = ['breathe', 'goal', 'tone', 'anchor'];

const BG = '#0C1222';
const SURFACE = 'rgba(255,255,255,0.06)';
const BORDER = 'rgba(255,255,255,0.10)';
const TEXT_PRIMARY = '#E2E8F0';
const TEXT_MUTED = '#64748B';
const ACCENT = '#F59E0B';

export function PreMeeting({ onComplete, onExit }: GroundingModeProps) {
  const [step, setStep] = useState<Step>('breathe');
  const [breathPhase, setBreathPhase] = useState<'in' | 'hold' | 'out'>('in');
  const [breathCycle, setBreathCycle] = useState(0);
  const [goalText, setGoalText] = useState('');
  const [selectedTone, setSelectedTone] = useState<string | null>(null);
  const [anchorCountdown, setAnchorCountdown] = useState(0);

  const textFade = useRef(new Animated.Value(1)).current;
  const orbScale = useRef(new Animated.Value(1)).current;
  const orbOpacity = useRef(new Animated.Value(0.5)).current;
  const ring3Pulse = useRef(new Animated.Value(1)).current;
  const ring4Pulse = useRef(new Animated.Value(1)).current;

  const currentStepIdx = STEP_ORDER.indexOf(step);

  const ring4Scale = useMemo(() => Animated.multiply(orbScale, ring4Pulse), [orbScale, ring4Pulse]);
  const ring3Scale = useMemo(() => Animated.multiply(orbScale, ring3Pulse), [orbScale, ring3Pulse]);
  const ring4Opa = useMemo(() => Animated.multiply(orbOpacity, new Animated.Value(0.08)), [orbOpacity]);
  const ring3Opa = useMemo(() => Animated.multiply(orbOpacity, new Animated.Value(0.14)), [orbOpacity]);
  const ring2Opa = useMemo(() => Animated.multiply(orbOpacity, new Animated.Value(0.25)), [orbOpacity]);

  useEffect(() => {
    const p3 = Animated.loop(
      Animated.sequence([
        Animated.timing(ring3Pulse, { toValue: 1.06, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: useND }),
        Animated.timing(ring3Pulse, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: useND }),
      ]),
    );
    const p4 = Animated.loop(
      Animated.sequence([
        Animated.timing(ring4Pulse, { toValue: 1.1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: useND }),
        Animated.timing(ring4Pulse, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: useND }),
      ]),
    );
    p3.start();
    p4.start();
    return () => { p3.stop(); p4.stop(); };
  }, [ring3Pulse, ring4Pulse]);

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
      Animated.parallel([
        Animated.timing(orbScale, { toValue: 1.35, duration: BREATH.inhale, easing: Easing.inOut(Easing.cubic), useNativeDriver: useND }),
        Animated.timing(orbOpacity, { toValue: 0.88, duration: BREATH.inhale, useNativeDriver: useND }),
      ]).start(() => {
        setBreathPhase('hold');
        setTimeout(() => {
          setBreathPhase('out');
          Animated.parallel([
            Animated.timing(orbScale, { toValue: 1, duration: BREATH.exhale, easing: Easing.inOut(Easing.cubic), useNativeDriver: useND }),
            Animated.timing(orbOpacity, { toValue: 0.5, duration: BREATH.exhale, useNativeDriver: useND }),
          ]).start(() => runBreathCycle(cycle + 1));
        }, BREATH.hold);
      });
    },
    [fadeToStep, orbScale, orbOpacity],
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

  const phaseLabel = breathPhase === 'in' ? 'Breathe in' : breathPhase === 'hold' ? 'Hold' : 'Breathe out';
  const phaseColor = breathPhase === 'in' ? '#6EA8FE' : breathPhase === 'hold' ? '#A78BFA' : '#F97316';

  return (
    <View style={s.container}>
      <LinearGradient colors={[BG, '#111827', BG]} style={StyleSheet.absoluteFill} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />

      <View style={s.topBar}>
        <Text style={s.stepLabel}>
          {step === 'breathe' ? 'Step 1 of 4 · Breath Downshift' : step === 'goal' ? 'Step 2 of 4 · Goal' : step === 'tone' ? 'Step 3 of 4 · Tone' : 'Step 4 of 4 · Anchor'}
        </Text>
        <TouchableOpacity
          style={s.closeBtn}
          onPress={onExit}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Exit exercise"
        >
          <Ionicons name="chevron-back" size={22} color={TEXT_MUTED} />
        </TouchableOpacity>
      </View>

      <View style={s.progressRow}>
        {STEP_ORDER.map((st, i) => (
          <View key={st} style={[s.progressSeg, i <= currentStepIdx && { backgroundColor: ACCENT }]} />
        ))}
      </View>

      <Animated.View style={[s.center, { opacity: textFade }]}>
        {step === 'breathe' && (
          <>
            <View style={s.orbWrap}>
              <Animated.View style={[s.ring4, { backgroundColor: phaseColor, transform: [{ scale: ring4Scale }], opacity: ring4Opa }]} />
              <Animated.View style={[s.ring3, { backgroundColor: phaseColor, transform: [{ scale: ring3Scale }], opacity: ring3Opa }]} />
              <Animated.View style={[s.ring2, { backgroundColor: phaseColor, transform: [{ scale: orbScale }], opacity: ring2Opa }]} />
              <Animated.View
                style={[
                  s.core,
                  {
                    backgroundColor: phaseColor,
                    transform: [{ scale: orbScale }],
                    opacity: orbOpacity,
                    ...(Platform.OS === 'ios' ? { shadowColor: phaseColor, shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 0 } } : {}),
                  },
                ]}
              />
            </View>
            <Text style={[s.heading, { color: TEXT_PRIMARY }]}>{phaseLabel}</Text>
            <Text style={s.counterText}>Breath {breathCycle + 1} of {BREATH_CYCLES}</Text>
          </>
        )}

        {step === 'goal' && (
          <>
            <View style={s.promptIcon}><Ionicons name="flag-outline" size={36} color={ACCENT} /></View>
            <Text style={s.heading}>What's your goal{'\n'}for this?</Text>
            <View style={s.inputCard}>
              <TextInput
                value={goalText}
                onChangeText={setGoalText}
                placeholder="e.g. Stay calm and listen"
                placeholderTextColor={TEXT_MUTED}
                style={s.input}
                multiline
                textAlignVertical="top"
              />
            </View>
            <TouchableOpacity
              style={[s.primaryBtn, !goalText.trim() && { opacity: 0.35 }]}
              onPress={() => goalText.trim() && fadeToStep('tone')}
              activeOpacity={0.8}
              disabled={!goalText.trim()}
            >
              <Text style={s.primaryBtnText}>Next</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </>
        )}

        {step === 'tone' && (
          <>
            <View style={s.promptIcon}><Ionicons name="mic-outline" size={36} color={ACCENT} /></View>
            <Text style={s.heading}>How do you want{'\n'}to come across?</Text>
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
              activeOpacity={0.8}
              disabled={!selectedTone}
            >
              <Text style={s.primaryBtnText}>Next</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </>
        )}

        {step === 'anchor' && (
          <>
            <View style={s.promptIcon}><Ionicons name="body-outline" size={36} color={ACCENT} /></View>
            <Text style={s.anchorInstruction}>Sit tall. Shoulders back.{'\n'}Feet flat on the floor.</Text>
            <View style={s.anchorCard}>
              <Text style={s.anchorQuote}>"</Text>
              <Text style={[s.anchorSentence, { color: ACCENT }]}>I am prepared and present.</Text>
              <Text style={[s.anchorQuote, { textAlign: 'right' }]}>"</Text>
            </View>
            <View style={[s.timerRing, { borderColor: ACCENT + '40' }]}>
              <Text style={[s.timerNum, { color: ACCENT }]}>{anchorCountdown}</Text>
            </View>
          </>
        )}
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.sm },
  stepLabel: { fontSize: Typography.fontSize.sm, color: TEXT_MUTED, fontFamily: Typography.fontFamily.primary, fontWeight: Typography.fontWeight.medium },
  closeBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.full, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER },

  progressRow: { flexDirection: 'row', gap: 4, paddingHorizontal: Spacing.lg, marginTop: Spacing.sm },
  progressSeg: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.06)' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg },

  orbWrap: { width: 240, height: 240, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
  ring4: { position: 'absolute', width: 240, height: 240, borderRadius: 120 },
  ring3: { position: 'absolute', width: 200, height: 200, borderRadius: 100 },
  ring2: { position: 'absolute', width: 160, height: 160, borderRadius: 80 },
  core: { width: 110, height: 110, borderRadius: 55 },

  heading: { fontSize: 24, fontWeight: Typography.fontWeight.semibold, color: TEXT_PRIMARY, fontFamily: Typography.fontFamily.heading, textAlign: 'center', lineHeight: 34, marginBottom: Spacing.md },
  counterText: { fontSize: Typography.fontSize.sm, color: TEXT_MUTED, fontFamily: Typography.fontFamily.primary },

  promptIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: ACCENT + '12', borderWidth: 1.5, borderColor: ACCENT + '25', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },

  inputCard: { width: '100%', backgroundColor: SURFACE, borderRadius: Radius.lg, borderWidth: 1, borderColor: BORDER, marginBottom: Spacing.lg, overflow: 'hidden' },
  input: { padding: Spacing.md, fontSize: Typography.fontSize.base, color: TEXT_PRIMARY, fontFamily: Typography.fontFamily.primary, minHeight: 80 },

  toneWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm, marginBottom: Spacing['2xl'] },

  anchorInstruction: { fontSize: 24, fontWeight: Typography.fontWeight.semibold, color: TEXT_PRIMARY, fontFamily: Typography.fontFamily.heading, textAlign: 'center', lineHeight: 34, marginBottom: Spacing['2xl'] },
  anchorCard: { backgroundColor: SURFACE, borderRadius: Radius.xl, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, borderWidth: 1, borderColor: BORDER, marginBottom: Spacing.lg, width: '100%' },
  anchorQuote: { fontSize: 36, color: ACCENT + '30', fontFamily: Typography.fontFamily.heading, lineHeight: 36 },
  anchorSentence: { fontSize: 22, fontWeight: Typography.fontWeight.medium, fontFamily: Typography.fontFamily.heading, textAlign: 'center', fontStyle: 'italic', paddingVertical: Spacing.sm },

  timerRing: { width: 64, height: 64, borderRadius: 32, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  timerNum: { fontSize: 24, fontWeight: Typography.fontWeight.bold, fontFamily: Typography.fontFamily.heading },

  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: ACCENT, borderRadius: Radius.md, paddingVertical: 14, paddingHorizontal: Spacing.xl },
  primaryBtnText: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: '#fff', fontFamily: Typography.fontFamily.primary },
});
