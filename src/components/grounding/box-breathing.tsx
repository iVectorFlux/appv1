/**
 * Box Breathing - Mode 3 (4-5 min grounding)
 *
 * Fully redesigned to deliver a stock iOS/WatchOS metal aesthetic:
 *  - Fluid, color-shifting glassmorphic squircle box.
 *  - High-end traveling glow particle with dynamic trailing shadows.
 *  - Minimalist glass card templates for Identity Anchors.
 *  - Dynamic pulsing orbital rings for Progressive Muscle Release.
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
import { Spacing, Typography, Radius, useColors } from '@/constants/design-tokens';
import { BOX_BREATHING_STEPS } from '@/data/grounding-content';
import type { GroundingModeProps } from '@/types/grounding';
import { GlassCard } from '@/components/ui/glass-card';

const useND = Platform.OS !== 'web';
const { width: SCREEN_W } = Dimensions.get('window');

type Step = 'box_breathe' | 'identity' | 'release';

const BOX_SIDE_MS = 4000;
const BOX_CYCLES = 3;
const IDENTITY_PROMPTS = BOX_BREATHING_STEPS[1].prompts;
const RELEASE_CYCLES = 3;
const RELEASE_HOLD = 5000;
const RELEASE_REST = 5000;

/* ── Overhauled Squircle Constants ────────────────────── */
const BOX = Math.min(250, SCREEN_W - 100);
const CORNER_R = 32;
const DOT = 16;
const EDGE = 2;

const BG = '#0C1222';
const SURFACE = 'rgba(255,255,255,0.04)';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT_PRIMARY = '#E2E8F0';
const TEXT_MUTED = '#94A3B8';

type Phase = 'in' | 'hold' | 'out' | 'holdEmpty';

const PHASE: Record<Phase, { main: string; sub: string; color: string }> = {
  in:        { main: 'Inhale',  sub: 'Fill your lungs slowly',  color: '#38bdf8' },
  hold:      { main: 'Hold',    sub: 'Keep it gentle',          color: '#a78bfa' },
  out:       { main: 'Exhale',  sub: 'Release completely',      color: '#34d399' },
  holdEmpty: { main: 'Hold',    sub: 'Keep it gentle',          color: '#64748b' },
};

const PHASE_ORDER: Phase[] = ['in', 'hold', 'out', 'holdEmpty'];
const HALF = BOX / 2;

/* ── Redesigned Luminous Squircle Visualizer ───────────── */
function LuminousSquircle({
  phaseIndex,
  traceProgress,
  phaseColor,
  ambientPulse,
  squircleScale,
  boxPhase,
  children,
}: {
  phaseIndex: number;
  traceProgress: Animated.Value;
  phaseColor: string;
  ambientPulse: Animated.Value;
  squircleScale: any;
  boxPhase: Phase;
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
    inputRange: [0, 0.08, 0.5, 0.92, 1],
    outputRange: [0.3, 0.85, 1, 0.85, 0.3],
  });

  const edgeStyle = (idx: number) => {
    const isActive = idx === phaseIndex;
    const isComplete = idx < phaseIndex;
    const c = PHASE[PHASE_ORDER[idx]].color;
    return {
      backgroundColor: c,
      opacity: isActive ? activeOpacity : isComplete ? 0.6 : 0.05,
    };
  };

  const coreScale = traceProgress.interpolate({
    inputRange: [0, 1],
    outputRange:
      boxPhase === 'in'
        ? [0.6, 1.1]
        : boxPhase === 'hold'
        ? [1.1, 1.1]
        : boxPhase === 'out'
        ? [1.1, 0.6]
        : [0.6, 0.6],
  });

  const coreOpacity = traceProgress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange:
      boxPhase === 'in'
        ? [0.1, 0.25, 0.4]
        : boxPhase === 'out'
        ? [0.4, 0.25, 0.1]
        : boxPhase === 'hold'
        ? [0.4, 0.4, 0.4]
        : [0.1, 0.1, 0.1],
  });

  const orbitScale = traceProgress.interpolate({
    inputRange: [0, 1],
    outputRange:
      boxPhase === 'in'
        ? [0.5, 1.25]
        : boxPhase === 'hold'
        ? [1.25, 1.25]
        : boxPhase === 'out'
        ? [1.25, 0.5]
        : [0.5, 0.5],
  });

  const orbitOpacity = traceProgress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange:
      boxPhase === 'in'
        ? [0.08, 0.2, 0.35]
        : boxPhase === 'out'
        ? [0.35, 0.2, 0.08]
        : boxPhase === 'hold'
        ? [0.35, 0.35, 0.35]
        : [0.08, 0.08, 0.08],
  });

  return (
    <View style={sq.wrap}>
      {/* Dynamic ambient halo background glow */}
      <Animated.View
        style={[
          sq.ambient1,
          { backgroundColor: phaseColor, transform: [{ scale: ambientPulse }] },
        ]}
      />
      <View style={[sq.ambient2, { backgroundColor: phaseColor + '03' }]} />

      {/* The frosted squircle box frame */}
      <Animated.View
        style={[
          sq.box,
          {
            borderColor: 'rgba(255, 255, 255, 0.12)',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            transform: [{ scale: squircleScale }],
          },
        ]}
      >
        {/* Sleek edge highlights */}
        <Animated.View style={[sq.edgeTop, edgeStyle(0)]} />
        <Animated.View style={[sq.edgeRight, edgeStyle(1)]} />
        <Animated.View style={[sq.edgeBottom, edgeStyle(2)]} />
        <Animated.View style={[sq.edgeLeft, edgeStyle(3)]} />

        {/* Small delicate corner anchors */}
        {corners.map((c, i) => {
          const isNear = i === phaseIndex || i === (phaseIndex + 1) % 4;
          return (
            <View
              key={i}
              style={[
                sq.cornerDot,
                {
                  left: c.x + HALF - 2,
                  top: c.y + HALF - 2,
                  backgroundColor: isNear ? phaseColor : 'rgba(255,255,255,0.1)',
                  opacity: isNear ? 0.8 : 0.2,
                },
              ]}
            />
          );
        })}

        {/* Dynamic traveling soft particle */}
        <Animated.View
          style={[
            sq.dot,
            {
              left: HALF + dotOff,
              top: HALF + dotOff,
              backgroundColor: phaseColor,
              transform: [{ translateX }, { translateY }],
              ...(Platform.OS === 'ios'
                ? { shadowColor: phaseColor, shadowOpacity: 0.9, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } }
                : {}),
            },
          ]}
        />

        {/* Abstract orbital ring with parallax scaling */}
        <Animated.View
          style={[
            sq.orbitalRing,
            {
              borderColor: phaseColor,
              transform: [{ scale: orbitScale }],
              opacity: orbitOpacity,
            },
          ]}
        />

        {/* Immersive core glass orb that breathes with gradient */}
        <Animated.View
          style={[
            sq.centerCore,
            {
              transform: [{ scale: coreScale }],
              opacity: coreOpacity,
            },
          ]}
        >
          <LinearGradient
            colors={[phaseColor, phaseColor + '30']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={sq.gradientFill}
          />
        </Animated.View>

        {/* Center Text Panel */}
        <View style={sq.center}>{children}</View>
      </Animated.View>
    </View>
  );
}

const sq = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ambient1: {
    position: 'absolute',
    width: BOX + 80,
    height: BOX + 80,
    borderRadius: CORNER_R + 40,
    opacity: 0.04,
  },
  ambient2: {
    position: 'absolute',
    width: BOX + 40,
    height: BOX + 40,
    borderRadius: CORNER_R + 20,
  },
  box: {
    width: BOX,
    height: BOX,
    borderRadius: CORNER_R,
    borderWidth: 1,
    overflow: 'hidden',
  },
  edgeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: EDGE,
  },
  edgeRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: EDGE,
  },
  edgeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: EDGE,
  },
  edgeLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: EDGE,
  },
  cornerDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
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
    zIndex: 10,
    paddingHorizontal: Spacing.md,
  },
  centerCore: {
    position: 'absolute',
    left: BOX * 0.14,
    top: BOX * 0.14,
    width: BOX * 0.72,
    height: BOX * 0.72,
    borderRadius: (BOX * 0.72) / 2,
    zIndex: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#fff',
        shadowOpacity: 0.2,
        shadowRadius: 15,
        shadowOffset: { width: 0, height: 0 },
      },
      default: {},
    }),
  },
  gradientFill: {
    flex: 1,
    borderRadius: (BOX * 0.72) / 2,
  },
  orbitalRing: {
    position: 'absolute',
    left: BOX * 0.05,
    top: BOX * 0.05,
    width: BOX * 0.9,
    height: BOX * 0.9,
    borderRadius: (BOX * 0.9) / 2,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    zIndex: 0,
  },
});

/* ── Main Component ───────────────────────────────────── */
export function BoxBreathing({ onComplete, onExit }: GroundingModeProps) {
  const colors = useColors();
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
  const releasePulse = useRef(new Animated.Value(1)).current;

  const phaseIndex = PHASE_ORDER.indexOf(boxPhase);
  const pc = PHASE[boxPhase];

  const squircleScale = traceProgress.interpolate({
    inputRange: [0, 1],
    outputRange:
      boxPhase === 'in'
        ? [0.92, 1.08]
        : boxPhase === 'hold'
        ? [1.08, 1.08]
        : boxPhase === 'out'
        ? [1.08, 0.92]
        : [0.92, 0.92],
  });

  // Ambient breathing pulsator loop
  useEffect(() => {
    const p = Animated.loop(
      Animated.sequence([
        Animated.timing(ambientPulse, { toValue: 1.08, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: useND }),
        Animated.timing(ambientPulse, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: useND }),
      ]),
    );
    p.start();
    return () => p.stop();
  }, [ambientPulse]);

  // Tension release pulse loop
  useEffect(() => {
    if (step !== 'release') return;
    const rp = Animated.loop(
      Animated.sequence([
        Animated.timing(releasePulse, { toValue: 1.1, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: useND }),
        Animated.timing(releasePulse, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: useND }),
      ])
    );
    rp.start();
    return () => rp.stop();
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

  // Identity reflection advance
  const advanceIdentity = useCallback(() => {
    const nextIdx = identityIdx + 1;
    if (nextIdx >= IDENTITY_PROMPTS.length) { fadeToStep('release'); return; }
    Animated.timing(textFade, { toValue: 0, duration: 200, useNativeDriver: useND }).start(() => {
      setIdentityIdx(nextIdx);
      textFade.setValue(0);
      Animated.timing(textFade, { toValue: 1, duration: 300, useNativeDriver: useND }).start();
    });
  }, [identityIdx, fadeToStep, textFade]);

  // Squeeze tension cycle
  const runReleaseCycle = useCallback(
    (cycle: number) => {
      if (cycle >= RELEASE_CYCLES) { onComplete(100); return; }
      setReleaseCycle(cycle);
      setReleasePhase('clench');
      setCountdown(Math.ceil(RELEASE_HOLD / 1000));

      // Squeeze visual scale down
      Animated.timing(releaseScale, { toValue: 0.88, duration: 600, easing: Easing.inOut(Easing.cubic), useNativeDriver: useND }).start();

      let secs = Math.ceil(RELEASE_HOLD / 1000);
      const clenchIv = setInterval(() => {
        secs--;
        setCountdown(secs);
        if (secs <= 0) {
          clearInterval(clenchIv);
          setReleasePhase('release');
          setCountdown(Math.ceil(RELEASE_REST / 1000));

          // Expanded release bloom
          Animated.sequence([
            Animated.timing(releaseScale, { toValue: 1.15, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: useND }),
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
  const releaseColor = isClench ? '#fb923c' : '#34d399';
  const activeColor = step === 'box_breathe' ? pc.color : step === 'identity' ? '#38bdf8' : releaseColor;

  return (
    <View style={s.container}>
      <LinearGradient
        colors={[BG, '#080d1a', BG]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Atmospheric dynamic color shifts */}
      <View style={[s.accentGlow, { backgroundColor: activeColor }]} />

      {/* Navigation Top Bar */}
      <View style={s.header}>
        <TouchableOpacity onPress={onExit} hitSlop={16} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>
          Box Breathing
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={s.topStepBlock}>
        <View style={s.stepRowInline}>
          <Text style={s.stepMeta} accessibilityLiveRegion="polite" numberOfLines={1}>
            {step === 'box_breathe' ? 'Step 1 of 3 · Box Breath' : step === 'identity' ? 'Step 2 of 3 · Identity Anchor' : 'Step 3 of 3 · Tension Release'}
          </Text>
          <View style={s.phaseSegRow}>
            {['box_breathe', 'identity', 'release'].map((st, i) => {
              const activeIdx = ['box_breathe', 'identity', 'release'].indexOf(step);
              return (
                <View key={st} style={[s.phaseSeg, i <= activeIdx && { backgroundColor: activeColor, opacity: 0.85 }]} />
              );
            })}
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Animated.View style={[s.center, { opacity: textFade }]}>

          {/* ── BOX BREATHE ──────────────────────────────── */}
          {step === 'box_breathe' && (
            <View style={s.fullWidthCenter}>
              <LuminousSquircle
                phaseIndex={phaseIndex}
                traceProgress={traceProgress}
                phaseColor={pc.color}
                ambientPulse={ambientPulse}
                squircleScale={squircleScale}
                boxPhase={boxPhase}
              >
                <Text style={[s.phaseMain, { color: pc.color }]}>{pc.main}</Text>
                <Text style={s.phaseSub}>{pc.sub}</Text>
                <View style={[s.countdownRing, { borderColor: pc.color + '20' }]}>
                  <Text style={[s.countdownNum, { color: pc.color }]}>{countdown}</Text>
                </View>
              </LuminousSquircle>

              <View style={s.metaWrap}>
                <Text style={s.cycleText}>Breath {boxCycle + 1} of {BOX_CYCLES}</Text>
              </View>
            </View>
          )}

          {/* ── IDENTITY ─────────────────────────────────── */}
          {step === 'identity' && (
            <GlassCard style={s.glassContainer} tint="dark" backgroundColor="rgba(255, 255, 255, 0.03)" borderColor="rgba(255, 255, 255, 0.08)">
              <View style={s.iconGlowWrapper}>
                <Animated.View style={[s.glowRingOutline, { borderColor: '#38bdf840', transform: [{ scale: ambientPulse }] }]} />
                <View style={[s.promptIcon, { backgroundColor: '#38bdf812', borderColor: '#38bdf825' }]}>
                  <Ionicons name="person-outline" size={32} color="#38bdf8" />
                </View>
              </View>
              
              <Text style={s.directiveText}>{IDENTITY_PROMPTS[identityIdx]}</Text>
              <Text style={s.directiveSub}>Say it out loud or reflect silently in your head.</Text>
              
              <TouchableOpacity style={s.actionBtn} onPress={advanceIdentity} activeOpacity={0.85}>
                <Text style={s.actionBtnText}>{identityIdx < IDENTITY_PROMPTS.length - 1 ? 'Next' : 'Continue'}</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            </GlassCard>
          )}

          {/* ── RELEASE ──────────────────────────────────── */}
          {step === 'release' && (
            <GlassCard style={s.glassContainer} tint="dark" backgroundColor="rgba(255, 255, 255, 0.03)" borderColor="rgba(255, 255, 255, 0.08)">
              <View style={s.iconGlowWrapper}>
                <Animated.View style={[s.glowRingOutline, { borderColor: releaseColor + '30', transform: [{ scale: releasePulse }] }]} />
                <Animated.View
                  style={[
                    s.releaseCircle,
                    {
                      borderColor: releaseColor + '20',
                      backgroundColor: releaseColor + '0c',
                      transform: [{ scale: releaseScale }],
                      ...(Platform.OS === 'ios' ? { shadowColor: releaseColor, shadowOpacity: 0.3, shadowRadius: 15, shadowOffset: { width: 0, height: 0 } } : {}),
                    },
                  ]}
                >
                  <Ionicons
                    name={isClench ? 'hand-left' : 'hand-left-outline'}
                    size={36}
                    color={releaseColor}
                  />
                </Animated.View>
              </View>

              <Text style={s.directiveText}>
                {isClench ? 'Clench your fists tight' : 'Release. Let it all go.'}
              </Text>
              <Text style={s.directiveSub}>
                {isClench ? 'Squeeze muscles for 5 seconds' : 'Feel the deep relaxation'}
              </Text>

              <View style={[s.timerRing, { borderColor: releaseColor + '25' }]}>
                <Text style={[s.timerNum, { color: releaseColor }]}>{countdown}</Text>
              </View>

              <Text style={s.cycleText}>Round {releaseCycle + 1} of {RELEASE_CYCLES}</Text>
            </GlassCard>
          )}
        </Animated.View>
      </ScrollView>
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

  /* Phase text inside the squircle */
  phaseMain: {
    fontSize: 28,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.heading,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  phaseSub: {
    fontSize: Typography.fontSize.xs,
    color: 'rgba(255,255,255,0.4)',
    fontFamily: Typography.fontFamily.primary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  countdownRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownNum: {
    fontSize: 24,
    fontWeight: Typography.fontWeight.bold,
    fontVariant: ['tabular-nums'],
    fontFamily: Typography.fontFamily.heading,
  },

  /* Below-squircle descriptors */
  metaWrap: { alignItems: 'center', marginTop: Spacing.xl },
  phaseHint: {
    fontSize: Typography.fontSize.micro,
    color: 'rgba(255,255,255,0.25)',
    fontFamily: Typography.fontFamily.primary,
    textAlign: 'center',
    letterSpacing: 1.5,
    fontWeight: Typography.fontWeight.bold,
  },
  cycleText: {
    fontSize: Typography.fontSize.sm,
    color: TEXT_MUTED,
    fontFamily: Typography.fontFamily.primary,
    marginTop: Spacing.xs,
    opacity: 0.95,
  },

  /* Glassmorphic prompt cards */
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
  directiveText: {
    fontSize: 22,
    fontWeight: Typography.fontWeight.semibold,
    color: TEXT_PRIMARY,
    fontFamily: Typography.fontFamily.heading,
    textAlign: 'center',
    lineHeight: 32,
    letterSpacing: -0.3,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  directiveSub: {
    fontSize: Typography.fontSize.base,
    color: TEXT_MUTED,
    fontFamily: Typography.fontFamily.primary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
    opacity: 0.8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#38bdf8',
    borderRadius: Radius.md,
    paddingVertical: 13,
    paddingHorizontal: Spacing.xl,
  },
  actionBtnText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: '#fff',
    fontFamily: Typography.fontFamily.primary,
  },

  /* Tension release step visual */
  releaseCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  timerRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  timerNum: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    fontVariant: ['tabular-nums'],
    fontFamily: Typography.fontFamily.heading,
  },
});
