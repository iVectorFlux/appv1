import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useColors, Spacing, Radius, Typography } from '@/constants/design-tokens';

interface Step {
  id: string;
  label: string;
}

interface CompetencySprintStepperProps {
  currentStage: 'primer' | 'learn' | 'drills' | 'guided' | 'independent' | 'escalated' | 'report';
}

const STAGES: Step[] = [
  { id: 'primer', label: 'Primer' },
  { id: 'learn', label: 'Skills' },
  { id: 'drills', label: 'Drills' },
  { id: 'guided', label: 'Guided' },
  { id: 'independent', label: 'Unguided' },
  { id: 'escalated', label: 'Escalated' },
  { id: 'report', label: 'Report' },
];

export function CompetencySprintStepper({ currentStage }: CompetencySprintStepperProps) {
  const colors = useColors();

  const getStageIndex = (stage: string): number => {
    return STAGES.findIndex((s) => s.id === stage);
  };

  const currentIndex = getStageIndex(currentStage);

  const styles = StyleSheet.create({
    container: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      backgroundColor: colors.glass,
      borderBottomWidth: 1,
      borderBottomColor: colors.glassBorder,
      width: '100%',
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    stepItem: {
      flex: 1,
      alignItems: 'center',
      position: 'relative',
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      zIndex: 2,
    },
    line: {
      position: 'absolute',
      top: 5,
      height: 2,
      left: '50%',
      right: '-50%',
      zIndex: 1,
    },
    label: {
      marginTop: Spacing.xs,
      fontFamily: Typography.fontFamily.primary,
      fontSize: 10,
      fontWeight: Typography.fontWeight.semibold,
      textAlign: 'center',
      ...(Platform.OS === 'web' ? { textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' } : {}),
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.stepRow}>
        {STAGES.map((step, idx) => {
          const isCompleted = idx < currentIndex;
          const isActive = idx === currentIndex;

          const dotColor = isCompleted
            ? colors.success
            : isActive
              ? colors.primary
              : colors.glassBorder;

          const labelColor = isActive
            ? colors.textPrimary
            : isCompleted
              ? colors.textSecondary
              : colors.textMuted;

          const lineColor = idx < currentIndex ? colors.success : colors.glassBorder;

          return (
            <View key={step.id} style={styles.stepItem}>
              <View style={[styles.dot, { backgroundColor: dotColor }]} />
              {idx < STAGES.length - 1 && (
                <View style={[styles.line, { backgroundColor: lineColor }]} />
              )}
              <Text numberOfLines={1} style={[styles.label, { color: labelColor }]}>
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
