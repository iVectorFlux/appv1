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

      {/* Subtle secondary gradient for depth */}
      <LinearGradient
        colors={[
          isDark ? 'rgba(99,135,255,0.06)' : 'rgba(160,190,220,0.10)',
          'transparent',
          isDark ? 'rgba(74,222,128,0.04)' : 'rgba(160,210,180,0.06)',
        ]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.8, y: 0 }}
        end={{ x: 0.2, y: 1 }}
      />

      {/* Soft ambient glow spots — NOT bold colored circles */}
      <View
        style={[
          styles.glow,
          {
            width: SW * 0.7,
            height: SW * 0.7,
            top: -SW * 0.15,
            right: -SW * 0.2,
            backgroundColor: isDark ? 'rgba(99,135,255,0.06)' : 'rgba(160,195,220,0.12)',
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
            backgroundColor: isDark ? 'rgba(120,80,200,0.05)' : 'rgba(170,160,210,0.08)',
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
