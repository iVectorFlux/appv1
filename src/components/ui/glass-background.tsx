import React from 'react';
import { View, StyleSheet, useWindowDimensions, type ViewStyle, type StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/constants/design-tokens';

interface GlassBackgroundProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Crisp enterprise Slate/Zinc canvas with subtle top atmospheric gradient.
 */
export function GlassBackground({ children, style }: GlassBackgroundProps) {
  const colors = useColors();
  const isDark = colors.glassTint === 'dark';
  const { width: SW } = useWindowDimensions();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, style]}>
      <LinearGradient
        colors={[
          isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(37, 99, 235, 0.04)',
          'transparent',
          isDark ? 'rgba(99, 102, 241, 0.04)' : 'rgba(79, 70, 229, 0.02)',
        ]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
      />
      <View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            width: SW * 0.55,
            height: SW * 0.55,
            top: -SW * 0.25,
            right: -SW * 0.12,
            backgroundColor: isDark ? 'rgba(59, 130, 246, 0.07)' : 'rgba(37, 99, 235, 0.05)',
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
