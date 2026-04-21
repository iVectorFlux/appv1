import React from 'react';
import { View, StyleSheet, Dimensions, type ViewStyle, type StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/constants/design-tokens';

const { width: SW, height: SH } = Dimensions.get('window');

interface GlassBackgroundProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function GlassBackground({ children, style }: GlassBackgroundProps) {
  const colors = useColors();
  const isDark = colors.glassTint === 'dark';

  return (
    <View style={[styles.container, style]}>
      {/* Smooth mesh-style gradient — three stops for depth */}
      <LinearGradient
        colors={[
          colors.backgroundGradientStart,
          colors.backgroundGradientEnd,
          colors.background,
        ]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Warm editorial wash — sage / terracotta / sand at very low opacity */}
      <LinearGradient
        colors={[
          isDark ? 'rgba(61,139,110,0.07)' : 'rgba(196,164,132,0.08)',
          'transparent',
          isDark ? 'rgba(224,122,95,0.05)' : 'rgba(61,139,110,0.06)',
        ]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.85, y: 0 }}
        end={{ x: 0.15, y: 1 }}
      />

      {/* Soft ambient glow — warm sand + forest (light), muted sage (dark) */}
      <View
        style={[
          styles.glow,
          {
            width: SW * 0.7,
            height: SW * 0.7,
            top: -SW * 0.15,
            right: -SW * 0.2,
            backgroundColor: isDark ? 'rgba(77,166,122,0.06)' : 'rgba(224,122,95,0.07)',
          },
        ]}
      />
      <View
        style={[
          styles.glow,
          {
            width: SW * 0.6,
            height: SW * 0.6,
            bottom: SH * 0.15,
            left: -SW * 0.15,
            backgroundColor: isDark ? 'rgba(124,141,224,0.05)' : 'rgba(45,71,57,0.05)',
          },
        ]}
      />

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    borderRadius: 9999,
  },
});
