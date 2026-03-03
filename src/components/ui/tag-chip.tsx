/**
 * Shared tag chip used for emotions, reasons, grounding tags, tone, etc.
 * Same card design across the app.
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';

export type TagChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** When selected, use this color instead of primary (e.g. emotion color) */
  selectedColor?: string;
  /** Optional right element (e.g. close icon for selected chips) */
  rightElement?: React.ReactNode;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export function TagChip({
  label,
  selected,
  onPress,
  selectedColor,
  rightElement,
  disabled = false,
  style,
  textStyle,
}: TagChipProps) {
  const colors = useColors();
  const fill = selected ? (selectedColor ?? colors.primary) : colors.surface;
  const borderColor = selected ? (selectedColor ?? colors.primary) : colors.borderLight;
  const textColor = selected ? (selectedColor ? '#FFFFFF' : colors.primaryForeground) : colors.textPrimary;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[
        styles.chip,
        {
          backgroundColor: fill,
          borderColor,
        },
        style,
      ]}
    >
      <Text style={[styles.chipText, { color: textColor }, textStyle]} numberOfLines={1}>
        {label}
      </Text>
      {rightElement ?? null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
  },
  chipText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.primary,
  },
});

/** Container for a row of tag chips. Use same gap/layout everywhere. */
export const tagGridStyle = (colors: ReturnType<typeof useColors>) => ({
  flexDirection: 'row' as const,
  flexWrap: 'wrap' as const,
  gap: Spacing.sm,
});
