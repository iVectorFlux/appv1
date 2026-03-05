/**
 * Sensory Anchor — Mode 2 (5-4-3-2-1, 3-4 min)
 *
 * 5 sequential full-screen cards: See 5 → Touch 4 → Hear 3 → Smell 2 → Taste 1
 *
 * Design: animated card transitions, glowing icon ring, large count number,
 *         progress track with labels, dark bg.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Typography, Radius, Layout } from '@/constants/design-tokens';
import { SENSORY_ANCHOR_STEPS } from '@/data/grounding-content';
import type { GroundingModeProps } from '@/types/grounding';

const STEPS = SENSORY_ANCHOR_STEPS;

/** Color accent per sense for visual variety */
const SENSE_COLORS = (c: ReturnType<typeof useColors>) => [
  c.accentCalm,   // See
  c.accentWarm,   // Touch
  c.accentEnergy,  // Hear
  c.accentSoft,   // Smell
  c.primary,      // Taste
] as const;

export function SensoryAnchor({ onComplete, onExit }: GroundingModeProps) {
  const colors = useColors();
  const [currentIdx, setCurrentIdx] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const ringPulse = useRef(new Animated.Value(1)).current;

  const current = STEPS[currentIdx];
  const accent = SENSE_COLORS(colors)[currentIdx];

  // Subtle ring pulse
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(ringPulse, { toValue: 1.06, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(ringPulse, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [ringPulse]);

  const advance = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -40, duration: 200, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      const nextIdx = currentIdx + 1;
      if (nextIdx >= STEPS.length) { onComplete(100); return; }
      setCurrentIdx(nextIdx);
      slideAnim.setValue(50);
      scaleAnim.setValue(0.96);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    });
  }, [currentIdx, fadeAnim, slideAnim, scaleAnim, onComplete]);

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.stepLabel}>Step {currentIdx + 1} of {STEPS.length}</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onExit} hitSlop={12}>
          <Ionicons name="close" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Progress track */}
      <View style={styles.progressRow}>
        {STEPS.map((s, i) => (
          <View key={s.id} style={[styles.progressSeg, i <= currentIdx && { backgroundColor: accent }]} />
        ))}
      </View>

      {/* Card */}
      <Animated.View style={[styles.center, { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }]}>
        {/* Icon with glow ring */}
        <View style={styles.iconOuter}>
          <Animated.View style={[styles.iconGlowRing, { backgroundColor: accent + '12', transform: [{ scale: ringPulse }] }]} />
          <View style={[styles.iconInner, { backgroundColor: accent + '20', borderColor: accent + '35' }]}>
            <Ionicons name={current.icon as any} size={44} color={accent} />
          </View>
        </View>

        <Text style={styles.senseLabel}>{current.sense}</Text>

        {/* Big count */}
        <Text style={[styles.countBig, { color: accent }]}>{current.count}</Text>

        <Text style={styles.prompt}>{current.prompt}</Text>
        <Text style={styles.hint}>Take your time. There's no rush.</Text>
      </Animated.View>

      {/* Bottom */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={[styles.nextBtn, { backgroundColor: accent }]} onPress={advance} activeOpacity={0.8}>
          <Text style={styles.nextBtnText}>{currentIdx < STEPS.length - 1 ? 'Next' : 'Finish'}</Text>
          <Ionicons name={currentIdx < STEPS.length - 1 ? 'arrow-forward' : 'checkmark'} size={20} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Layout.paddingHorizontal, paddingTop: Spacing.xl, paddingBottom: Spacing.sm },
    stepLabel: { fontSize: Typography.fontSize.sm, color: colors.textMuted, fontFamily: Typography.fontFamily.primary },
    closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.full, backgroundColor: colors.surface },

    progressRow: { flexDirection: 'row', gap: 4, paddingHorizontal: Layout.paddingHorizontal, marginTop: Spacing.sm },
    progressSeg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.surface },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Layout.paddingHorizontal },

    iconOuter: { width: 110, height: 110, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
    iconGlowRing: { position: 'absolute', width: 110, height: 110, borderRadius: 55 },
    iconInner: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },

    senseLabel: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, color: colors.textMuted, fontFamily: Typography.fontFamily.primary, marginBottom: Spacing.sm },
    countBig: { fontSize: 64, fontWeight: Typography.fontWeight.bold, fontFamily: Typography.fontFamily.heading, marginBottom: Spacing.md, lineHeight: 72 },
    prompt: { fontSize: Typography.fontSize.heroCard, fontWeight: Typography.fontWeight.semibold, color: colors.textPrimary, fontFamily: Typography.fontFamily.heading, textAlign: 'center', lineHeight: 36, marginBottom: Spacing.lg },
    hint: { fontSize: Typography.fontSize.sm, color: colors.textMuted, fontFamily: Typography.fontFamily.primary, textAlign: 'center' },

    bottomBar: { paddingHorizontal: Layout.paddingHorizontal, paddingBottom: Spacing.xl },
    nextBtn: { borderRadius: Radius.sm, paddingVertical: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
    nextBtnText: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: colors.primaryForeground, fontFamily: Typography.fontFamily.primary },
  });
