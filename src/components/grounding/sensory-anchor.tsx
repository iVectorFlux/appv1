/**
 * Sensory Anchor - Mode 2 (5-4-3-2-1 grounding, 3-4 min)
 *
 * Overhauled to deliver a premium, lightweight iOS metal meditation look:
 *  - Overlapping translucent ambient color shifting glow.
 *  - Pulsing orbit rings surrounding organic floating sense icons.
 *  - Spacious, large lightweight editorial counting typography.
 *  - Elegant glassmorphic advancement button.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography, Radius, useColors } from '@/constants/design-tokens';
import { SENSORY_ANCHOR_STEPS } from '@/data/grounding-content';
import type { GroundingModeProps } from '@/types/grounding';
import { GlassCard } from '@/components/ui/glass-card';

const useND = Platform.OS !== 'web';
const STEPS = SENSORY_ANCHOR_STEPS;

const BG = '#0C1222';
const SURFACE = 'rgba(255,255,255,0.04)';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT_PRIMARY = '#E2E8F0';
const TEXT_MUTED = '#94A3B8';

const SENSE_COLORS = ['#38bdf8', '#fb923c', '#a78bfa', '#f472b6', '#34d399'];

export function SensoryAnchor({ onComplete, onExit }: GroundingModeProps) {
  const colors = useColors();
  const [currentIdx, setCurrentIdx] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  // Floating ambient pulse rings
  const ring1Pulse = useRef(new Animated.Value(1)).current;
  const ring2Pulse = useRef(new Animated.Value(1)).current;

  const current = STEPS[currentIdx];
  const accent = SENSE_COLORS[currentIdx];

  // Set up continuous breathing-like pulses for floating rings
  useEffect(() => {
    const p1 = Animated.loop(
      Animated.sequence([
        Animated.timing(ring1Pulse, { toValue: 1.08, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: useND }),
        Animated.timing(ring1Pulse, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: useND }),
      ])
    );
    const p2 = Animated.loop(
      Animated.sequence([
        Animated.timing(ring2Pulse, { toValue: 1.15, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: useND }),
        Animated.timing(ring2Pulse, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: useND }),
      ])
    );
    p1.start();
    p2.start();
    return () => { p1.stop(); p2.stop(); };
  }, [ring1Pulse, ring2Pulse]);

  const advance = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 220, useNativeDriver: useND }),
      Animated.timing(slideAnim, { toValue: -30, duration: 220, useNativeDriver: useND }),
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 220, useNativeDriver: useND }),
    ]).start(() => {
      const nextIdx = currentIdx + 1;
      if (nextIdx >= STEPS.length) { onComplete(100); return; }
      setCurrentIdx(nextIdx);
      slideAnim.setValue(35);
      scaleAnim.setValue(0.97);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: useND }),
        Animated.timing(slideAnim, { toValue: 0, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: useND }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: useND }),
      ]).start();
    });
  }, [currentIdx, fadeAnim, slideAnim, scaleAnim, onComplete]);

  return (
    <View style={s.container}>
      <LinearGradient
        colors={[BG, '#080d1a', BG]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Dynamic ambient color glow that transitions seamlessly */}
      <View style={[s.accentGlow, { backgroundColor: accent }]} />

      {/* Navigation Top Bar */}
      <View style={s.header}>
        <TouchableOpacity onPress={onExit} hitSlop={16} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>
          5 4 3 2 1 Grounding
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={s.topStepBlock}>
        <View style={s.stepRowInline}>
          <Text style={s.stepMeta} accessibilityLiveRegion="polite" numberOfLines={1}>
            Step {currentIdx + 1} of {STEPS.length}
          </Text>
          <View style={s.phaseSegRow}>
            {STEPS.map((st, i) => (
              <View
                key={st.id}
                style={[
                  s.phaseSeg,
                  i <= currentIdx && { backgroundColor: accent, opacity: 0.8 },
                ]}
              />
            ))}
          </View>
        </View>
      </View>

      {/* Glassmorphic Sensory Card */}
      <Animated.View
        style={[
          s.center,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        <GlassCard style={s.glassContainer} tint="dark" backgroundColor="rgba(255, 255, 255, 0.03)" borderColor="rgba(255, 255, 255, 0.08)">
          {/* Glowing Orbit Rings & Icon */}
          <View style={s.iconOuter}>
            <Animated.View style={[s.glowRing2, { borderColor: accent + '18', transform: [{ scale: ring2Pulse }] }]} />
            <Animated.View style={[s.glowRing1, { borderColor: accent + '30', transform: [{ scale: ring1Pulse }] }]} />
            <View
              style={[
                s.iconInner,
                {
                  backgroundColor: accent + '12',
                  borderColor: accent + '25',
                  ...(Platform.OS === 'ios' ? { shadowColor: accent, shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 0 } } : {}),
                },
              ]}
            >
              <Ionicons name={current.icon as any} size={36} color={accent} />
            </View>
          </View>

          {/* Counts and Label */}
          <Text style={[s.senseLabel, { color: accent }]}>{current.sense}</Text>
          <Text style={[s.countBig, { color: TEXT_PRIMARY }]}>{current.count}</Text>
          
          <Text style={s.prompt}>{current.prompt}</Text>
          <Text style={s.hint}>Take a slow breath. Notice the sensation.</Text>
        </GlassCard>
      </Animated.View>

      {/* Bottom Glass button */}
      <View style={s.bottomBar}>
        <TouchableOpacity
          style={[s.nextBtn, { backgroundColor: accent }]}
          onPress={advance}
          activeOpacity={0.85}
        >
          <Text style={s.nextBtnText}>{currentIdx < STEPS.length - 1 ? 'Next Step' : 'Complete Reset'}</Text>
          <Ionicons name={currentIdx < STEPS.length - 1 ? 'arrow-forward' : 'checkmark'} size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

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

  glassContainer: {
    width: '100%',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },

  /* ── Floating Orbits ────────────────────────── */
  iconOuter: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  glowRing2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
  },
  glowRing1: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
  },
  iconInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    zIndex: 3,
  },

  senseLabel: {
    fontSize: Typography.fontSize.micro,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily.primary,
    letterSpacing: 1.5,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  countBig: {
    fontSize: 72,
    fontWeight: Typography.fontWeight.normal,
    fontFamily: Typography.fontFamily.heading,
    lineHeight: 76,
    marginBottom: Spacing.md,
    letterSpacing: -1.5,
    textAlign: 'center',
  },
  prompt: {
    fontSize: 24,
    fontWeight: Typography.fontWeight.semibold,
    color: TEXT_PRIMARY,
    fontFamily: Typography.fontFamily.heading,
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: -0.3,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  hint: {
    fontSize: Typography.fontSize.sm,
    color: TEXT_MUTED,
    fontFamily: Typography.fontFamily.primary,
    textAlign: 'center',
    opacity: 0.8,
  },

  bottomBar: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  nextBtn: {
    borderRadius: Radius.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  nextBtnText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: '#fff',
    fontFamily: Typography.fontFamily.primary,
  },
});
