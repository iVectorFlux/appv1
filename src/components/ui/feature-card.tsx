/**
 * FeatureCard – Learn-style featured/hero card
 *
 * Centralized design: badge (optional), title, subtitle, meta row, icon on right.
 * Use for primary CTAs and featured content.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Typography, Radius, Shadows } from '@/constants/design-tokens';

export type FeatureCardMetaItem = {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
};

export type FeatureCardProps = {
  onPress: () => void;
  title: string;
  subtitle?: string;
  badge?: string;
  meta?: FeatureCardMetaItem[];
  icon: keyof typeof Ionicons.glyphMap;
  iconBackgroundColor: string;
  iconColor?: string; // default '#fff' for contrast on accent
  backgroundColor: string; // e.g. color + '15' for tint
};

export function FeatureCard({
  onPress,
  title,
  subtitle,
  badge,
  meta,
  icon,
  iconBackgroundColor,
  iconColor = '#fff',
  backgroundColor,
}: FeatureCardProps) {
  const colors = useColors();
  const styles = createStyles(colors);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor },
        Shadows.sm,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.content}>
        {badge != null && (
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
            <Ionicons name="star" size={12} color="#fff" />
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
        <Text style={styles.title}>{title}</Text>
        {subtitle != null && <Text style={styles.subtitle}>{subtitle}</Text>}
        {meta != null && meta.length > 0 && (
          <View style={styles.meta}>
            {meta.map((item, i) => (
              <View key={i} style={styles.metaItem}>
                <Ionicons name={item.icon} size={14} color={colors.textSecondary} />
                <Text style={styles.metaText}>{item.text}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <View style={[styles.iconWrap, { backgroundColor: iconBackgroundColor }]}>
        <Ionicons name={icon} size={32} color={iconColor} />
      </View>
    </Pressable>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    card: {
      marginHorizontal: Spacing.lg,
      borderRadius: Radius.xl,
      padding: Spacing.xl,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    pressed: {
      opacity: 0.96,
    },
    content: {
      flex: 1,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      borderRadius: Radius.full,
      alignSelf: 'flex-start',
      marginBottom: Spacing.sm,
    },
    badgeText: {
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.semibold,
      color: '#fff',
    },
    title: {
      fontSize: Typography.fontSize.xl,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
      marginBottom: Spacing.xs,
    },
    subtitle: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      marginBottom: Spacing.md,
    },
    meta: {
      flexDirection: 'row',
      gap: Spacing.md,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    metaText: {
      fontSize: Typography.fontSize.xs,
      color: colors.textSecondary,
    },
    iconWrap: {
      width: 64,
      height: 64,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: Spacing.md,
    },
  });
