/**
 * FeatureCard — Bento feature card (6-col)
 *
 * White/bg-accent, 24px radius, badge + title + subtitle + meta, icon right.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
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
  iconColor?: string;
  backgroundColor?: string;
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
  const bg = backgroundColor ?? colors.surfaceAccent;
  const styles = createStyles(colors);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: bg },
        Shadows.card,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.content}>
        {badge != null && (
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
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
        <Ionicons name={icon} size={28} color={iconColor} />
      </View>
    </Pressable>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    card: {
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: colors.border,
    },
    pressed: {
      opacity: 0.96,
    },
    content: {
      flex: 1,
    },
    badge: {
      alignSelf: 'flex-start',
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      borderRadius: Radius.full,
      marginBottom: Spacing.sm,
    },
    badgeText: {
      fontSize: Typography.fontSize.micro,
      fontWeight: Typography.fontWeight.semibold,
      color: '#fff',
      letterSpacing: Typography.letterSpacing.wide,
    },
    title: {
      fontSize: Typography.fontSize.cardTitle,
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
      width: 56,
      height: 56,
      borderRadius: Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: Spacing.md,
    },
  });
