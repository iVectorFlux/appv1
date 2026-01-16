/**
 * Button Component
 * 
 * Reusable button following design system tokens.
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { useColors, Spacing, Radius, Typography, Shadows } from '@/constants/design-tokens';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
}: ButtonProps) {
  const colors = useColors();
  
  const buttonStyle: ViewStyle = {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
    ...(variant === 'primary' && { backgroundColor: colors.primary }),
    ...(variant === 'secondary' && { backgroundColor: colors.secondary }),
    ...(variant === 'ghost' && { backgroundColor: 'transparent', shadowOpacity: 0 }),
    ...(size === 'sm' && { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, minHeight: 36 }),
    ...(size === 'md' && { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, minHeight: 44 }),
    ...(size === 'lg' && { paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xl, minHeight: 52 }),
    ...(fullWidth && { width: '100%' }),
    ...(disabled && { opacity: 0.5 }),
  };

  const textStyle: TextStyle = {
    fontFamily: Typography.fontFamily.primary,
    fontWeight: Typography.fontWeight.semibold,
    ...(variant === 'primary' && { color: colors.primaryForeground }),
    ...(variant === 'secondary' && { color: colors.secondaryForeground }),
    ...(variant === 'ghost' && { color: colors.primary }),
    ...(size === 'sm' && { fontSize: Typography.fontSize.sm }),
    ...(size === 'md' && { fontSize: Typography.fontSize.base }),
    ...(size === 'lg' && { fontSize: Typography.fontSize.lg }),
    ...(disabled && { opacity: 0.7 }),
  };

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.primaryForeground : colors.primary}
          size="small"
        />
      ) : (
        <Text style={textStyle}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}
