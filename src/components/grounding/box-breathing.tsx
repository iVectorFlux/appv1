/**
 * Box breathing - 4-5 min
 *
 * Steps:
 *  1. Box breathing 4-4-4-4 (4 cycles) - luminous square + edge glow
 *  2. Identity anchor - name / date / location
 *  3. Progressive muscle tension release (clench + release × 3)
 *
 * Dark immersive background with glowing animated square.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography, Radius } from '@/constants/design-tokens';
import { BOX_BREATHING_STEPS } from '@/data/grounding-content';
import type { GroundingModeProps } from '@/types/grounding';

const useND = Platform.OS !== 'web';
const { width: SCREEN_W } = Dimensions.get('window');

type Step = 'box_breathe' | 'identity' | 'release';

const BOX_SIDE_MS = 4000;
const BOX_CYCLES = 4;
const IDENTITY_PROMPTS = BOX_BREATHING_STEPS[1].prompts;
const RELEASE_CYCLES = 3;
const RELEASE_HOLD = 5000;
const RELEASE_REST = 5000;

/* ── Visual constants ───────────────────────────────────── */

const BOX = Math.min(260, SCREEN_W - 120);
const CORNER_R = 28;
const DOT = 18;
const EDGE = 3.5;

const BG = '#0C1222';
const SURFACE = 'rgba(255,255,255,0.06)';
const BORDER = 'rgba(255,255,255,0.10)';
const TEXT_PRIMARY = '#E2E8F0';
const TEXT_MUTED = '#64748B';

type Phase = 'in' | 'hold' | 'out' | 'holdEmpty';

const PHASE: Record<Phase, { main: string; sub: string; color: string }> = {
  in:        { main: 'Inhale',  sub: 'Fill your lungs slowly',  color: '#6EA8FE' },
  hold:      { main: 'Hold',    sub: 'Keep it gentle',          color: '#A78BFA' },
  out:       { main: 'Exhale',  sub: 'Release completely',      color: '#34D399' },
  holdEmpty: { main: 'Hold',    sub: 'Rest in the stillness',   color: '#94A3B8' },
};

const PHASE_ORDER: Phase[] = ['in', 'hold', 'out', 'holdEmpty'];
const HALF = BOX / 2;

/* ── Luminous Square ────────────────────────────────────── */

function LuminousSquare({
  phaseIndex,
  traceProgress,
  phaseColor,
  ambientPulse,
  children,
}: {
  phaseIndex: number;
  traceProgress: Animated.Value;
  phaseColor: string;
  ambientPulse: Animated.Value;
  children: React.ReactNode;
}) {
  const corners = [
    { x: -HALF, y: -HALF },
    { x: HALF,  y: -HALF },
    { x: HALF,  y: HALF  },
    { x: -HALF, y: HALF  },
  ];

  const from = corners[phaseIndex];
  const to   = corners[(phaseIndex + 1) % 4];
  const dotOff = -DOT / 2;

  const translateX = traceProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [from.x, to.x],
  });
  const translateY = traceProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [from.y, to.y],
  });

  const activeOpacity = traceProgress.interpolate({
    inputRange: [0, 0.06, 0.5, 0.94, 1],
    outputRange: [0.25, 0.85, 1, 0.85, 0.25],
  });

  const edgeStyle = (idx: number) => {
    const isActive = idx === phaseIndex;
    const isComplete = idx < phaseIndex;
    const c = PHASE[PHASE_ORDER[idx]].color;
    return {
      backgroundColor: c,
      opacity: isActive ? activeOpacity : isComplete ? 0.55 : 0.07,
    };
  };

  return (
    <View style={sq.wrap}>
      {/* Ambient glow layers */}
      <Animated.View
        style={[
          sq.ambient1,
          { backgroundColor: phaseColor + '06', transform: [{ scale: ambientPulse }] },
        ]}
      />
      <Animated.View style={[sq.ambient2, { backgroundColor: phaseColor + '04' }]} />

      {/* The square container */}
      <View style={[sq.box, { borderColor: phaseColor + '18', backgroundColor: phaseColor + '05' }]}>
        {/* Edge glows */}
        <Animated.View style={[sq.edgeTop, edgeStyle(0)]} />
        <Animated.View style={[sq.edgeRight, edgeStyle(1)]} />
        <Animated.View style={[sq.edgeBottom, edgeStyle(2)]} />
        <Animated.View style={[sq.edgeLeft, edgeStyle(3)]} />

        {/* Corner dots */}
        {corners.map((c, i) => {
          const isNear = i === phaseIndex || i === (phaseIndex + 1) % 4;
          return (
            <View
              key={i}
              style={[
                sq.cornerDot,
                {
                  left: c.x + HALF - 3,
                  top: c.y + HALF - 3,
                  backgroundColor: isNear ? phaseColor : 'rgba(255,255,255,0.15)',
                  opacity: isNear ? 0.9 : 0.3,
                },
              ]}
            />
          );
        })}

        {/* Traveling dot */}
        <Animated.View
          style={[
            sq.dot,
            {
              left: HALF + dotOff,
              top: HALF + dotOff,
              backgroundColor: phaseColor,
              transform: [{ translateX }, { translateY }],
              ...(Platform.OS === 'ios'
                ? { shadowColor: phaseColor, shadowOpacity: 1, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } }
                : {}),
            },
          ]}
        />

        {/* Center content */}
        <View style={sq.center}>{children}</View>
      </View>
    </View>
  );
}

const sq = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ambient1: {
    position: 'absolute',
    width: BOX + 80,
    height: BOX + 80,
    borderRadius: CORNER_R + 30,
  },
  ambient2: {
    position: 'absolute',
    width: BOX + 44,
    height: BOX + 44,
    borderRadius: CORNER_R + 16,
  },
  box: {
    width: BOX,
    height: BOX,
    borderRadius: CORNER_R,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  edgeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: EDGE,
    borderTopLeftRadius: CORNER_R,
    borderTopRightRadius: CORNER_R,
  },
  edgeRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: EDGE,
    borderTopRightRadius: CORNER_R,
    borderBottomRightRadius: CORNER_R,
  },
  edgeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: EDGE,
    borderBottomLeftRadius: CORNER_R,
    borderBottomRightRadius: CORNER_R,
  },
  edgeLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: EDGE,
    borderTopLeftRadius: CORNER_R,
    borderBottomLeftRadius: CORNER_R,
  },
  cornerDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dot: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    zIndex: 5,
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
});

/* ── Main Component ─────────────────────────────────────── */

export function BoxBreathing({ onComplete, onExit }: GroundingModeProps) {
  const [step, setStep] = useState<Step>('box_breathe');
  const [boxPhase, setBoxPhase] = useState<Phase>('in');
  const [boxCycle, setBoxCycle] = useState(0);
  const [identityIdx, setIdentityIdx] = useState(0);
  const [releaseCycle, setReleaseCycle] = useState(0);
  const [releasePhase, setReleasePhase] = useState<'clench' | 'release'>('clench');
  const [countdown, setCountdown] = useState(BOX_SIDE_MS / 1000);

  const textFade = useRef(new Animated.Value(1)).current;
  const traceProgress = useRef(new Animated.Value(0)).current;
  const ambientPulse = useRef(new Animated.Value(1)).current;
  const releaseScale = useRef(new Animated.Value(1)).current;

  const phaseIndex = PHASE_ORDER.indexOf(boxPhase);
  const pc = PHASE[boxPhase];

  // Ambient pulse loop
  useEffect(() => {
    const p = Animated.loop(
      Animated.sequence([
        Animated.timing(ambientPulse, { toValue: 1.06, duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: useND }),
        Animated.timing(ambientPulse, { toValue: 1, duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: useND }),
      ]),
    );
    p.start();
    return () => p.stop();
  }, [ambientPulse]);

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

  const runBoxCycle = useCallback(
    (cycle: number) => {
      if (cycle >= BOX_CYCLES) { fadeToStep('identity'); return; }
      setBoxCycle(cycle);
      let phaseIdx = 0;

      const nextPhase = () => {
        if (phaseIdx >= PHASE_ORDER.length) { runBoxCycle(cycle + 1); return; }
        const phase = PHASE_ORDER[phaseIdx];
        setBoxPhase(phase);
        traceProgress.setValue(0);

        let secsLeft = BOX_SIDE_MS / 1000;
        setCountdown(secsLeft);
        const iv = setInterval(() => {
          secsLeft -= 1;
          setCountdown(Math.max(0, secsLeft));
          if (secsLeft <= 0) clearInterval(iv);
        }, 1000);

        Animated.timing(traceProgress, {
          toValue: 1,
          duration: BOX_SIDE_MS,
          easing: Easing.linear,
          useNativeDriver: useND,
        }).start(({ finished }) => {
          clearInterval(iv);
          if (finished) { phaseIdx++; nextPhase(); }
        });
      };
      nextPhase();
    },
    [fadeToStep, traceProgress],
  );

  useEffect(() => { runBoxCycle(0); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Identity anchor
  const advanceIdentity = useCallback(() => {
    const nextIdx = identityIdx + 1;
    if (nextIdx >= IDENTITY_PROMPTS.length) { fadeToStep('release'); return; }
    Animated.timing(textFade, { toValue: 0, duration: 200, useNativeDriver: useND }).start(() => {
      setIdentityIdx(nextIdx);
      textFade.setValue(0);
      Animated.timing(textFade, { toValue: 1, duration: 300, useNativeDriver: useND }).start();
    });
  }, [identityIdx, fadeToStep, textFade]);

  // Tension release with pulsing animation
  const runReleaseCycle = useCallback(
    (cycle: number) => {
      if (cycle >= RELEASE_CYCLES) { onComplete(100); return; }
      setReleaseCycle(cycle);
      setReleasePhase('clench');
      setCountdown(Math.ceil(RELEASE_HOLD / 1000));

      // Squeeze animation
      Animated.timing(releaseScale, { toValue: 0.88, duration: 600, easing: Easing.inOut(Easing.cubic), useNativeDriver: useND }).start();

      let secs = Math.ceil(RELEASE_HOLD / 1000);
      const clenchIv = setInterval(() => {
        secs--;
        setCountdown(secs);
        if (secs <= 0) {
          clearInterval(clenchIv);
          setReleasePhase('release');
          setCountdown(Math.ceil(RELEASE_REST / 1000));

          // Expand animation
          Animated.sequence([
            Animated.timing(releaseScale, { toValue: 1.12, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: useND }),
            Animated.timing(releaseScale, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.cubic), useNativeDriver: useND }),
          ]).start();

          let rsecs = Math.ceil(RELEASE_REST / 1000);
          const releaseIv = setInterval(() => {
            rsecs--;
            setCountdown(rsecs);
            if (rsecs <= 0) { clearInterval(releaseIv); runReleaseCycle(cycle + 1); }
          }, 1000);
        }
      }, 1000);
    },
    [onComplete, releaseScale],
  );

  useEffect(() => { if (step === 'release') runReleaseCycle(0); }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const isClench = releasePhase === 'clench';
  const releaseColor = isClench ? '#F59E0B' : '#34D399';

  return (
    <View style={s.container}>
      <LinearGradient
        colors={[BG, '#111827', BG]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Top bar */}
      <View style={s.topBar}>
        <Text style={s.stepLabel}>
          {step === 'box_breathe' ? 'Step 1 of 3 · Box Breath' : step === 'identity' ? 'Step 2 of 3 · Identity Anchor' : 'Step 3 of 3 · Tension Release'}
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

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Animated.View style={[s.center, { opacity: textFade }]}>

          {/* ── BOX BREATHE ──────────────────────────────── */}
          {step === 'box_breathe' && (
            <>
              <LuminousSquare
                phaseIndex={phaseIndex}
                traceProgress={traceProgress}
                phaseColor={pc.color}
                ambientPulse={ambientPulse}
              >
                <Text style={[s.phaseMain, { color: pc.color }]}>{pc.main}</Text>
                <Text style={s.phaseSub}>{pc.sub}</Text>
                <View style={[s.countdownRing, { borderColor: pc.color + '35' }]}>
                  <Text style={[s.countdownNum, { color: pc.color }]}>{countdown}</Text>
                </View>
              </LuminousSquare>

              <View style={s.metaWrap}>
                <Text style={s.phaseHint}>4 in · 4 hold · 4 out · 4 hold</Text>
                <Text style={s.cycleText}>Breath {boxCycle + 1} of {BOX_CYCLES}</Text>
              </View>
            </>
          )}

          {/* ── IDENTITY ─────────────────────────────────── */}
          {step === 'identity' && (
            <>
              <View style={s.identityIcon}>
                <Ionicons name="person-outline" size={40} color="#6EA8FE" />
              </View>
              <Text style={s.directiveText}>{IDENTITY_PROMPTS[identityIdx]}</Text>
              <Text style={s.directiveSub}>Say it out loud or in your head</Text>
              <TouchableOpacity style={s.actionBtn} onPress={advanceIdentity} activeOpacity={0.8}>
                <Text style={s.actionBtnText}>{identityIdx < IDENTITY_PROMPTS.length - 1 ? 'Next' : 'Continue'}</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </>
          )}

          {/* ── RELEASE ──────────────────────────────────── */}
          {step === 'release' && (
            <>
              <View style={[s.releaseOuter, { backgroundColor: releaseColor + '08' }]}>
                <Animated.View
                  style={[
                    s.releaseCircle,
                    { borderColor: releaseColor + '50', backgroundColor: releaseColor + '12', transform: [{ scale: releaseScale }] },
                  ]}
                >
                  <Ionicons
                    name={isClench ? 'hand-left' : 'hand-left-outline'}
                    size={48}
                    color={releaseColor}
                  />
                </Animated.View>
              </View>

              <Text style={s.directiveText}>
                {isClench ? 'Clench your fists tight' : 'Release. Let it go.'}
              </Text>
              <Text style={s.directiveSub}>
                {isClench ? 'Hold for 5 seconds' : 'Rest for 5 seconds'}
              </Text>

              <View style={[s.timerRing, { borderColor: releaseColor + '40' }]}>
                <Text style={[s.timerNum, { color: releaseColor }]}>{countdown}</Text>
              </View>

              <Text style={s.cycleText}>Round {releaseCycle + 1} of {RELEASE_CYCLES}</Text>
            </>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

/* ── Styles ──────────────────────────────────────────────── */

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

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

  scroll: { flexGrow: 1, paddingBottom: Spacing['3xl'] },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    minHeight: 420,
  },

  /* Phase text inside the square */
  phaseMain: {
    fontSize: 28,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily.heading,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  phaseSub: {
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255,255,255,0.45)',
    fontFamily: Typography.fontFamily.primary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  countdownRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownNum: {
    fontSize: 28,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily.heading,
  },

  /* Below-square metadata */
  metaWrap: { alignItems: 'center', marginTop: Spacing.xl },
  phaseHint: {
    fontSize: Typography.fontSize.xs,
    color: 'rgba(255,255,255,0.30)',
    fontFamily: Typography.fontFamily.primary,
    textAlign: 'center',
    letterSpacing: 1,
  },
  cycleText: {
    fontSize: Typography.fontSize.sm,
    color: TEXT_MUTED,
    fontFamily: Typography.fontFamily.primary,
    marginTop: Spacing.xs,
  },

  /* Identity step */
  identityIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#6EA8FE12',
    borderWidth: 1.5,
    borderColor: '#6EA8FE25',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  directiveText: {
    fontSize: 22,
    fontWeight: Typography.fontWeight.semibold,
    color: TEXT_PRIMARY,
    fontFamily: Typography.fontFamily.heading,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  directiveSub: {
    fontSize: Typography.fontSize.base,
    color: TEXT_MUTED,
    fontFamily: Typography.fontFamily.primary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#6EA8FE',
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
  },
  actionBtnText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: '#fff',
    fontFamily: Typography.fontFamily.primary,
  },

  /* Release step */
  releaseOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  releaseCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  timerNum: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily.heading,
  },
});
