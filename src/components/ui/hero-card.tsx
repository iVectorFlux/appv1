/**
 * HeroCard – Primary CTA card (Learn-style hierarchy)
 *
 * Full primary background, icon left, title + subtitle, chevron right.
 * Use for the single main action (e.g. Check in).
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Typography, Radius, Shadows } from '@/constants/design-tokens';

export type HeroCardProps = {
  onPress: () => void;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export function HeroCard({ onPress, title, subtitle, icon }: HeroCardProps) {
  const colors = useColors();
  const styles = createStyles(colors);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, Shadows.hero, pressed && styles.pressed]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={32} color={colors.primaryForeground} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color={colors.primaryForeground} />
    </Pressable>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderRadius: Radius['2xl'],
      padding: Spacing['2xl'],
      marginBottom: Spacing.xl,
      overflow: 'hidden',
    },
    pressed: {
      opacity: 0.96,
    },
    iconWrap: {
      width: 60,
      height: 60,
      borderRadius: Radius.lg,
      backgroundColor: 'rgba(255, 255, 255, 0.22)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.lg,
    },
    textWrap: {
      flex: 1,
    },
    title: {
      fontSize: Typography.fontSize.xl,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.primaryForeground,
      marginBottom: Spacing.xs,
    },
    subtitle: {
      fontSize: Typography.fontSize.sm,
      color: 'rgba(255, 255, 255, 0.88)',
    },
  });
