/**
 * HeroCard — Main check-in CTA
 *
 * Forest background. Subtitle, meta, and a white CTA button.
 * Greeting and title are rendered by the parent above the card.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
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
              <Text key={i} style={styles.metaText}>{m}</Text>
            ))}
          </View>
        )}
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>{buttonLabel}</Text>
          <Text style={styles.buttonArrow}>→</Text>
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
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
      marginBottom: Spacing.lg,
    },
    metaText: {
      fontSize: Typography.fontSize.sm,
      color: 'rgba(255, 255, 255, 0.85)',
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      backgroundColor: '#FFFFFF',
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderRadius: Radius.sm,
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    buttonPressed: {
      opacity: 0.92,
    },
    buttonText: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.primary,
    },
    buttonArrow: {
      fontSize: Typography.fontSize.base,
      color: colors.primary,
      fontWeight: Typography.fontWeight.medium,
    },
  });
