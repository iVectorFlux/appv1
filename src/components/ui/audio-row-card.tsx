/**
 * AudioRowCard - Editorial row (Journal, podcast list)
 *
 * Icon left, title + subtitle, trailing chevron or play.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Typography, Radius, Shadows } from '@/constants/design-tokens';

export type AudioRowCardProps = {
  onPress: () => void;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBackgroundColor: string;
  iconColor: string;
  accentColor?: string;
  trailingIcon?: 'play-circle' | 'chevron-forward';
};

export function AudioRowCard({
  onPress,
  title,
  subtitle,
  icon,
  iconBackgroundColor,
  iconColor,
  accentColor,
  trailingIcon = 'chevron-forward',
}: AudioRowCardProps) {
  const colors = useColors();
  const styles = createStyles(colors);
  const accent = accentColor ?? iconColor;
  const trailingIconName = trailingIcon === 'chevron-forward' ? 'chevron-forward' : 'play-circle';
  const trailingSize = trailingIcon === 'chevron-forward' ? 18 : 28;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, Shadows.card, pressed && styles.pressed]}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconBackgroundColor }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      <Ionicons
        name={trailingIconName}
        size={trailingSize}
        color={trailingIcon === 'chevron-forward' ? colors.textLight : accent}
      />
    </Pressable>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.md,
      backgroundColor: colors.floating,
      borderRadius: Radius.lg,
      marginBottom: Spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pressed: {
      opacity: 0.88,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    content: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      marginBottom: 2,
    },
    subtitle: {
      fontSize: Typography.fontSize.xs,
      color: colors.textSecondary,
      lineHeight: Typography.fontSize.xs * 1.4,
    },
  });
