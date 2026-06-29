import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import type { MathExplanation } from '@/data/game-theory-math';

export function MathExplanationPanel({ math }: { math: MathExplanation }) {
  const colors = useColors();

  return (
    <View style={[styles.card, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{math.title}</Text>
      <Text style={[styles.intro, { color: colors.textSecondary }]}>{math.intro}</Text>

      <Text style={[styles.stepsHeading, { color: colors.primary }]}>How it works</Text>
      {math.steps.map((step, i) => (
        <View key={step} style={styles.stepRow}>
          <View style={[styles.stepNum, { backgroundColor: colors.primary + '18' }]}>
            <Text style={[styles.stepNumText, { color: colors.primary }]}>{i + 1}</Text>
          </View>
          <Text style={[styles.stepText, { color: colors.textSecondary }]}>{step}</Text>
        </View>
      ))}

      {math.formula ? (
        <View style={[styles.formulaBox, { borderColor: colors.primary + '35', backgroundColor: colors.primary + '08' }]}>
          <Text style={[styles.formulaLabel, { color: colors.primary }]}>The numbers</Text>
          <Text style={[styles.formula, { color: colors.textPrimary }]}>{math.formula}</Text>
        </View>
      ) : null}

      <View style={[styles.takeawayBox, { borderColor: colors.accentSage + '40', backgroundColor: colors.accentSage + '10' }]}>
        <Text style={[styles.takeawayLabel, { color: colors.accentSage }]}>Remember</Text>
        <Text style={[styles.takeaway, { color: colors.textPrimary }]}>{math.takeaway}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  title: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  intro: {
    fontSize: Typography.fontSize.sm,
    lineHeight: Typography.fontSize.sm * 1.55,
  },
  stepsHeading: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: Spacing.xs,
  },
  stepRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumText: { fontSize: 11, fontWeight: Typography.fontWeight.bold },
  stepText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    lineHeight: Typography.fontSize.sm * 1.5,
  },
  formulaBox: {
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: 4,
  },
  formulaLabel: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  formula: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    lineHeight: 20,
  },
  takeawayBox: {
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: 4,
  },
  takeawayLabel: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  takeaway: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    lineHeight: Typography.fontSize.sm * 1.5,
  },
});
