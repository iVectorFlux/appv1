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
};

export function ListCard({
  onPress,
  title,
  subtitle,
  icon,
  iconBackgroundColor,
  iconColor,
  leftBorderColor,
}: ListCardProps) {
  const colors = useColors();
  const styles = createStyles(colors);
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
        <Ionicons name={icon} size={24} color={finalIconColor} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        {subtitle != null && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </Pressable>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.floating,
      borderRadius: Radius.xl,
      padding: Spacing.lg,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    pressed: {
      opacity: 0.92,
    },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.md,
    },
    textWrap: {
      flex: 1,
    },
    title: {
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      marginBottom: Spacing.xs,
    },
    subtitle: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
    },
  });
