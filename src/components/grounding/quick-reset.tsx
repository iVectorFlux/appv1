/**
 * Quick Reset - Mode 1 (60 seconds, auto-complete)
 *
 * Steps:
 *  1. Physiological sigh breathing with high-end Lotus visualizer (3 cycles ≈ 30s)
 *  2. "Name 3 objects you can see" glass card prompt (15s)
 *  3. "Press feet into floor" ground hold glass card prompt (10s)
 *
 * Highly refined dark immersive background, sleek glassmorphic transitions.
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
import { Spacing, Typography, Radius, useColors } from '@/constants/design-tokens';
import type { GroundingModeProps } from '@/types/grounding';
import { PHYSIOLOGICAL_SIGH_PATTERN } from '@/data/grounding-content';
import { PhotonBreathCluster } from '@/components/grounding/photon-breath-cluster';
import { GlassCard } from '@/components/ui/glass-card';

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
const SURFACE = 'rgba(255,255,255,0.04)';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT_PRIMARY = '#E2E8F0';
const TEXT_MUTED = '#94A3B8';

const PHASE_INFO: Record<BreathPhase, { label: string; sub: string; timing: string; color: string }> = {
  in:   { label: 'Breathe in',          sub: 'Through your nose',          timing: `${PHYSIOLOGICAL_SIGH_PATTERN.inhale}s`, color: '#38bdf8' },
  hold: { label: 'Top-up inhale',       sub: 'A short second breath',      timing: `${PHYSIOLOGICAL_SIGH_PATTERN.sighInhale}s`, color: '#a78bfa' },
  out:  { label: 'Long exhale',         sub: 'Release through mouth',      timing: `${PHYSIOLOGICAL_SIGH_PATTERN.exhale}s`, color: '#fb923c' },
};

const STEP_LABELS: Record<Step, string> = {
  breathe: 'Step 1 of 3 · Breathing',
  anchor:  'Step 2 of 3 · Visual Anchor',
  ground:  'Step 3 of 3 · Grounding',
};

export function QuickReset({ onComplete, onExit }: GroundingModeProps) {
  const colors = useColors();
  const [step, setStep]             = useState<Step>('breathe');
  const [breathPhase, setBreathPhase] = useState<BreathPhase>('in');
  const [breathCycle, setBreathCycle] = useState(0);
  const [countdown, setCountdown]   = useState(0);

  const textFade    = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseRing = useRef(new Animated.Value(1)).current;
  const startTime   = useRef(Date.now());

  // Ambient aura animation for Step 2 & 3
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

  // Overall session progress bar
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
      if (cycle >= BREATH_CYCLES) { fadeToStep('anchor'); return; }
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
  const activeColor = step === 'breathe' ? pi.color : step === 'anchor' ? '#38bdf8' : '#34d399';

  return (
    <View style={s.container}>
      <LinearGradient
        colors={[BG, '#080d1a', BG]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Atmospheric dynamic color glow aura */}
      <View style={[s.accentGlow, { backgroundColor: activeColor }]} />

      {/* Top overall progress track */}
      <View style={s.progressTrack}>
        <Animated.View
          style={[
            s.progressFill,
            {
              width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
              backgroundColor: activeColor,
            },
          ]}
        />
      </View>

      {/* Navigation Top Bar */}
      <View style={s.header}>
        <TouchableOpacity onPress={onExit} hitSlop={16} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>
          Physiological Sigh
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={s.topStepBlock}>
        <View style={s.stepRowInline}>
          <Text style={s.stepMeta} accessibilityLiveRegion="polite" numberOfLines={1}>
            {step === 'breathe' ? 'Step 1 of 3 · Breathing' : step === 'anchor' ? 'Step 2 of 3 · Visual Anchor' : 'Step 3 of 3 · Grounding'}
          </Text>
          <View style={s.phaseSegRow}>
            {['breathe', 'anchor', 'ground'].map((st, i) => {
              const activeIdx = ['breathe', 'anchor', 'ground'].indexOf(step);
              return (
                <View key={st} style={[s.phaseSeg, i <= activeIdx && { backgroundColor: activeColor, opacity: 0.85 }]} />
              );
            })}
          </View>
        </View>
      </View>

      {/* Screen step transitions container */}
      <Animated.View style={[s.center, { opacity: textFade }]}>

        {step === 'breathe' && (
          <View style={s.stepContainer}>
            {/* Embedded iOS Lotus Breathe Visualizer */}
            <View style={s.orbWrap}>
              <PhotonBreathCluster
                visualKey={`quick-reset-${breathCycle}-${breathPhase}`}
                durationMs={breathPhase === 'in' ? BREATH.inhale : breathPhase === 'hold' ? BREATH.hold : BREATH.exhale}
                orb={breathPhase === 'in' ? 'expand' : breathPhase === 'hold' ? 'expandFurther' : 'contract'}
                accent={pi.color}
              />
            </View>

            <View style={s.breathInfo}>
              <Text style={s.breathLabel}>{pi.label}</Text>
              <Text style={s.breathSub}>{pi.sub}</Text>

              <View style={s.metaRow}>
                <View style={[s.metaPill, { borderColor: pi.color + '30', backgroundColor: pi.color + '0a' }]}>
                  <Text style={[s.metaPillText, { color: pi.color }]}>{pi.timing}</Text>
                </View>
                <View style={[s.metaPill, { borderColor: BORDER, backgroundColor: SURFACE }]}>
                  <Text style={[s.metaPillText, { color: TEXT_MUTED }]}>
                    Breath {breathCycle + 1} / {BREATH_CYCLES}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {step === 'anchor' && (
          <GlassCard style={s.glassContainer} tint="dark" backgroundColor="rgba(255, 255, 255, 0.03)" borderColor="rgba(255, 255, 255, 0.08)">
            <View style={s.iconGlowWrapper}>
              <Animated.View style={[s.glowRingOutline, { borderColor: '#38bdf840', transform: [{ scale: pulseRing }] }]} />
              <View style={[s.promptIcon, { backgroundColor: '#38bdf812', borderColor: '#38bdf825' }]}>
                <Ionicons name="eye-outline" size={32} color="#38bdf8" />
              </View>
            </View>
            <Text style={s.promptText}>Name 3 objects{'\n'}you can see right now</Text>
            <Text style={s.promptHint}>Look around your environment slowly.</Text>

            <View style={[s.timerRing, { borderColor: '#38bdf825' }]}>
              <Text style={[s.timerNum, { color: '#38bdf8' }]}>{countdown}</Text>
            </View>
          </GlassCard>
        )}

        {step === 'ground' && (
          <GlassCard style={s.glassContainer} tint="dark" backgroundColor="rgba(255, 255, 255, 0.03)" borderColor="rgba(255, 255, 255, 0.08)">
            <View style={s.iconGlowWrapper}>
              <Animated.View style={[s.glowRingOutline, { borderColor: '#34d39940', transform: [{ scale: pulseRing }] }]} />
              <View style={[s.promptIcon, { backgroundColor: '#34d39912', borderColor: '#34d39925' }]}>
                <Ionicons name="footsteps-outline" size={32} color="#34d399" />
              </View>
            </View>
            <Text style={s.promptText}>Press your feet{'\n'}firmly into the floor</Text>
            <Text style={s.promptHint}>Hold it. Feel the support beneath your feet.</Text>

            <View style={[s.timerRing, { borderColor: '#34d39925' }]}>
              <Text style={[s.timerNum, { color: '#34d399' }]}>{countdown}</Text>
            </View>
          </GlassCard>
        )}
      </Animated.View>
    </View>
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

  progressTrack: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.03)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  progressFill: { height: 2 },

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

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },

  stepContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },

  /* ── Visualizer Slots ─────────────────────────── */
  orbWrap: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },

  breathInfo: { alignItems: 'center', maxWidth: 320 },
  breathLabel: {
    fontSize: 28,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.heading,
    textAlign: 'center',
    color: TEXT_PRIMARY,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  breathSub: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.primary,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    opacity: 0.9,
  },
  metaRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', justifyContent: 'center' },
  metaPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  metaPillText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.primary,
    fontWeight: Typography.fontWeight.semibold,
  },

  /* ── Glassmorphic Cards ───────────────────────── */
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
    marginBottom: Spacing.lg,
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
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  promptText: {
    fontSize: 24,
    fontWeight: Typography.fontWeight.semibold,
    color: TEXT_PRIMARY,
    fontFamily: Typography.fontFamily.heading,
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: -0.3,
    marginBottom: Spacing.sm,
  },
  promptHint: {
    fontSize: Typography.fontSize.sm,
    color: TEXT_MUTED,
    fontFamily: Typography.fontFamily.primary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
    opacity: 0.8,
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
});
