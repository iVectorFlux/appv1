import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  Pressable,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
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
  disabled?: boolean;
}

/**
 * Shadcn-inspired Enterprise Card with crisp 1px borders, neutral elevation,
 * and subtle web hover states when interactive.
 */
export function GlassCard({
  children,
  style,
  onPress,
  borderRadius = Radius.lg,
  noPadding,
  backgroundColor,
  borderColor,
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
    ...wrapperStyle
  } = flatStyle;

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
    ...(Platform.OS === 'web' && onPress && !disabled ? ({ cursor: 'pointer', transition: 'border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease' } as ViewStyle) : {}),
    ...(Platform.OS === 'web' && hovered && onPress && !disabled ? (Shadows.md as ViewStyle) : {}),
  };

  const inner = (
    <View
      style={[
        styles.inner,
        noPadding && styles.noPadding,
        { alignItems, justifyContent, flexDirection, alignContent },
      ]}
    >
      {children}
    </View>
  );

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
        {inner}
      </Pressable>
    );
  }

  return <View style={[cardBase, wrapperStyle]}>{inner}</View>;
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
});
