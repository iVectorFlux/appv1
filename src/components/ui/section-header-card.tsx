/**
 * SectionHeaderCard - Editorial section header
 *
 * Icon left, title (17px semibold) + subtitle (13px). Used for "Learn", "Insights", etc.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';

export type SectionHeaderCardProps = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBackgroundColor?: string;
  iconColor?: string;
};

export function SectionHeaderCard({
  title,
  subtitle,
  icon,
  iconBackgroundColor,
  iconColor,
}: SectionHeaderCardProps) {
  const colors = useColors();
  const styles = createStyles(colors);
  const bg = iconBackgroundColor ?? colors.primary + '18';
  const iconC = iconColor ?? colors.primary;

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={24} color={iconC} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      marginBottom: Spacing.lg,
    },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textWrap: {
      flex: 1,
    },
    title: {
      fontSize: Typography.fontSize.cardTitle,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      marginTop: 2,
    },
  });
