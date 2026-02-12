/**
 * Sensory Anchor — Mode 2 (5-4-3-2-1, 3-4 min)
 *
 * 5 sequential full-screen cards:
 *  See 5 → Touch 4 → Hear 3 → Smell 2 → Taste 1
 *
 * Design: animated card transitions (fade + slide), progress dots,
 *         dark bg, large typography, no scroll.
 */

import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import { SENSORY_ANCHOR_STEPS } from '@/data/grounding-content';
import type { GroundingModeProps } from '@/types/grounding';

const STEPS = SENSORY_ANCHOR_STEPS;

export function SensoryAnchor({ onComplete, onExit }: GroundingModeProps) {
  const colors = useColors();
  const [currentIdx, setCurrentIdx] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const startTime = useRef(Date.now());

  const current = STEPS[currentIdx];

  const advance = useCallback(() => {
    // Exit animation
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -30, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      const nextIdx = currentIdx + 1;
      if (nextIdx >= STEPS.length) {
        const elapsed = Date.now() - startTime.current;
        onComplete(100);
        return;
      }
      setCurrentIdx(nextIdx);
      slideAnim.setValue(40);
      fadeAnim.setValue(0);
      // Enter animation
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    });
  }, [currentIdx, fadeAnim, slideAnim, onComplete]);

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      {/* Close */}
      <TouchableOpacity style={styles.closeBtn} onPress={onExit}>
        <Ionicons name="close" size={24} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Progress dots */}
      <View style={styles.dotsRow}>
        {STEPS.map((s, i) => (
          <View
            key={s.id}
            style={[
              styles.dot,
              i <= currentIdx && { backgroundColor: colors.primary },
            ]}
          />
        ))}
      </View>

      {/* Card content */}
      <Animated.View
        style={[
          styles.center,
          { opacity: fadeAnim, transform: [{ translateX: slideAnim }] },
        ]}
      >
        <View style={styles.iconWrap}>
          <Ionicons name={(current.icon as any)} size={48} color={colors.accentCalm} />
        </View>

        <Text style={styles.sense}>{current.sense}</Text>
        <Text style={styles.countBig}>{current.count}</Text>
        <Text style={styles.prompt}>{current.prompt}</Text>

        <Text style={styles.hint}>
          Take your time. There's no rush.
        </Text>
      </Animated.View>

      {/* Next button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.nextBtn} onPress={advance} activeOpacity={0.8}>
          <Text style={styles.nextBtnText}>
            {currentIdx < STEPS.length - 1 ? 'Next' : 'Finish'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    closeBtn: {
      position: 'absolute',
      top: Spacing['3xl'],
      right: Spacing.xl,
      zIndex: 10,
      padding: Spacing.sm,
    },
    dotsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: Spacing.sm,
      marginTop: Spacing['5xl'],
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.surface,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.xl,
    },
    iconWrap: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.accentCalm + '18',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing['2xl'],
    },
    sense: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textMuted,
      fontFamily: Typography.fontFamily.primary,
      textTransform: 'uppercase',
      letterSpacing: 2,
      marginBottom: Spacing.sm,
    },
    countBig: {
      fontSize: 64,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
      fontFamily: Typography.fontFamily.heading,
      marginBottom: Spacing.md,
    },
    prompt: {
      fontSize: Typography.fontSize['2xl'],
      fontWeight: Typography.fontWeight.medium,
      color: colors.textPrimary,
      fontFamily: Typography.fontFamily.heading,
      textAlign: 'center',
      lineHeight: Typography.lineHeight.relaxed * Typography.fontSize['2xl'],
      marginBottom: Spacing.xl,
    },
    hint: {
      fontSize: Typography.fontSize.sm,
      color: colors.textMuted,
      fontFamily: Typography.fontFamily.primary,
      textAlign: 'center',
    },
    bottomBar: {
      padding: Spacing.xl,
      paddingBottom: Spacing['3xl'],
    },
    nextBtn: {
      backgroundColor: colors.primary,
      borderRadius: Radius.lg,
      paddingVertical: Spacing.lg,
      alignItems: 'center',
    },
    nextBtnText: {
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.primaryForeground,
      fontFamily: Typography.fontFamily.primary,
    },
  });
