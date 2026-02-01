/**
 * AudioRowCard – Learn-style podcast/audio row
 *
 * Icon left (44×44, tint bg), title + subtitle, play-circle right.
 * Used for Deep Dive Podcasts list and similar rows.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';

export type AudioRowCardProps = {
  onPress: () => void;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBackgroundColor: string;
  iconColor: string;
  /** Accent for trailing play icon. Defaults to iconColor. */
  accentColor?: string;
  /** Trailing icon: 'play-circle' (default) or 'chevron-forward' for list-style rows. */
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
  trailingIcon = 'play-circle',
}: AudioRowCardProps) {
  const colors = useColors();
  const styles = createStyles(colors);
  const accent = accentColor ?? iconColor;
  const trailingIconName = trailingIcon === 'chevron-forward' ? 'chevron-forward' : 'play-circle';
  const trailingSize = trailingIcon === 'chevron-forward' ? 22 : 32;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconBackgroundColor }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <Ionicons name={trailingIconName} size={trailingSize} color={trailingIcon === 'chevron-forward' ? colors.textSecondary : accent} />
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
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    pressed: {
      opacity: 0.8,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      flex: 1,
    },
    title: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.medium,
      color: colors.textPrimary,
      marginBottom: 2,
    },
    subtitle: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
    },
  });
