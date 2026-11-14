import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  Pressable,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors, Radius, Shadows } from '@/constants/design-tokens';

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
  gradientColors?: readonly [string, string, ...string[]];
  gradientStart?: { x: number; y: number };
  gradientEnd?: { x: number; y: number };
  disabled?: boolean;
}

/**
 * Shadcn-inspired Enterprise Card with crisp 1px borders, optional gradient surface,
 * clean inner spacing pass-through, and subtle web hover states when interactive.
 */
export function GlassCard({
  children,
  style,
  onPress,
  borderRadius = Radius.xl,
  noPadding,
  backgroundColor,
  borderColor,
  gradientColors,
  gradientStart = { x: 0, y: 0 },
  gradientEnd = { x: 1, y: 1 },
  disabled,
}: GlassCardProps) {
  const colors = useColors();
  const [hovered, setHovered] = useState(false);

  const flatStyle = StyleSheet.flatten(style) || {};
  const {
    alignItems,
    justifyContent,
    flexDirection,
    alignContent,
    flexWrap,
    gap,
    rowGap,
    columnGap,
    padding,
    paddingHorizontal,
    paddingVertical,
    paddingTop,
    paddingBottom,
    paddingLeft,
    paddingRight,
    ...wrapperStyle
  } = flatStyle;

  const hasCustomPadding =
    padding !== undefined ||
    paddingHorizontal !== undefined ||
    paddingVertical !== undefined ||
    paddingTop !== undefined ||
    paddingBottom !== undefined ||
    paddingLeft !== undefined ||
    paddingRight !== undefined;

  const customInnerLayout: ViewStyle = {
    ...(alignItems !== undefined ? { alignItems } : {}),
    ...(justifyContent !== undefined ? { justifyContent } : {}),
    ...(flexDirection !== undefined ? { flexDirection } : {}),
    ...(alignContent !== undefined ? { alignContent } : {}),
    ...(flexWrap !== undefined ? { flexWrap } : {}),
    ...(gap !== undefined ? { gap } : {}),
    ...(rowGap !== undefined ? { rowGap } : {}),
    ...(columnGap !== undefined ? { columnGap } : {}),
    ...(padding !== undefined ? { padding } : {}),
    ...(paddingHorizontal !== undefined ? { paddingHorizontal } : {}),
    ...(paddingVertical !== undefined ? { paddingVertical } : {}),
    ...(paddingTop !== undefined ? { paddingTop } : {}),
    ...(paddingBottom !== undefined ? { paddingBottom } : {}),
    ...(paddingLeft !== undefined ? { paddingLeft } : {}),
    ...(paddingRight !== undefined ? { paddingRight } : {}),
  };

  const finalBgColor = backgroundColor ?? colors.glass;
  const finalBorderColor =
    borderColor ?? (hovered && onPress && !disabled ? colors.primary + '66' : colors.border);

  const cardBase: ViewStyle = {
    borderRadius,
    backgroundColor: finalBgColor,
    borderWidth: 1,
    borderColor: finalBorderColor,
    overflow: 'hidden',
    ...(Shadows.card as ViewStyle),
    ...(Platform.OS === 'web' && onPress && !disabled
      ? ({
          cursor: 'pointer',
          transition: 'border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease',
        } as ViewStyle)
      : {}),
    ...(Platform.OS === 'web' && hovered && onPress && !disabled ? (Shadows.md as ViewStyle) : {}),
  };

  const inner = (
    <View
      style={[
        styles.inner,
        (noPadding || hasCustomPadding) && styles.noPadding,
        customInnerLayout,
      ]}
    >
      {children}
    </View>
  );

  const gradientBg = gradientColors ? (
    <LinearGradient
      colors={gradientColors}
      start={gradientStart}
      end={gradientEnd}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
  ) : null;

  if (onPress) {
    return (
      <Pressable
        onPress={disabled ? undefined : onPress}
        disabled={disabled}
        onHoverIn={Platform.OS === 'web' ? () => setHovered(true) : undefined}
        onHoverOut={Platform.OS === 'web' ? () => setHovered(false) : undefined}
        style={({ pressed }) => [
          cardBase,
          pressed && !disabled && { opacity: 0.92 },
          disabled && { opacity: 0.6 },
          wrapperStyle,
        ]}
      >
        {gradientBg}
        {inner}
      </Pressable>
    );
  }

  return (
    <View style={[cardBase, wrapperStyle]}>
      {gradientBg}
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  inner: {
    flex: 1,
    padding: 18,
    position: 'relative',
  },
  noPadding: {
    padding: 0,
  },
});
