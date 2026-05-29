import React from 'react';
import {
  View,
  StyleSheet,
  Platform,
  TouchableOpacity,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useColors, Radius, Glass, Shadows } from '@/constants/design-tokens';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  intensity?: number;
  borderRadius?: number;
  noPadding?: boolean;
  tint?: 'light' | 'dark';
  backgroundColor?: string;
  borderColor?: string;
}

export function GlassCard({
  children,
  style,
  onPress,
  intensity = Glass.intensity,
  borderRadius = Radius.lg,
  noPadding,
  tint,
  backgroundColor,
  borderColor,
}: GlassCardProps) {
  const colors = useColors();

  const finalTint = tint ?? (colors.glassTint as 'light' | 'dark');
  const finalBgColor = backgroundColor ?? colors.glass;
  const finalBorderColor = borderColor ?? colors.glassBorder;

  const shadow: ViewStyle =
    Platform.OS === 'web'
      ? ({ ...(Shadows.glass as object) } as ViewStyle)
      : (Shadows.glass as ViewStyle);

  const cardBase: ViewStyle = {
    borderRadius,
    overflow: 'hidden' as const,
    ...shadow,
  };

  const webGlass: ViewStyle = Platform.OS === 'web'
    ? ({
        backgroundColor: finalBgColor,
        backdropFilter: `blur(${Glass.blur}px) saturate(160%)`,
        WebkitBackdropFilter: `blur(${Glass.blur}px) saturate(160%)`,
        borderWidth: 1,
        borderColor: finalBorderColor,
      } as any)
    : {};

  const inner = (
    <View style={[styles.inner, noPadding && styles.noPadding]}>
      {/* Top highlight line for depth */}
      <View style={[styles.highlight, { backgroundColor: colors.glassHighlight }]} />
      {children}
    </View>
  );

  if (Platform.OS === 'web') {
    const Wrapper = onPress ? TouchableOpacity : View;
    return (
      <Wrapper
        style={[cardBase, webGlass, style]}
        {...(onPress ? { onPress, activeOpacity: 0.82 } : {})}
      >
        {inner}
      </Wrapper>
    );
  }

  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      style={[cardBase, { borderWidth: 1, borderColor: finalBorderColor }, style]}
      {...(onPress ? { onPress, activeOpacity: 0.85 } : {})}
    >
      <BlurView
        intensity={intensity}
        tint={finalTint}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: finalBgColor }]} />
      {inner}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  inner: {
    flex: 1,
    padding: 16,
    position: 'relative',
  },
  noPadding: {
    padding: 0,
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: 1,
    borderRadius: 1,
    opacity: 0.7,
  },
});
