/**
 * Many small bright photons, driven by one progress value so motion matches
 * the real breath phase (e.g. full 4s inhale easing out at the end, full 7s exhale easing into rest).
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

/** Hundreds of tiny points — one shared animation driver for performance. */
const N = 120;
const PHOTON_DIAM = 3;
const PHOTON_R = PHOTON_DIAM / 2;
const CORE = 110;
const R_MIN = 8;
const R_MAX = 90;

type Props = {
  visualKey: string;
  durationMs: number;
  orb: BreathOrbHint;
  accent: string;
};

export function PhotonBreathCluster({ visualKey, durationMs, orb, accent }: Props) {
  const master = useRef(new Animated.Value(0)).current;

  const angles = useMemo(
    () =>
      Array.from({ length: N }, (_, i) => {
        const base = (i / N) * Math.PI * 2;
        const wobble = ((i * 17) % 360) * (Math.PI / 180) * 0.04;
        return base + wobble;
      }),
    []
  );

  useEffect(() => {
    const d = Math.max(200, durationMs);
    master.stopAnimation();

    const easeExpand = Easing.out(Easing.cubic);
    const easeContract = Easing.out(Easing.cubic);

    let run: Animated.CompositeAnimation;

    if (orb === 'expand') {
      master.setValue(0);
      run = Animated.timing(master, {
        toValue: 1,
        duration: d,
        easing: easeExpand,
        useNativeDriver: useND,
      });
    } else if (orb === 'contract') {
      master.setValue(1);
      run = Animated.timing(master, {
        toValue: 0,
        duration: d,
        easing: easeContract,
        useNativeDriver: useND,
      });
    } else if (orb === 'holdHigh') {
      const reach = Math.min(550, d * 0.14);
      master.setValue(0);
      run = Animated.sequence([
        Animated.timing(master, {
          toValue: 1,
          duration: reach,
          easing: easeExpand,
          useNativeDriver: useND,
        }),
        Animated.timing(master, {
          toValue: 1,
          duration: Math.max(0, d - reach),
          useNativeDriver: useND,
        }),
      ]);
    } else if (orb === 'holdLow') {
      const reach = Math.min(550, d * 0.14);
      master.setValue(1);
      run = Animated.sequence([
        Animated.timing(master, {
          toValue: 0,
          duration: reach,
          easing: easeContract,
          useNativeDriver: useND,
        }),
        Animated.timing(master, {
          toValue: 0,
          duration: Math.max(0, d - reach),
          useNativeDriver: useND,
        }),
      ]);
    } else if (orb === 'pulse') {
      master.setValue(0.5);
      run = Animated.loop(
        Animated.sequence([
          Animated.timing(master, {
            toValue: 1,
            duration: d * 0.48,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: useND,
          }),
          Animated.timing(master, {
            toValue: 0.5,
            duration: d * 0.52,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: useND,
          }),
        ]),
        { iterations: Math.min(16, Math.max(4, Math.floor(d / 400))) }
      );
    } else {
      master.setValue(0);
      run = Animated.timing(master, {
        toValue: 1,
        duration: d,
        easing: easeExpand,
        useNativeDriver: useND,
      });
    }

    run.start();
    return () => {
      run.stop();
    };
  }, [visualKey, durationMs, orb, master]);

  return (
    <View style={styles.wrap}>
      <View style={[styles.coreGlow, { backgroundColor: accent + '44' }]} />
      {angles.map((angle, i) => {
        const c = PHOTON_COLORS[i % PHOTON_COLORS.length]!;
        const tx = master.interpolate({
          inputRange: [0, 1],
          outputRange: [Math.cos(angle) * R_MIN, Math.cos(angle) * R_MAX],
        });
        const ty = master.interpolate({
          inputRange: [0, 1],
          outputRange: [Math.sin(angle) * R_MIN, Math.sin(angle) * R_MAX],
        });
        const sc = master.interpolate({
          inputRange: [0, 1],
          outputRange: [0.55, 1.15],
        });
        return (
          <Animated.View
            key={`${i}-${visualKey}`}
            pointerEvents="none"
            style={[
              styles.photon,
              {
                left: CORE - PHOTON_R,
                top: CORE - PHOTON_R,
                width: PHOTON_DIAM,
                height: PHOTON_DIAM,
                borderRadius: PHOTON_R,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    left: CORE - 18,
    top: CORE - 18,
  },
  photon: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 4,
    elevation: 6,
  },
});
