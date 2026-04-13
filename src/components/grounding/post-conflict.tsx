/**
 * Post-Conflict Reset — Mode 5 (4-6 min)
 *
 * Steps:
 *  1. Label emotion — selection buttons with glow
 *  2. Locate in body — body area tags
 *  3. Breath release — 3 slow breaths with atmospheric orb
 *  4. Fact vs interpretation — two text prompts
 *
 * Dark immersive background, slower pacing, atmospheric orb.
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
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography, Radius } from '@/constants/design-tokens';
import { POST_CONFLICT_EMOTIONS, POST_CONFLICT_STEPS } from '@/data/grounding-content';
import type { GroundingModeProps } from '@/types/grounding';
import { TagChip } from '@/components/ui/tag-chip';

const useND = Platform.OS !== 'web';

type Step = 'label' | 'locate' | 'breathe' | 'reframe';

const BODY_LOCATIONS = POST_CONFLICT_STEPS[1].bodyPrompts;
const BREATH = { inhale: 4000, hold: 2000, exhale: 6000 };
const BREATH_CYCLES = 3;
const STEP_ORDER: Step[] = ['label', 'locate', 'breathe', 'reframe'];

const BG = '#0C1222';
const SURFACE = 'rgba(255,255,255,0.06)';
const BORDER = 'rgba(255,255,255,0.10)';
const TEXT_PRIMARY = '#E2E8F0';
const TEXT_MUTED = '#64748B';
const ACCENT = '#F472B6';

export function PostConflict({ onComplete, onExit }: GroundingModeProps) {
  const [step, setStep] = useState<Step>('label');
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [selectedBody, setSelectedBody] = useState<string | null>(null);
  const [breathPhase, setBreathPhase] = useState<'in' | 'hold' | 'out'>('in');
  const [breathCycle, setBreathCycle] = useState(0);
  const [factText, setFactText] = useState('');
  const [storyText, setStoryText] = useState('');
  const [breathTimingLabel, setBreathTimingLabel] = useState('Inhale · 4s');

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
        Animated.timing(ring3Pulse, { toValue: 1.06, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: useND }),
        Animated.timing(ring3Pulse, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: useND }),
      ]),
    );
    const p4 = Animated.loop(
      Animated.sequence([
        Animated.timing(ring4Pulse, { toValue: 1.1, duration: 3400, easing: Easing.inOut(Easing.sin), useNativeDriver: useND }),
        Animated.timing(ring4Pulse, { toValue: 1, duration: 3400, easing: Easing.inOut(Easing.sin), useNativeDriver: useND }),
      ]),
    );
    p3.start();
    p4.start();
    return () => { p3.stop(); p4.stop(); };
  }, [ring3Pulse, ring4Pulse]);

  const fadeToStep = useCallback(
    (next: Step) => {
      Animated.timing(textFade, { toValue: 0, duration: 400, useNativeDriver: useND }).start(() => {
        setStep(next);
        textFade.setValue(0);
        Animated.timing(textFade, { toValue: 1, duration: 500, useNativeDriver: useND }).start();
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
      Animated.parallel([
        Animated.timing(orbScale, { toValue: 1.3, duration: BREATH.inhale, easing: Easing.inOut(Easing.cubic), useNativeDriver: useND }),
        Animated.timing(orbOpacity, { toValue: 0.88, duration: BREATH.inhale, useNativeDriver: useND }),
      ]).start(() => {
        setBreathPhase('hold');
        setBreathTimingLabel('Hold · 2s');
        setTimeout(() => {
          setBreathPhase('out');
          setBreathTimingLabel('Exhale · 6s');
          Animated.parallel([
            Animated.timing(orbScale, { toValue: 1, duration: BREATH.exhale, easing: Easing.inOut(Easing.cubic), useNativeDriver: useND }),
            Animated.timing(orbOpacity, { toValue: 0.5, duration: BREATH.exhale, useNativeDriver: useND }),
          ]).start(() => runBreathCycle(cycle + 1));
        }, BREATH.hold);
      });
    },
    [fadeToStep, orbScale, orbOpacity],
  );

  useEffect(() => { if (step === 'breathe') runBreathCycle(0); }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const orbColor = breathPhase === 'out' ? '#F97316' : breathPhase === 'hold' ? '#A78BFA' : '#6EA8FE';
  const phaseLabel = breathPhase === 'in' ? 'Breathe in deeply' : breathPhase === 'hold' ? 'Hold gently' : 'Let it all out';

  return (
    <View style={s.container}>
      <LinearGradient colors={[BG, '#111827', BG]} style={StyleSheet.absoluteFill} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />

      <View style={s.topBar}>
        <Text style={s.stepLabel}>
          {step === 'label' ? 'Step 1 of 4 · Name It' : step === 'locate' ? 'Step 2 of 4 · Locate It' : step === 'breathe' ? 'Step 3 of 4 · Release' : 'Step 4 of 4 · Reframe'}
        </Text>
        <TouchableOpacity style={s.closeBtn} onPress={onExit} hitSlop={12}>
          <Ionicons name="close" size={22} color={TEXT_MUTED} />
        </TouchableOpacity>
      </View>

      <View style={s.progressRow}>
        {STEP_ORDER.map((st, i) => (
          <View key={st} style={[s.progressSeg, i <= currentStepIdx && { backgroundColor: ACCENT }]} />
        ))}
      </View>

      <Animated.View style={[s.center, { opacity: textFade }]}>

        {step === 'label' && (
          <>
            <Text style={s.heading}>What are you feeling{'\n'}right now?</Text>
            <Text style={s.subheading}>Choose the closest match</Text>
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
              activeOpacity={0.8}
              disabled={!selectedEmotion}
            >
              <Text style={s.primaryBtnText}>Next</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </>
        )}

        {step === 'locate' && (
          <>
            <View style={s.promptIcon}><Ionicons name="body-outline" size={40} color={ACCENT} /></View>
            <Text style={s.heading}>Where do you feel this{'\n'}in your body?</Text>
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
              activeOpacity={0.8}
              disabled={!selectedBody}
            >
              <Text style={s.primaryBtnText}>Next</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </>
        )}

        {step === 'breathe' && (
          <>
            <View style={s.orbWrap}>
              <Animated.View style={[s.ring4, { backgroundColor: orbColor, transform: [{ scale: ring4Scale }], opacity: ring4Opa }]} />
              <Animated.View style={[s.ring3, { backgroundColor: orbColor, transform: [{ scale: ring3Scale }], opacity: ring3Opa }]} />
              <Animated.View style={[s.ring2, { backgroundColor: orbColor, transform: [{ scale: orbScale }], opacity: ring2Opa }]} />
              <Animated.View
                style={[
                  s.orbCore,
                  {
                    backgroundColor: orbColor,
                    transform: [{ scale: orbScale }],
                    opacity: orbOpacity,
                    ...(Platform.OS === 'ios' ? { shadowColor: orbColor, shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 0 } } : {}),
                  },
                ]}
              />
            </View>
            <Text style={s.heading}>{phaseLabel}</Text>
            <Text style={[s.breathTiming, { color: orbColor }]}>{breathTimingLabel}</Text>
            <Text style={s.counterText}>Breath {breathCycle + 1} of {BREATH_CYCLES}</Text>
          </>
        )}

        {step === 'reframe' && (
          <ScrollView
            style={{ flex: 1, width: '100%' }}
            contentContainerStyle={{ alignItems: 'center', paddingBottom: Spacing['5xl'] }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[s.heading, { marginTop: Spacing.xl }]}>Separate fact from story</Text>
            <Text style={s.subheading}>This helps you see clearly</Text>

            <View style={s.inputCard}>
              <Text style={s.inputLabel}>What actually happened?</Text>
              <TextInput
                value={factText}
                onChangeText={setFactText}
                placeholder="Just the facts — no judgment"
                placeholderTextColor={TEXT_MUTED}
                style={s.input}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={[s.inputCard, { marginTop: Spacing.md }]}>
              <Text style={s.inputLabel}>What story am I telling myself?</Text>
              <TextInput
                value={storyText}
                onChangeText={setStoryText}
                placeholder="The interpretation, the assumptions"
                placeholderTextColor={TEXT_MUTED}
                style={s.input}
                multiline
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity style={[s.primaryBtn, { marginTop: Spacing['2xl'] }]} onPress={() => onComplete(100)} activeOpacity={0.8}>
              <Text style={s.primaryBtnText}>Finish</Text>
              <Ionicons name="checkmark" size={18} color="#fff" />
            </TouchableOpacity>

            <Text style={s.privacyNote}>Nothing is saved. This space is just for you.</Text>
          </ScrollView>
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

  heading: { fontSize: 24, fontWeight: Typography.fontWeight.semibold, color: TEXT_PRIMARY, fontFamily: Typography.fontFamily.heading, textAlign: 'center', lineHeight: 34, marginBottom: Spacing.sm },
  subheading: { fontSize: Typography.fontSize.base, color: TEXT_MUTED, fontFamily: Typography.fontFamily.primary, textAlign: 'center', marginBottom: Spacing.lg },
  counterText: { fontSize: Typography.fontSize.sm, color: TEXT_MUTED, fontFamily: Typography.fontFamily.primary },

  promptIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: ACCENT + '12', borderWidth: 1.5, borderColor: ACCENT + '25', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },

  orbWrap: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
  ring4: { position: 'absolute', width: 220, height: 220, borderRadius: 110 },
  ring3: { position: 'absolute', width: 185, height: 185, borderRadius: 93 },
  ring2: { position: 'absolute', width: 150, height: 150, borderRadius: 75 },
  orbCore: { width: 110, height: 110, borderRadius: 55 },

  breathTiming: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, fontFamily: Typography.fontFamily.primary, marginTop: Spacing.xs, marginBottom: Spacing.sm },

  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm, marginBottom: Spacing['2xl'], maxWidth: 360 },

  inputCard: { width: '100%', backgroundColor: SURFACE, borderRadius: Radius.lg, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  inputLabel: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, color: TEXT_MUTED, fontFamily: Typography.fontFamily.primary, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  input: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, paddingTop: Spacing.sm, fontSize: Typography.fontSize.base, color: TEXT_PRIMARY, fontFamily: Typography.fontFamily.primary, minHeight: 80 },
  privacyNote: { fontSize: Typography.fontSize.xs, color: TEXT_MUTED, fontFamily: Typography.fontFamily.primary, textAlign: 'center', marginTop: Spacing.xl },

  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: ACCENT, borderRadius: Radius.md, paddingVertical: 14, paddingHorizontal: Spacing.xl },
  primaryBtnText: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: '#fff', fontFamily: Typography.fontFamily.primary },
});
