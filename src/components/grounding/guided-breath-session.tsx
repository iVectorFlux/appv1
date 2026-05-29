/**
 * Combined regulation breathing: extended exhale + coherent + 4-7-8.
 * Segment order follows EmotionalTone (e.g. anger → extended exhale first).
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography, Radius } from '@/constants/design-tokens';
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
const SURFACE_SEG = 'rgba(255,255,255,0.06)';
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
      <LinearGradient colors={[BG, '#080d1a', BG]} style={StyleSheet.absoluteFill} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />

      {/* Dynamic ambient metal/color aura shifts based on current step */}
      <View style={[s.accentGlow, { backgroundColor: currentStep.color }]} />

      <View style={s.header}>
        <TouchableOpacity onPress={onExit} hitSlop={16} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={2}>
          {flowTitle(mode)}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {phaseTotal > 0 ? (
        <View style={s.topStepBlock} accessibilityRole="summary" accessibilityLabel={`Step ${phaseCurrent} of ${phaseTotal}`}>
          <View style={s.stepRowInline}>
            <Text style={s.stepMeta} accessibilityLiveRegion="polite" numberOfLines={1}>
              {phaseCurrent} / {phaseTotal}
            </Text>
            <View style={s.phaseSegRow}>
              {Array.from({ length: phaseTotal }, (_, i) => (
                <View
                  key={i}
                  style={[
                    s.phaseSeg,
                    i < phaseCurrent && { backgroundColor: currentStep.color, opacity: 0.8 },
                  ]}
                />
              ))}
            </View>
          </View>
        </View>
      ) : null}

      <View style={s.progressOuter}>
        <Animated.View style={[s.progressInner, { width: progressWidth, backgroundColor: currentStep.color }]} />
      </View>

      <View style={s.center}>
        <View style={s.orbSlot}>
          <PhotonBreathCluster
            visualKey={`${segmentIndex}-${cycle}-${stepIndex}-${currentStep.key}`}
            durationMs={currentStep.durationMs}
            orb={currentStep.orb}
            accent={currentStep.color}
          />
        </View>

        <View style={s.phaseLineRow} accessibilityRole="text" accessibilityLabel={`${currentStep.label}${tick > 0 && currentStep.durationMs >= 3000 ? `, ${tick} seconds` : ''}`}>
          <Text style={[s.phaseLabel, { color: TEXT_PRIMARY }]} numberOfLines={1}>
            {currentStep.label}
          </Text>
          {tick > 0 && currentStep.durationMs >= 3000 ? (
            <>
              <Text style={s.phaseSep} numberOfLines={1}>
                {' · '}
              </Text>
              <Text style={[s.phaseTick, { color: currentStep.color }]} numberOfLines={1}>
                {tick}
              </Text>
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  error: { color: TEXT_MUTED, textAlign: 'center', marginTop: 80, paddingHorizontal: Spacing.lg, fontFamily: Typography.fontFamily.primary },
  btn: { alignSelf: 'center', marginTop: Spacing.lg, padding: Spacing.md },
  btnText: { color: '#93C5FD', fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, fontFamily: Typography.fontFamily.primary },
  accentGlow: {
    position: 'absolute',
    top: -150,
    left: -100,
    right: -100,
    height: 520,
    borderRadius: 260,
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
    textTransform: 'uppercase',
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
    backgroundColor: SURFACE_SEG,
    opacity: 0.4,
  },
  progressOuter: {
    marginTop: Spacing.sm,
    marginHorizontal: Spacing.lg,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
  },
  progressInner: {
    height: 2,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg },
  orbSlot: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  phaseLineRow: {
    marginTop: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    flexWrap: 'nowrap',
    maxWidth: '100%',
    paddingHorizontal: Spacing.sm,
  },
  phaseLabel: {
    fontSize: 28,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.heading,
    flexShrink: 1,
    letterSpacing: -0.5,
  },
  phaseSep: {
    fontSize: 28,
    fontWeight: Typography.fontWeight.medium,
    color: 'rgba(255, 255, 255, 0.25)',
    fontFamily: Typography.fontFamily.heading,
  },
  phaseTick: {
    fontSize: 28,
    fontWeight: Typography.fontWeight.semibold,
    fontVariant: ['tabular-nums'],
    fontFamily: Typography.fontFamily.heading,
    letterSpacing: -0.5,
  },
});
