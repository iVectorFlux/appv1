/**
 * ListCard – Icon-left row card (journal, recover, insights list items)
 *
 * Centralized design: icon left, title, optional subtitle, chevron right.
 * Use for secondary CTAs and list-style cards.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Typography, Radius, Shadows } from '@/constants/design-tokens';

export type ListCardProps = {
  onPress: () => void;
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBackgroundColor: string;
  iconColor?: string;
  /** Optional left border accent (e.g. primary) */
  leftBorderColor?: string;
  /** Tighter padding and smaller icon */
  compact?: boolean;
};

export function ListCard({
  onPress,
  title,
  subtitle,
  icon,
  iconBackgroundColor,
  iconColor,
  leftBorderColor,
  compact = false,
}: ListCardProps) {
  const colors = useColors();
  const styles = createStyles(colors, compact);
  const finalIconColor = iconColor ?? colors.primary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        leftBorderColor != null && { borderLeftWidth: 4, borderLeftColor: leftBorderColor },
        Shadows.card,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconBackgroundColor }]}>
        <Ionicons name={icon} size={compact ? 20 : 24} color={finalIconColor} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle != null && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={compact ? 18 : 20} color={colors.textSecondary} />
    </Pressable>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>, compact?: boolean) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.floating,
      borderRadius: compact ? Radius.lg : Radius.xl,
      padding: compact ? Spacing.md : Spacing.lg,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    pressed: {
      opacity: 0.92,
    },
    iconWrap: {
      width: compact ? 40 : 48,
      height: compact ? 40 : 48,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: compact ? Spacing.sm : Spacing.md,
    },
    textWrap: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      fontSize: compact ? Typography.fontSize.base : Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      marginBottom: compact ? 0 : Spacing.xs,
    },
    subtitle: {
      fontSize: Typography.fontSize.xs,
      color: colors.textSecondary,
      marginTop: compact ? 2 : 0,
    },
  });
