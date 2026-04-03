/**
 * HeroCard — Main check-in CTA
 *
 * Forest background. Subtitle, meta, and a white CTA button.
 * Greeting and title are rendered by the parent above the card.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Typography, Radius, Shadows } from '@/constants/design-tokens';

export type HeroCardProps = {
  onPress: () => void;
  subtitle: string;
  /** e.g. ["2 min", "Track mood & energy"] */
  meta?: string[];
  buttonLabel?: string;
};

export function HeroCard({
  onPress,
  subtitle,
  meta,
  buttonLabel = 'Begin check-in',
}: HeroCardProps) {
  const colors = useColors();
  const styles = createStyles(colors);

  return (
    <View style={[styles.card, Shadows.hero]}>
      <View style={styles.inner}>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {meta != null && meta.length > 0 && (
          <View style={styles.metaRow}>
            {meta.map((m, i) => (
              <View key={i} style={styles.metaPill}>
                <Text style={styles.metaText}>{m}</Text>
              </View>
            ))}
          </View>
        )}
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>{buttonLabel}</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.primary,
      borderRadius: Radius.xl,
      padding: Spacing.lg,
      overflow: 'hidden',
    },
    inner: {
      paddingVertical: Spacing.xs,
    },
    subtitle: {
      fontSize: Typography.fontSize.lg,
      color: 'rgba(255, 255, 255, 0.95)',
      marginBottom: Spacing.md,
      lineHeight: Typography.fontSize.lg * Typography.lineHeight.relaxed,
      fontWeight: Typography.fontWeight.normal,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
      marginBottom: Spacing.lg,
    },
    metaPill: {
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
    },
    metaText: {
      fontSize: Typography.fontSize.xs,
      color: 'rgba(255, 255, 255, 0.9)',
      fontWeight: Typography.fontWeight.medium,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      backgroundColor: '#FFFFFF',
      paddingVertical: Spacing.sm + 4,
      paddingHorizontal: Spacing.lg,
      borderRadius: Radius.md,
      alignSelf: 'flex-start',
    },
    buttonPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.98 }],
    },
    buttonText: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.primary,
    },
  });
