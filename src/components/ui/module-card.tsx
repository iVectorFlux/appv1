/**
 * ModuleCard — Bento grid card (stats / competency / course)
 *
 * White bg, 24px radius, 24px padding. Icon, label, large number or title, subtitle.
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
  subtitle?: string;
  meta?: ModuleCardMetaItem[];
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBackgroundColor: string;
  width?: 'full' | 'half';
  compact?: boolean;
  /** Horizontal wide card for one row of quick actions (icon + title only) */
  horizontal?: boolean;
  /** Optional large number (e.g. streak) */
  value?: string | number;
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
  horizontal = false,
  value,
}: ModuleCardProps) {
  const colors = useColors();
  const styles = createStyles(colors, compact, horizontal);

  if (horizontal) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          styles.cardHorizontal,
          width === 'full' && styles.cardFull,
          Shadows.card,
          pressed && styles.pressed,
        ]}
      >
        <View style={[styles.iconWrapHorizontal, { backgroundColor: iconBackgroundColor }]}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        <Text style={styles.titleHorizontal} numberOfLines={1}>{title}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        width === 'full' ? styles.cardFull : styles.cardHalf,
        Shadows.card,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, { backgroundColor: iconBackgroundColor }]}>
          <Ionicons name={icon} size={compact ? 22 : 26} color={iconColor} />
        </View>
        {value != null && (
          <Text style={styles.value}>{value}</Text>
        )}
      </View>
      <Text style={styles.title} numberOfLines={2}>{title}</Text>
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

const createStyles = (colors: ReturnType<typeof useColors>, compact?: boolean, horizontal?: boolean) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.floating,
      borderRadius: Radius.lg,
      padding: horizontal ? Spacing.sm : (compact ? Spacing.lg : Spacing.lg),
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHorizontal: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      minWidth: 0,
    },
    iconWrapHorizontal: {
      width: 36,
      height: 36,
      borderRadius: Radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    titleHorizontal: {
      flex: 1,
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
    },
    cardHalf: {
      flex: 1,
      minWidth: '47%',
    },
    cardFull: {
      width: '100%',
    },
    pressed: {
      opacity: 0.92,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: compact ? Spacing.sm : Spacing.md,
    },
    iconWrap: {
      width: compact ? 40 : 48,
      height: compact ? 40 : 48,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    value: {
      fontSize: Typography.fontSize.largeNumber,
      fontWeight: Typography.fontWeight.medium,
      color: colors.textPrimary,
      letterSpacing: Typography.letterSpacing.tight,
    },
    title: {
      fontSize: compact ? Typography.fontSize.cardTitle : Typography.fontSize.cardTitle,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      marginBottom: Spacing.xs,
    },
    subtitle: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      marginBottom: Spacing.sm,
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
