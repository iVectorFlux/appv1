/**
 * ModuleCard – Learn-style grid card
 *
 * Centralized design: icon container, title, subtitle/dimension, meta badges.
 * Use for quick actions, modules, and list items.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Typography, Radius, Shadows } from '@/constants/design-tokens';

export type ModuleCardMetaItem = {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
};

export type ModuleCardProps = {
  onPress: () => void;
  title: string;
  subtitle?: string; // dimension name or short description
  meta?: ModuleCardMetaItem[];
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBackgroundColor: string; // e.g. color + '20'
  /** Card width: 'full' | 'half' (grid). Default 'half'. */
  width?: 'full' | 'half';
  /** Tighter padding and smaller icon for quick-action grids. */
  compact?: boolean;
};

export function ModuleCard({
  onPress,
  title,
  subtitle,
  meta,
  icon,
  iconColor,
  iconBackgroundColor,
  width = 'half',
  compact = false,
}: ModuleCardProps) {
  const colors = useColors();
  const styles = createStyles(colors, compact);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        width === 'full' ? styles.cardFull : styles.cardHalf,
        Shadows.sm,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconBackgroundColor }]}>
        <Ionicons name={icon} size={compact ? 22 : 28} color={iconColor} />
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      {subtitle != null && <Text style={styles.subtitle}>{subtitle}</Text>}
      {meta != null && meta.length > 0 && (
        <View style={styles.meta}>
          {meta.map((item, i) => (
            <View key={i} style={styles.metaItem}>
              <Ionicons name={item.icon} size={12} color={colors.textMuted} />
              <Text style={styles.metaText}>{item.text}</Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>, compact?: boolean) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.floating,
      borderRadius: compact ? Radius.lg : Radius.xl,
      padding: compact ? Spacing.md : Spacing.lg,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    cardHalf: {
      width: '47%',
    },
    cardFull: {
      width: '100%',
    },
    pressed: {
      opacity: 0.92,
    },
    iconWrap: {
      width: compact ? 36 : 48,
      height: compact ? 36 : 48,
      borderRadius: compact ? Radius.md : Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: compact ? Spacing.sm : Spacing.md,
    },
    title: {
      fontSize: compact ? Typography.fontSize.sm : Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      marginBottom: Spacing.xs,
      lineHeight: Typography.lineHeight.tight * (compact ? Typography.fontSize.sm : Typography.fontSize.base),
    },
    subtitle: {
      fontSize: Typography.fontSize.xs,
      color: colors.textSecondary,
      marginBottom: Spacing.md,
    },
    meta: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontSize: Typography.fontSize.xs,
      color: colors.textMuted,
    },
  });
