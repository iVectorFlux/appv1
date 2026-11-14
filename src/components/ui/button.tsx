/**
 * Button - Shadcn UI-inspired Enterprise Button System
 *
 * Variants:
 * - primary / default: crisp enterprise Cobalt / Slate ink fill
 * - secondary: subtle Slate surface fill with border
 * - outline: clean white/dark surface with crisp 1px border
 * - ghost: transparent hoverable action
 * - destructive: semantic danger action
 */

import React, { useState } from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  Platform,
  View,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Radius, Typography, Shadows } from '@/constants/design-tokens';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  style,
}: ButtonProps) {
  const colors = useColors();
  const [hovered, setHovered] = useState(false);

  const isPrimary = variant === 'primary' || variant === 'default';
  const isSecondary = variant === 'secondary';
  const isOutline = variant === 'outline';
  const isGhost = variant === 'ghost';
  const isDestructive = variant === 'destructive';
  const isDark = colors.glassTint === 'dark';

  const bg = isPrimary
    ? colors.primary
    : isDestructive
      ? colors.destructive
      : isSecondary
        ? colors.surface
        : isOutline
          ? colors.floating
          : isGhost && hovered
            ? colors.surface
            : 'transparent';

  const fg = isPrimary
    ? colors.primaryForeground
    : isDestructive
      ? colors.destructiveForeground
      : isSecondary || isOutline
        ? colors.textPrimary
        : colors.primary;

  const buttonStyle: ViewStyle = {
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    overflow: 'hidden',
    backgroundColor: isPrimary ? 'transparent' : bg,
    ...(isPrimary && { ...(Shadows.sm as ViewStyle) }),
    ...(isOutline && { borderWidth: 1, borderColor: colors.border }),
    ...(isSecondary && { borderWidth: 1, borderColor: colors.borderLight }),
    ...(size === 'sm' && { paddingVertical: 8, paddingHorizontal: 14, minHeight: 36 }),
    ...(size === 'md' && { paddingVertical: 11, paddingHorizontal: Spacing.lg, minHeight: 42 }),
    ...(size === 'lg' && { paddingVertical: 13, paddingHorizontal: Spacing.xl, minHeight: 48 }),
    ...(fullWidth && { width: '100%' }),
    ...(disabled && { opacity: 0.48 }),
    ...(Platform.OS === 'web'
      ? ({
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          transition: 'opacity 150ms ease, background-color 150ms ease, transform 100ms ease',
        } as ViewStyle)
      : {}),
  };

  const textStyle: TextStyle = {
    fontFamily: Typography.fontFamily.primary,
    fontWeight: Typography.fontWeight.semibold,
    color: fg,
    ...(size === 'sm' && { fontSize: Typography.fontSize.xs }),
    ...(size === 'md' && { fontSize: Typography.fontSize.sm }),
    ...(size === 'lg' && { fontSize: Typography.fontSize.base }),
  };

  const iconSize = size === 'sm' ? 14 : 17;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      onHoverIn={Platform.OS === 'web' ? () => setHovered(true) : undefined}
      onHoverOut={Platform.OS === 'web' ? () => setHovered(false) : undefined}
      style={({ pressed }) => [
        buttonStyle,
        hovered && !disabled && !loading && { opacity: 0.92 },
        pressed && !disabled && !loading && { opacity: 0.85 },
        style,
      ]}
    >
      {isPrimary ? (
        <LinearGradient
          colors={isDark ? ['#3B82F6', '#6366F1'] : ['#2563EB', '#4F46E5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {icon ? <Ionicons name={icon} size={iconSize} color={fg} /> : null}
          <Text style={textStyle} numberOfLines={1}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
