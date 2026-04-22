/**
 * Quick Reset - Mode 1 (60 seconds, auto-complete)
 *
 * Steps:
 *  1. Physiological sigh breathing with multi-ring orb (3 cycles ≈ 30s)
 *  2. "Name 3 objects you can see" text prompt (15s)
 *  3. "Press feet into floor" hold timer (10s)
 *
 * Dark immersive background, 5-ring breathing orb with color shifts.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography, Radius } from '@/constants/design-tokens';
import type { GroundingModeProps } from '@/types/grounding';
import { PHYSIOLOGICAL_SIGH_PATTERN } from '@/data/grounding-content';

const useND = Platform.OS !== 'web';

type Step = 'breathe' | 'anchor' | 'ground';
type BreathPhase = 'in' | 'hold' | 'out';

const BREATH = {
  inhale: PHYSIOLOGICAL_SIGH_PATTERN.inhale * 1000,
  hold:   PHYSIOLOGICAL_SIGH_PATTERN.sighInhale * 1000,
  exhale: PHYSIOLOGICAL_SIGH_PATTERN.exhale * 1000,
};
const BREATH_CYCLES = 3;
const ANCHOR_DURATION = 15_000;
const GROUND_DURATION = 10_000;
const TOTAL_DURATION =
  BREATH_CYCLES * (BREATH.inhale + BREATH.hold + BREATH.exhale) + ANCHOR_DURATION + GROUND_DURATION;

const BG = '#0C1222';
const SURFACE = 'rgba(255,255,255,0.06)';
const BORDER = 'rgba(255,255,255,0.10)';
const TEXT_PRIMARY = '#E2E8F0';
const TEXT_MUTED = '#64748B';

const PHASE_INFO: Record<BreathPhase, { label: string; sub: string; timing: string; color: string }> = {
  in:   { label: 'Breathe in',          sub: 'Through your nose',          timing: `${PHYSIOLOGICAL_SIGH_PATTERN.inhale}s`, color: '#6EA8FE' },
  hold: { label: 'Top-up inhale',       sub: 'A short second breath',      timing: `${PHYSIOLOGICAL_SIGH_PATTERN.sighInhale}s`, color: '#A78BFA' },
  out:  { label: 'Long exhale',         sub: 'Through your mouth',         timing: `${PHYSIOLOGICAL_SIGH_PATTERN.exhale}s`, color: '#F97316' },
};

const STEP_LABELS: Record<Step, string> = {
  breathe: 'Step 1 of 3 · Breathing',
  anchor:  'Step 2 of 3 · Visual Anchor',
  ground:  'Step 3 of 3 · Grounding',
};

export function QuickReset({ onComplete, onExit }: GroundingModeProps) {
  const [step, setStep]             = useState<Step>('breathe');
  const [breathPhase, setBreathPhase] = useState<BreathPhase>('in');
  const [breathCycle, setBreathCycle] = useState(0);
  const [countdown, setCountdown]   = useState(0);

  // Orb animations - 5 concentric rings
  const orbScale    = useRef(new Animated.Value(1)).current;
  const orbOpacity  = useRef(new Animated.Value(0.5)).current;
  const ring4Pulse  = useRef(new Animated.Value(1)).current;
  const ring5Pulse  = useRef(new Animated.Value(1)).current;
  const textFade    = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const startTime   = useRef(Date.now());

  // Memoised composite animated values
  const ring5Scale  = useMemo(() => Animated.multiply(orbScale, ring5Pulse), [orbScale, ring5Pulse]);
  const ring4Scale  = useMemo(() => Animated.multiply(orbScale, ring4Pulse), [orbScale, ring4Pulse]);
  const ring5Opa    = useMemo(() => Animated.multiply(orbOpacity, new Animated.Value(0.06)), [orbOpacity]);
  const ring4Opa    = useMemo(() => Animated.multiply(orbOpacity, new Animated.Value(0.10)), [orbOpacity]);
  const ring3Opa    = useMemo(() => Animated.multiply(orbOpacity, new Animated.Value(0.16)), [orbOpacity]);
  const ring2Opa    = useMemo(() => Animated.multiply(orbOpacity, new Animated.Value(0.28)), [orbOpacity]);

  // Ambient ring pulses (offset timing for organic feel)
  useEffect(() => {
    const p4 = Animated.loop(
      Animated.sequence([
        Animated.timing(ring4Pulse, { toValue: 1.06, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: useND }),
        Animated.timing(ring4Pulse, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: useND }),
      ]),
    );
    const p5 = Animated.loop(
      Animated.sequence([
        Animated.timing(ring5Pulse, { toValue: 1.08, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: useND }),
        Animated.timing(ring5Pulse, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: useND }),
      ]),
    );
    p4.start();
    p5.start();
    return () => { p4.stop(); p5.stop(); };
  }, [ring4Pulse, ring5Pulse]);

  // Progress bar
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: 100,
      duration: TOTAL_DURATION,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  }, [progressAnim]);

  const fadeToStep = useCallback(
    (next: Step) => {
      Animated.timing(textFade, { toValue: 0, duration: 300, useNativeDriver: useND }).start(() => {
        setStep(next);
        textFade.setValue(0);
        Animated.timing(textFade, { toValue: 1, duration: 400, useNativeDriver: useND }).start();
      });
    },
    [textFade],
  );

  const runBreathCycle = useCallback(
    (cycle: number) => {
      if (cycle >= BREATH_CYCLES) { fadeToStep('anchor'); return; }
      setBreathCycle(cycle);

      setBreathPhase('in');
      Animated.parallel([
        Animated.timing(orbScale, { toValue: 1.3, duration: BREATH.inhale, easing: Easing.inOut(Easing.cubic), useNativeDriver: useND }),
        Animated.timing(orbOpacity, { toValue: 0.88, duration: BREATH.inhale, useNativeDriver: useND }),
      ]).start(() => {
        setBreathPhase('hold');
        Animated.parallel([
          Animated.timing(orbScale, { toValue: 1.4, duration: BREATH.hold, easing: Easing.inOut(Easing.cubic), useNativeDriver: useND }),
          Animated.timing(orbOpacity, { toValue: 0.95, duration: BREATH.hold, useNativeDriver: useND }),
        ]).start(() => {
          setBreathPhase('out');
          Animated.parallel([
            Animated.timing(orbScale, { toValue: 1, duration: BREATH.exhale, easing: Easing.inOut(Easing.cubic), useNativeDriver: useND }),
            Animated.timing(orbOpacity, { toValue: 0.5, duration: BREATH.exhale, useNativeDriver: useND }),
          ]).start(() => runBreathCycle(cycle + 1));
        });
      });
    },
    [fadeToStep, orbOpacity, orbScale],
  );

  useEffect(() => { runBreathCycle(0); }, [runBreathCycle]);

  // Anchor countdown
  useEffect(() => {
    if (step !== 'anchor') return;
    setCountdown(Math.ceil(ANCHOR_DURATION / 1000));
    const iv = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(iv); fadeToStep('ground'); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [step, fadeToStep]);

  // Ground countdown
  useEffect(() => {
    if (step !== 'ground') return;
    setCountdown(Math.ceil(GROUND_DURATION / 1000));
    const iv = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(iv);
          onComplete(Math.min(100, Math.round(((Date.now() - startTime.current) / TOTAL_DURATION) * 100)));
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [step, onComplete]);

  const pi = PHASE_INFO[breathPhase];
  const orbColor = step === 'breathe' ? pi.color : '#6EA8FE';

  return (
    <View style={s.container}>
      <LinearGradient
        colors={[BG, '#111827', BG]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Subtle accent glow at top */}
      {step === 'breathe' && (
        <View style={[s.accentGlow, { backgroundColor: orbColor + '06' }]} />
      )}

      {/* Progress */}
      <View style={s.progressTrack}>
        <Animated.View
          style={[
            s.progressFill,
            {
              width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
              backgroundColor: orbColor,
            },
          ]}
        />
      </View>

      {/* Top bar */}
      <View style={s.topBar}>
        <Text style={s.stepLabel}>{STEP_LABELS[step]}</Text>
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

      {/* Content */}
      <Animated.View style={[s.center, { opacity: textFade }]}>

        {step === 'breathe' && (
          <>
            {/* 5-Ring Breathing Orb */}
            <View style={s.orbWrap}>
              {/* Ring 5 - outermost, slowest pulse */}
              <Animated.View
                style={[
                  s.ring5,
                  { backgroundColor: orbColor, transform: [{ scale: ring5Scale }], opacity: ring5Opa },
                ]}
              />
              {/* Ring 4 */}
              <Animated.View
                style={[
                  s.ring4,
                  { backgroundColor: orbColor, transform: [{ scale: ring4Scale }], opacity: ring4Opa },
                ]}
              />
              {/* Ring 3 */}
              <Animated.View
                style={[
                  s.ring3,
                  { backgroundColor: orbColor, transform: [{ scale: orbScale }], opacity: ring3Opa },
                ]}
              />
              {/* Ring 2 */}
              <Animated.View
                style={[
                  s.ring2,
                  { backgroundColor: orbColor, transform: [{ scale: orbScale }], opacity: ring2Opa },
                ]}
              />
              {/* Core */}
              <Animated.View
                style={[
                  s.core,
                  {
                    backgroundColor: orbColor,
                    transform: [{ scale: orbScale }],
                    opacity: orbOpacity,
                    ...(Platform.OS === 'ios'
                      ? { shadowColor: orbColor, shadowOpacity: 0.6, shadowRadius: 30, shadowOffset: { width: 0, height: 0 } }
                      : {}),
                  },
                ]}
              />
            </View>

            <View style={s.breathInfo}>
              <Text style={[s.breathLabel, { color: TEXT_PRIMARY }]}>{pi.label}</Text>
              <Text style={[s.breathSub, { color: 'rgba(255,255,255,0.40)' }]}>{pi.sub}</Text>
              <View style={s.metaRow}>
                <View style={[s.metaPill, { borderColor: pi.color + '40', backgroundColor: pi.color + '12' }]}>
                  <Text style={[s.metaPillText, { color: pi.color }]}>{pi.timing}</Text>
                </View>
                <View style={[s.metaPill, { borderColor: BORDER, backgroundColor: SURFACE }]}>
                  <Text style={[s.metaPillText, { color: TEXT_MUTED }]}>
                    Breath {breathCycle + 1}/{BREATH_CYCLES}
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}

        {step === 'anchor' && (
          <>
            <View style={s.promptIcon}>
              <Ionicons name="eye-outline" size={40} color="#6EA8FE" />
            </View>
            <Text style={s.promptText}>Name 3 objects{'\n'}you can see right now</Text>
            <Text style={s.promptHint}>Look around slowly</Text>
            <View style={[s.timerRing, { borderColor: '#6EA8FE40' }]}>
              <Text style={[s.timerNum, { color: '#6EA8FE' }]}>{countdown}</Text>
            </View>
          </>
        )}

        {step === 'ground' && (
          <>
            <View style={s.promptIcon}>
              <Ionicons name="footsteps-outline" size={40} color="#34D399" />
            </View>
            <Text style={s.promptText}>Press your feet{'\n'}firmly into the floor</Text>
            <Text style={s.promptHint}>Hold it. Feel the ground beneath you.</Text>
            <View style={[s.timerRing, { borderColor: '#34D39940' }]}>
              <Text style={[s.timerNum, { color: '#34D399' }]}>{countdown}</Text>
            </View>
          </>
        )}
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  accentGlow: {
    position: 'absolute',
    top: -120,
    left: '10%',
    width: '80%',
    height: 340,
    borderRadius: 170,
  },

  progressTrack: {
    height: 3,
    backgroundColor: SURFACE,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  progressFill: { height: 3, borderRadius: 2 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
    zIndex: 10,
  },
  stepLabel: {
    fontSize: Typography.fontSize.sm,
    color: TEXT_MUTED,
    fontFamily: Typography.fontFamily.primary,
    fontWeight: Typography.fontWeight.medium,
  },
  closeBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },

  /* ── Orb ─────────────────────────────────────────── */
  orbWrap: {
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  ring5: { position: 'absolute', width: 280, height: 280, borderRadius: 140 },
  ring4: { position: 'absolute', width: 240, height: 240, borderRadius: 120 },
  ring3: { position: 'absolute', width: 200, height: 200, borderRadius: 100 },
  ring2: { position: 'absolute', width: 160, height: 160, borderRadius: 80  },
  core:  { width: 120, height: 120, borderRadius: 60  },

  breathInfo: { alignItems: 'center', maxWidth: 320 },
  breathLabel: {
    fontSize: 26,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily.heading,
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 4,
  },
  breathSub: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.primary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  metaRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', justifyContent: 'center' },
  metaPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  metaPillText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.primary,
    fontWeight: Typography.fontWeight.semibold,
  },

  /* ── Anchor / Ground ────────────────────────────── */
  promptIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(110,168,254,0.10)',
    borderWidth: 1.5,
    borderColor: 'rgba(110,168,254,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  promptText: {
    fontSize: 26,
    fontWeight: Typography.fontWeight.semibold,
    color: TEXT_PRIMARY,
    fontFamily: Typography.fontFamily.heading,
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: Spacing.md,
  },
  promptHint: {
    fontSize: Typography.fontSize.base,
    color: TEXT_MUTED,
    fontFamily: Typography.fontFamily.primary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  timerRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerNum: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily.heading,
  },
});
