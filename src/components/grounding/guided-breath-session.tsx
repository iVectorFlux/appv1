/**
 * Guided standalone breath sessions (7 recommended techniques).
 * Dark immersive UI: orb (most patterns) or brisk counter (bellows).
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
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
import { Spacing, Typography } from '@/constants/design-tokens';
import type { GroundingMode, GroundingModeProps } from '@/types/grounding';
import {
  getGuidedBreathDefinition,
  type BreathPhaseStep,
  BREATH_TECHNIQUE_MODES,
} from '@/data/breathing-techniques';

const useND = Platform.OS !== 'web';

const BG = '#0C1222';
const TEXT_PRIMARY = '#E2E8F0';
const TEXT_MUTED = '#94A3B8';

export type GuidedBreathSessionProps = GroundingModeProps & { mode: GroundingMode };

function titleForMode(m: GroundingMode): string {
  return BREATH_TECHNIQUE_MODES.find((x) => x.id === m)?.label ?? 'Breathing';
}

function animateOrbForStep(
  step: BreathPhaseStep,
  scale: Animated.Value,
  durationMs: number,
  onEnd: () => void
): void {
  const d = Math.max(300, durationMs);
  switch (step.orb) {
    case 'expand':
      Animated.timing(scale, {
        toValue: 1.34,
        duration: d,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: useND,
      }).start(({ finished }) => finished && onEnd());
      break;
    case 'contract':
      Animated.timing(scale, {
        toValue: 1,
        duration: d,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: useND,
      }).start(({ finished }) => finished && onEnd());
      break;
    case 'holdHigh': {
      const up = Math.min(500, d * 0.12);
      Animated.timing(scale, {
        toValue: 1.38,
        duration: up,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: useND,
      }).start(() => {
        Animated.timing(scale, {
          toValue: 1.38,
          duration: Math.max(0, d - up),
          useNativeDriver: useND,
        }).start(({ finished }) => finished && onEnd());
      });
      break;
    }
    case 'holdLow': {
      const up = Math.min(500, d * 0.12);
      Animated.timing(scale, {
        toValue: 1,
        duration: up,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: useND,
      }).start(() => {
        Animated.timing(scale, {
          toValue: 1,
          duration: Math.max(0, d - up),
          useNativeDriver: useND,
        }).start(({ finished }) => finished && onEnd());
      });
      break;
    }
    case 'pulse':
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.14,
          duration: d * 0.45,
          easing: Easing.out(Easing.quad),
          useNativeDriver: useND,
        }),
        Animated.timing(scale, {
          toValue: 1.02,
          duration: d * 0.55,
          easing: Easing.in(Easing.quad),
          useNativeDriver: useND,
        }),
      ]).start(({ finished }) => finished && onEnd());
      break;
    default:
      onEnd();
  }
}

export function GuidedBreathSession({
  mode,
  onComplete,
  onExit,
  stressLevel: _stressLevel,
  emotionalTone: _emotionalTone,
}: GuidedBreathSessionProps) {
  const def = getGuidedBreathDefinition(mode);
  const title = titleForMode(mode);

  const scale = useRef(new Animated.Value(1)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const cancelled = useRef(false);
  const startRef = useRef(Date.now());
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [cycle, setCycle] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [tick, setTick] = useState(0);

  const totalMs = useMemo(() => {
    if (!def) return 1;
    return def.steps.reduce((a, s) => a + s.durationMs, 0) * def.cycles;
  }, [def]);

  const currentStep: BreathPhaseStep | null = def ? def.steps[stepIndex] ?? null : null;

  useEffect(() => {
    cancelled.current = false;
    startRef.current = Date.now();
    const definition = getGuidedBreathDefinition(mode);
    if (!definition) {
      onCompleteRef.current(0);
      return;
    }

    scale.setValue(1);
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 100,
      duration: Math.max(totalMs, 1000),
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    const playFrom = (c: number, si: number) => {
      if (cancelled.current) return;
      setCycle(c);
      setStepIndex(si);
      const step = definition.steps[si];
      if (!step) {
        onCompleteRef.current(Math.min(100, Math.round(((Date.now() - startRef.current) / totalMs) * 100)));
        return;
      }
      animateOrbForStep(step, scale, step.durationMs, () => {
        if (cancelled.current) return;
        const nextSi = si + 1;
        if (nextSi >= definition.steps.length) {
          const nextC = c + 1;
          if (nextC >= definition.cycles) {
            onCompleteRef.current(Math.min(100, Math.round(((Date.now() - startRef.current) / totalMs) * 100)));
            return;
          }
          playFrom(nextC, 0);
        } else {
          playFrom(c, nextSi);
        }
      });
    };

    playFrom(0, 0);

    return () => {
      cancelled.current = true;
    };
  }, [mode, scale, progress, totalMs]);

  useEffect(() => {
    if (!currentStep || def?.uiVariant === 'bellows') return;
    const sec = Math.ceil(currentStep.durationMs / 1000);
    setTick(sec);
    const iv = setInterval(() => {
      setTick((t) => (t <= 1 ? 0 : t - 1));
    }, 1000);
    const t = setTimeout(() => clearInterval(iv), currentStep.durationMs);
    return () => {
      clearInterval(iv);
      clearTimeout(t);
    };
  }, [currentStep, def?.uiVariant, cycle, stepIndex]);

  if (!def || !currentStep) {
    return (
      <View style={s.container}>
        <Text style={s.error}>This breathing mode is not available.</Text>
        <TouchableOpacity onPress={onExit} style={s.btn}>
          <Text style={s.btnText}>Leave</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isBellows = def.uiVariant === 'bellows';
  const globalIndex = cycle * def.steps.length + stepIndex + 1;
  const globalTotal = def.cycles * def.steps.length;

  const progressWidth = progress.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={s.container}>
      <LinearGradient colors={[BG, '#111827', BG]} style={StyleSheet.absoluteFill} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />

      <View style={[s.accentGlow, { backgroundColor: currentStep.color + '12' }]} />

      <View style={s.header}>
        <TouchableOpacity onPress={onExit} hitSlop={16} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.progressOuter}>
        <Animated.View style={[s.progressInner, { width: progressWidth }]} />
      </View>

      <View style={s.center}>
        {!isBellows ? (
          <View style={s.orbSlot}>
            <Animated.View
              style={[
                s.orbOuter,
                {
                  borderColor: currentStep.color + '44',
                  backgroundColor: currentStep.color + '10',
                  transform: [{ scale }],
                },
              ]}
            >
              <View style={[s.orbInner, { borderColor: currentStep.color + '66' }]} />
            </Animated.View>
            {tick > 0 && currentStep.durationMs >= 3000 ? (
              <Text style={s.countBig}>{tick}</Text>
            ) : null}
          </View>
        ) : (
          <View style={s.bellowsWrap}>
            <Text style={s.bellowsCount}>{globalIndex}</Text>
            <Text style={s.bellowsOf}>of {globalTotal}</Text>
            <View style={[s.bellowsPulse, { borderColor: currentStep.color + '55', backgroundColor: currentStep.color + '18' }]} />
          </View>
        )}

        <Text style={[s.phaseMain, { color: currentStep.color }]}>{currentStep.label}</Text>
        <Text style={s.phaseSub}>{currentStep.sub}</Text>
        {!isBellows ? (
          <Text style={s.cycleHint}>
            Cycle {cycle + 1} of {def.cycles}
          </Text>
        ) : (
          <Text style={s.cycleHint}>Stay light in the shoulders · stop if dizzy</Text>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  error: { color: TEXT_MUTED, textAlign: 'center', marginTop: 80, paddingHorizontal: Spacing.lg },
  btn: { alignSelf: 'center', marginTop: Spacing.lg, padding: Spacing.md },
  btnText: { color: '#93C5FD', fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold },
  accentGlow: {
    position: 'absolute',
    top: 0,
    left: '15%',
    right: '15%',
    height: 160,
    borderBottomLeftRadius: 120,
    borderBottomRightRadius: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: TEXT_PRIMARY,
    fontFamily: Typography.fontFamily.heading,
  },
  progressOuter: {
    marginTop: Spacing.sm,
    marginHorizontal: Spacing.md,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressInner: {
    height: 3,
    backgroundColor: '#38BDF8',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg },
  orbSlot: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
  orbOuter: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
    opacity: 0.9,
  },
  countBig: {
    position: 'absolute',
    fontSize: 44,
    fontWeight: Typography.fontWeight.bold,
    color: 'rgba(255,255,255,0.2)',
    fontVariant: ['tabular-nums'],
  },
  phaseMain: {
    fontSize: 26,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily.heading,
    marginBottom: Spacing.xs,
  },
  phaseSub: {
    fontSize: Typography.fontSize.sm,
    color: TEXT_MUTED,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 22,
  },
  cycleHint: { marginTop: Spacing.lg, fontSize: Typography.fontSize.xs, color: TEXT_MUTED, letterSpacing: 0.3 },
  bellowsWrap: { alignItems: 'center', marginBottom: Spacing.xl },
  bellowsCount: { fontSize: 56, fontWeight: Typography.fontWeight.bold, color: TEXT_PRIMARY, fontVariant: ['tabular-nums'] },
  bellowsOf: { fontSize: Typography.fontSize.sm, color: TEXT_MUTED, marginBottom: Spacing.md },
  bellowsPulse: { width: 100, height: 100, borderRadius: 50, borderWidth: 2 },
});
