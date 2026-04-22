/**
 * Bright “photon” particles: burst outward (ease-out at end of inhale), collapse to a point on exhale.
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated, Easing, Platform } from 'react-native';
import type { BreathOrbHint } from '@/data/breathing-techniques';

const useND = Platform.OS !== 'web';

const PHOTON_COLORS = [
  '#FF2D92',
  '#00F5FF',
  '#FFE600',
  '#B4FF39',
  '#C77DFF',
  '#FF6B35',
  '#00FFC6',
  '#FF3CAC',
  '#7DF9FF',
  '#FFF01F',
  '#FF00AA',
  '#39FF14',
  '#FF9E00',
  '#00D4FF',
];

const N = 14;
const CORE = 110;
const R_MIN = 10;
const R_MAX = 88;

type Props = {
  visualKey: string;
  durationMs: number;
  orb: BreathOrbHint;
  accent: string;
};

export function PhotonBreathCluster({ visualKey, durationMs, orb, accent }: Props) {
  const progress = useRef(Array.from({ length: N }, () => new Animated.Value(0.12))).current;

  const angles = useMemo(() => Array.from({ length: N }, (_, i) => (i / N) * Math.PI * 2), []);

  useEffect(() => {
    const d = Math.max(320, durationMs);
    progress.forEach((p) => p.setValue(0.12));

    const staggerMs = orb === 'contract' || orb === 'holdLow' ? 30 : 46;

    const toExpand = orb === 'holdHigh' ? 1.08 : 1.36;
    const toCollapse = 0.1;

    const burstOut = () =>
      Animated.stagger(
        staggerMs,
        progress.map((p) =>
          Animated.timing(p, {
            toValue: toExpand,
            duration: d * 0.58,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: useND,
          })
        )
      );

    const pullIn = () => {
      progress.forEach((p) => p.setValue(1.28));
      return Animated.stagger(
        staggerMs * 0.75,
        progress.map((p) =>
          Animated.timing(p, {
            toValue: toCollapse,
            duration: d * 0.52,
            easing: Easing.in(Easing.quad),
            useNativeDriver: useND,
          })
        )
      );
    };

    const shimmer = () =>
      Animated.loop(
        Animated.sequence([
          Animated.parallel(
            progress.map((p) =>
              Animated.timing(p, {
                toValue: 1.06,
                duration: d * 0.2,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: useND,
              })
            )
          ),
          Animated.parallel(
            progress.map((p) =>
              Animated.timing(p, {
                toValue: 0.94,
                duration: d * 0.2,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: useND,
              })
            )
          ),
        ]),
        { iterations: Math.min(12, Math.max(3, Math.floor(d / 350))) }
      );

    let run: Animated.CompositeAnimation | null = null;
    if (orb === 'expand' || orb === 'holdHigh') {
      run = burstOut();
    } else if (orb === 'contract' || orb === 'holdLow') {
      run = pullIn();
    } else if (orb === 'pulse') {
      run = shimmer();
    } else {
      run = burstOut();
    }

    run.start();
    return () => {
      run.stop();
    };
  }, [visualKey, durationMs, orb, progress]);

  return (
    <View style={styles.wrap}>
      <View style={[styles.coreGlow, { backgroundColor: accent + '44' }]} />
      {angles.map((angle, i) => {
        const c = PHOTON_COLORS[i % PHOTON_COLORS.length]!;
        const p = progress[i]!;
        const tx = p.interpolate({
          inputRange: [0.08, 1.45],
          outputRange: [Math.cos(angle) * R_MIN, Math.cos(angle) * R_MAX],
        });
        const ty = p.interpolate({
          inputRange: [0.08, 1.45],
          outputRange: [Math.sin(angle) * R_MIN, Math.sin(angle) * R_MAX],
        });
        const sc = p.interpolate({
          inputRange: [0.08, 1.45],
          outputRange: [0.45, 1.28],
        });
        return (
          <Animated.View
            key={`${i}-${visualKey}`}
            pointerEvents="none"
            style={[
              styles.photon,
              {
                left: CORE - 6,
                top: CORE - 6,
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: c,
                shadowColor: c,
                transform: [{ translateX: tx }, { translateY: ty }, { scale: sc }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coreGlow: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    left: CORE - 20,
    top: CORE - 20,
  },
  photon: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 10,
  },
});
