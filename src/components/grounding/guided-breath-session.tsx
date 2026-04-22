/**
 * Combined regulation breathing: extended exhale + coherent + 4-7-8.
 * Segment order follows EmotionalTone (e.g. anger → extended exhale first).
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography } from '@/constants/design-tokens';
import type { GroundingMode, GroundingModeProps, EmotionalTone } from '@/types/grounding';
import {
  BREATH_TECHNIQUE_MODES,
  buildSegmentsForBreathMode,
  breathSessionTotalMs,
  isGuidedBreathMode,
  type BreathPhaseStep,
  type BreathSegment,
} from '@/data/breathing-techniques';
import { PhotonBreathCluster } from '@/components/grounding/photon-breath-cluster';

const BG = '#0C1222';
const TEXT_PRIMARY = '#E2E8F0';
const TEXT_MUTED = '#94A3B8';

export type GuidedBreathSessionProps = GroundingModeProps & { mode: GroundingMode };

function flowTitle(mode: GroundingMode): string {
  return BREATH_TECHNIQUE_MODES.find((x) => x.id === mode)?.label ?? 'Breathing';
}

function scheduleStepEnd(
  durationMs: number,
  cancelledRef: React.MutableRefObject<boolean>,
  onEnd: () => void
): ReturnType<typeof setTimeout> {
  return setTimeout(() => {
    if (cancelledRef.current) return;
    onEnd();
  }, Math.max(80, durationMs));
}

function totalGuidedPhaseSteps(segments: BreathSegment[]): number {
  return segments.reduce((sum, seg) => sum + seg.steps.length * seg.cycles, 0);
}

/** 1-based index of the phase currently on screen. */
function currentGuidedPhaseStep(
  segments: BreathSegment[],
  segmentIndex: number,
  cycle: number,
  stepIndex: number
): number {
  let n = 0;
  for (let s = 0; s < segmentIndex; s++) {
    const seg = segments[s]!;
    n += seg.steps.length * seg.cycles;
  }
  const cur = segments[segmentIndex];
  if (!cur) return 1;
  return n + cycle * cur.steps.length + stepIndex + 1;
}

export function GuidedBreathSession({
  mode,
  onComplete,
  onExit,
  stressLevel: _stressLevel,
  emotionalTone,
}: GuidedBreathSessionProps) {
  const segments = useMemo(
    () => (isGuidedBreathMode(mode) ? buildSegmentsForBreathMode(mode, emotionalTone ?? null) : []),
    [mode, emotionalTone]
  );
  const totalMs = useMemo(
    () => (isGuidedBreathMode(mode) ? breathSessionTotalMs(mode, emotionalTone ?? null) : 1),
    [mode, emotionalTone]
  );

  const progress = useRef(new Animated.Value(0)).current;
  const cancelled = useRef(false);
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef(Date.now());
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;

  const [segmentIndex, setSegmentIndex] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [tick, setTick] = useState(0);

  const currentSegment: BreathSegment | undefined = segments[segmentIndex];
  const currentStep: BreathPhaseStep | null =
    currentSegment && currentSegment.steps[stepIndex] ? currentSegment.steps[stepIndex]! : null;

  const phaseTotal = useMemo(() => totalGuidedPhaseSteps(segments), [segments]);
  const phaseCurrent = useMemo(
    () =>
      segments.length > 0
        ? currentGuidedPhaseStep(segments, segmentIndex, cycle, stepIndex)
        : 0,
    [segments, segmentIndex, cycle, stepIndex]
  );

  useEffect(() => {
    if (!isGuidedBreathMode(mode)) return;
    cancelled.current = false;
    startRef.current = Date.now();
    const segs = segmentsRef.current;
    if (segs.length === 0) {
      onCompleteRef.current(0);
      return;
    }

    if (stepTimerRef.current) {
      clearTimeout(stepTimerRef.current);
      stepTimerRef.current = null;
    }
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 100,
      duration: Math.max(totalMs, 1000),
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    const finish = () => {
      if (cancelled.current) return;
      onCompleteRef.current(Math.min(100, Math.round(((Date.now() - startRef.current) / totalMs) * 100)));
    };

    const playFrom = (segIdx: number, c: number, si: number) => {
      if (cancelled.current) return;
      const seg = segs[segIdx];
      if (!seg) {
        finish();
        return;
      }
      setSegmentIndex(segIdx);
      setCycle(c);
      setStepIndex(si);
      const step = seg.steps[si];
      if (!step) {
        finish();
        return;
      }
      if (stepTimerRef.current) {
        clearTimeout(stepTimerRef.current);
        stepTimerRef.current = null;
      }
      stepTimerRef.current = scheduleStepEnd(step.durationMs, cancelled, () => {
        stepTimerRef.current = null;
        if (cancelled.current) return;
        const nextSi = si + 1;
        if (nextSi >= seg.steps.length) {
          const nextC = c + 1;
          if (nextC >= seg.cycles) {
            const nextSeg = segIdx + 1;
            if (nextSeg >= segs.length) {
              finish();
              return;
            }
            playFrom(nextSeg, 0, 0);
          } else {
            playFrom(segIdx, nextC, 0);
          }
        } else {
          playFrom(segIdx, c, nextSi);
        }
      });
    };

    playFrom(0, 0, 0);

    return () => {
      cancelled.current = true;
      if (stepTimerRef.current) {
        clearTimeout(stepTimerRef.current);
        stepTimerRef.current = null;
      }
    };
  }, [mode, emotionalTone, progress, totalMs]);

  useEffect(() => {
    if (!currentStep) return;
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
  }, [currentStep, segmentIndex, cycle, stepIndex]);

  if (!isGuidedBreathMode(mode)) {
    return (
      <View style={s.container}>
        <Text style={s.error}>This breathing session is not available.</Text>
        <TouchableOpacity onPress={onExit} style={s.btn}>
          <Text style={s.btnText}>Leave</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentSegment || !currentStep) {
    return (
      <View style={s.container}>
        <Text style={s.error}>Nothing to play.</Text>
        <TouchableOpacity onPress={onExit} style={s.btn}>
          <Text style={s.btnText}>Leave</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
        <Text style={s.headerTitle} numberOfLines={2}>
          {flowTitle(mode)}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {phaseTotal > 0 ? (
        <View style={s.stepStrip}>
          <View style={s.phaseBarOuter} accessibilityRole="progressbar" accessibilityValue={{ now: phaseCurrent, min: 1, max: phaseTotal }}>
            <View style={[s.phaseBarInner, { width: `${(100 * phaseCurrent) / phaseTotal}%` }]} />
          </View>
          <Text style={s.stepCount} accessibilityLiveRegion="polite">
            {phaseCurrent} / {phaseTotal}
          </Text>
        </View>
      ) : null}

      <View style={s.progressOuter}>
        <Animated.View style={[s.progressInner, { width: progressWidth }]} />
      </View>

      <View style={s.center}>
        <View style={s.orbSlot}>
          <PhotonBreathCluster
            visualKey={`${segmentIndex}-${cycle}-${stepIndex}-${currentStep.key}`}
            durationMs={currentStep.durationMs}
            orb={currentStep.orb}
            accent={currentStep.color}
          />
          {tick > 0 && currentStep.durationMs >= 3000 ? <Text style={s.countBig}>{tick}</Text> : null}
        </View>

        <Text style={[s.phaseMain, { color: currentStep.color }]}>{currentStep.label}</Text>
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
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: TEXT_PRIMARY,
    fontFamily: Typography.fontFamily.heading,
    lineHeight: 20,
  },
  stepStrip: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  phaseBarOuter: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  phaseBarInner: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#38BDF8',
  },
  stepCount: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    color: TEXT_MUTED,
    fontWeight: '600',
    letterSpacing: 0.2,
    minWidth: 52,
    textAlign: 'right',
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
  orbSlot: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
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
});
