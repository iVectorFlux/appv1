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
        colors={
          isDark
            ? ['rgba(59, 130, 246, 0.14)', 'rgba(99, 102, 241, 0.06)', 'rgba(13, 148, 136, 0.05)']
            : ['rgba(37, 99, 235, 0.08)', 'rgba(99, 102, 241, 0.04)', 'rgba(20, 184, 166, 0.04)']
        }
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            width: SW * 0.65,
            height: SW * 0.65,
            top: -SW * 0.3,
            right: -SW * 0.16,
            backgroundColor: isDark ? 'rgba(99, 102, 241, 0.10)' : 'rgba(79, 70, 229, 0.06)',
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            width: SW * 0.5,
            height: SW * 0.5,
            bottom: -SW * 0.22,
            left: -SW * 0.15,
            backgroundColor: isDark ? 'rgba(13, 148, 136, 0.07)' : 'rgba(14, 165, 233, 0.05)',
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
