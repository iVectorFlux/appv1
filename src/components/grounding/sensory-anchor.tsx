/**
 * Sensory Anchor — Mode 2 (5-4-3-2-1, 3-4 min)
 *
 * 5 sequential full-screen cards: See 5 → Touch 4 → Hear 3 → Smell 2 → Taste 1
 *
 * Dark immersive background, animated transitions, glowing accent rings.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography, Radius } from '@/constants/design-tokens';
import { SENSORY_ANCHOR_STEPS } from '@/data/grounding-content';
import type { GroundingModeProps } from '@/types/grounding';

const useND = Platform.OS !== 'web';
const STEPS = SENSORY_ANCHOR_STEPS;

const BG = '#0C1222';
const SURFACE = 'rgba(255,255,255,0.06)';
const BORDER = 'rgba(255,255,255,0.10)';
const TEXT_PRIMARY = '#E2E8F0';
const TEXT_MUTED = '#64748B';

const SENSE_COLORS = ['#6EA8FE', '#F97316', '#A78BFA', '#F472B6', '#34D399'];

export function SensoryAnchor({ onComplete, onExit }: GroundingModeProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const ringPulse = useRef(new Animated.Value(1)).current;
  const ring2Pulse = useRef(new Animated.Value(1)).current;

  const current = STEPS[currentIdx];
  const accent = SENSE_COLORS[currentIdx];

  useEffect(() => {
    const p1 = Animated.loop(
      Animated.sequence([
        Animated.timing(ringPulse, { toValue: 1.08, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: useND }),
        Animated.timing(ringPulse, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: useND }),
      ]),
    );
    const p2 = Animated.loop(
      Animated.sequence([
        Animated.timing(ring2Pulse, { toValue: 1.12, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: useND }),
        Animated.timing(ring2Pulse, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: useND }),
      ]),
    );
    p1.start();
    p2.start();
    return () => { p1.stop(); p2.stop(); };
  }, [ringPulse, ring2Pulse]);

  const advance = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 220, useNativeDriver: useND }),
      Animated.timing(slideAnim, { toValue: -40, duration: 220, useNativeDriver: useND }),
      Animated.timing(scaleAnim, { toValue: 0.94, duration: 220, useNativeDriver: useND }),
    ]).start(() => {
      const nextIdx = currentIdx + 1;
      if (nextIdx >= STEPS.length) { onComplete(100); return; }
      setCurrentIdx(nextIdx);
      slideAnim.setValue(50);
      scaleAnim.setValue(0.96);
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
        colors={[BG, '#111827', BG]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Top bar */}
      <View style={s.topBar}>
        <Text style={s.stepLabel}>Step {currentIdx + 1} of {STEPS.length}</Text>
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

      {/* Progress track */}
      <View style={s.progressRow}>
        {STEPS.map((st, i) => (
          <View key={st.id} style={[s.progressSeg, i <= currentIdx && { backgroundColor: accent }]} />
        ))}
      </View>

      {/* Card */}
      <Animated.View style={[s.center, { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }]}>
        {/* Glow rings */}
        <View style={s.iconOuter}>
          <Animated.View style={[s.glowRing2, { backgroundColor: accent + '06', transform: [{ scale: ring2Pulse }] }]} />
          <Animated.View style={[s.glowRing1, { backgroundColor: accent + '10', transform: [{ scale: ringPulse }] }]} />
          <View
            style={[
              s.iconInner,
              {
                backgroundColor: accent + '18',
                borderColor: accent + '30',
                ...(Platform.OS === 'ios' ? { shadowColor: accent, shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 0 } } : {}),
              },
            ]}
          >
            <Ionicons name={current.icon as any} size={44} color={accent} />
          </View>
        </View>

        <Text style={s.senseLabel}>{current.sense}</Text>
        <Text style={[s.countBig, { color: accent }]}>{current.count}</Text>
        <Text style={s.prompt}>{current.prompt}</Text>
        <Text style={s.hint}>Take your time. There's no rush.</Text>
      </Animated.View>

      {/* Bottom */}
      <View style={s.bottomBar}>
        <TouchableOpacity style={[s.nextBtn, { backgroundColor: accent }]} onPress={advance} activeOpacity={0.8}>
          <Text style={s.nextBtnText}>{currentIdx < STEPS.length - 1 ? 'Next' : 'Finish'}</Text>
          <Ionicons name={currentIdx < STEPS.length - 1 ? 'arrow-forward' : 'checkmark'} size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  stepLabel: { fontSize: Typography.fontSize.sm, color: TEXT_MUTED, fontFamily: Typography.fontFamily.primary, fontWeight: Typography.fontWeight.medium },
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

  progressRow: { flexDirection: 'row', gap: 4, paddingHorizontal: Spacing.lg, marginTop: Spacing.sm },
  progressSeg: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.06)' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg },

  iconOuter: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
  glowRing2: { position: 'absolute', width: 140, height: 140, borderRadius: 70 },
  glowRing1: { position: 'absolute', width: 110, height: 110, borderRadius: 55 },
  iconInner: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },

  senseLabel: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold, color: TEXT_MUTED, fontFamily: Typography.fontFamily.primary, marginBottom: Spacing.sm, letterSpacing: 0.35 },
  countBig: { fontSize: 72, fontWeight: Typography.fontWeight.bold, fontFamily: Typography.fontFamily.heading, marginBottom: Spacing.md, lineHeight: 80 },
  prompt: { fontSize: 24, fontWeight: Typography.fontWeight.semibold, color: TEXT_PRIMARY, fontFamily: Typography.fontFamily.heading, textAlign: 'center', lineHeight: 34, marginBottom: Spacing.md },
  hint: { fontSize: Typography.fontSize.sm, color: TEXT_MUTED, fontFamily: Typography.fontFamily.primary, textAlign: 'center' },

  bottomBar: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  nextBtn: { borderRadius: Radius.md, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  nextBtnText: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: '#fff', fontFamily: Typography.fontFamily.primary },
});
