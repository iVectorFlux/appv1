/**
 * iOS/WatchOS Inspired Lotus Breathe Visualizer
 *
 * Renders 6 translucent, overlapping squircle-like oval petals with gorgeous
 * linear gradients. The master breathing animated value drives:
 *  - Radial outward translation (blooming)
 *  - Overlapping petal scale
 *  - Slow circular container rotation
 *  - Organic opacity fade
 *
 * Runs 100% on the native thread for butter-smooth 60fps.
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated, Easing, Platform, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { BreathOrbHint } from '@/data/breathing-techniques';

const useND = Platform.OS !== 'web';
const { width: SCREEN_W } = Dimensions.get('window');

type Props = {
  visualKey: string;
  durationMs: number;
  orb: BreathOrbHint;
  accent: string;
};

// Generates secondary complementary color for rich gradients based on hex input
function getGradientColors(accent: string): [string, string] {
  // Safe fallbacks and beautiful dual-tone mapping
  const c = accent.toLowerCase();
  if (c.includes('#6ea8fe') || c.includes('#38bdf8') || c.includes('#60a5fa')) {
    return [accent, '#a78bfa']; // Ice blue -> Violet
  }
  if (c.includes('#a78bfa') || c.includes('#c77dff')) {
    return [accent, '#f472b6']; // Violet -> Pink
  }
  if (c.includes('#f97316') || c.includes('#fb923c') || c.includes('#f59e0b')) {
    return [accent, '#fda4af']; // Orange/Amber -> Rose
  }
  if (c.includes('#34d399') || c.includes('#2dd4bf') || c.includes('#00ffc6')) {
    return [accent, '#38bdf8']; // Seafoam -> Sky blue
  }
  if (c.includes('#f472b6') || c.includes('#ff2d92')) {
    return [accent, '#a78bfa']; // Pink -> Purple
  }
  return [accent, '#ffffff']; // Default accent -> white overlay
}

export function PhotonBreathCluster({ visualKey, durationMs, orb, accent }: Props) {
  const master = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const d = Math.max(200, durationMs);
    master.stopAnimation();

    const easeExpand = Easing.inOut(Easing.sin);
    const easeContract = Easing.inOut(Easing.sin);

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
      master.setValue(1);
      run = Animated.timing(master, {
        toValue: 1,
        duration: d,
        useNativeDriver: useND,
      });
    } else if (orb === 'holdLow') {
      master.setValue(0);
      run = Animated.timing(master, {
        toValue: 0,
        duration: d,
        useNativeDriver: useND,
      });
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

  // Petals configuration
  const petalCount = 6;
  const maxDistance = 32; // Radial distance petals travel outward

  const [gradStart, gradEnd] = useMemo(() => getGradientColors(accent), [accent]);

  // Interpolations
  const rotation = master.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '50deg'], // Rotate lotus on expansion
  });

  const scale = master.interpolate({
    inputRange: [0, 1],
    outputRange: [0.72, 1.28], // Fluid squish/bloom
  });

  const opacity = master.interpolate({
    inputRange: [0, 1],
    outputRange: [0.28, 0.48], // Soft breathe glow
  });

  const coreScale = master.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1.35],
  });

  const coreOpacity = master.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.36],
  });

  // Calculate petal positioning and transformations
  const petals = useMemo(() => {
    return Array.from({ length: petalCount }, (_, i) => {
      const theta = i * (Math.PI / 3);
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);

      const tx = master.interpolate({
        inputRange: [0, 1],
        outputRange: [0, cos * maxDistance],
      });

      const ty = master.interpolate({
        inputRange: [0, 1],
        outputRange: [0, sin * maxDistance],
      });

      return { tx, ty, angle: `${(i * 60)}deg` };
    });
  }, [master]);

  return (
    <View style={styles.container}>
      {/* Outer ambient metal shadow/glow */}
      <Animated.View
        style={[
          styles.glowRing,
          {
            backgroundColor: gradStart + '10',
            transform: [{ scale: scale }],
            opacity: master,
          },
        ]}
      />

      {/* Rotating Lotus Container */}
      <Animated.View
        style={[
          styles.lotusContainer,
          {
            transform: [{ rotate: rotation }, { scale: scale }],
          },
        ]}
      >
        {petals.map((petal, i) => (
          <Animated.View
            key={`${i}-${visualKey}`}
            pointerEvents="none"
            style={[
              styles.petalWrapper,
              {
                transform: [
                  { translateX: petal.tx },
                  { translateY: petal.ty },
                  { rotate: petal.angle },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={[gradStart + 'a0', gradEnd + '10']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.petal}
            />
          </Animated.View>
        ))}
      </Animated.View>

      {/* Unified soft center core */}
      <Animated.View
        style={[
          styles.centerCore,
          {
            backgroundColor: gradStart,
            transform: [{ scale: coreScale }],
            opacity: coreOpacity,
            ...(Platform.OS === 'ios'
              ? {
                  shadowColor: gradStart,
                  shadowOpacity: 0.65,
                  shadowRadius: 18,
                  shadowOffset: { width: 0, height: 0 },
                }
              : {}),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
  },
  lotusContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petalWrapper: {
    position: 'absolute',
    width: 76,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petal: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  centerCore: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    zIndex: 10,
  },
});

