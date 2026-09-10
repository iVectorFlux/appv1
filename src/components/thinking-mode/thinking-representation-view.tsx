import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import type { ThinkingNode } from '@/data/thinking-mode-types';
import { normalizeProcessSteps, pickNodeEmoji } from './thinking-ui-utils';

interface ThinkingRepresentationViewProps {
  node: ThinkingNode;
}

export function ThinkingRepresentationView({ node }: ThinkingRepresentationViewProps) {
  const colors = useColors();
  const steps = normalizeProcessSteps(node.processSteps);
  const [activeStep, setActiveStep] = useState(0);
  const heroEmoji = pickNodeEmoji(node);

  if (node.representation === 'comparison' && steps.length >= 2) {
    const mid = Math.ceil(steps.length / 2);
    const left = steps.slice(0, mid);
    const right = steps.slice(mid);
    return (
      <View style={styles.compareWrap}>
        <View style={[styles.compareCol, { backgroundColor: colors.accentIndigo + '12', borderColor: colors.accentIndigo + '35' }]}>
          <Text style={[styles.compareHead, { color: colors.accentIndigo }]}>This side</Text>
          {left.map((s) => (
            <Text key={s.label} style={[styles.compareItem, { color: colors.textPrimary }]}>
              {s.emoji} {s.label}
            </Text>
          ))}
        </View>
        <View style={[styles.vsBadge, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
          <Text style={{ color: colors.textMuted, fontWeight: Typography.fontWeight.bold }}>vs</Text>
        </View>
        <View style={[styles.compareCol, { backgroundColor: colors.accentSage + '12', borderColor: colors.accentSage + '35' }]}>
          <Text style={[styles.compareHead, { color: colors.accentSage }]}>That side</Text>
          {right.map((s) => (
            <Text key={s.label} style={[styles.compareItem, { color: colors.textPrimary }]}>
              {s.emoji} {s.label}
            </Text>
          ))}
        </View>
      </View>
    );
  }

  if (node.representation === 'timeline' && steps.length > 0) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timelineScroll}>
        {steps.map((s, i) => (
          <View key={s.label} style={styles.timelineItem}>
            <View style={[styles.timelineDot, { backgroundColor: colors.primary }]}>
              <Text style={styles.timelineEmoji}>{s.emoji}</Text>
            </View>
            {i < steps.length - 1 ? (
              <View style={[styles.timelineLine, { backgroundColor: colors.glassBorder }]} />
            ) : null}
            <Text style={[styles.timelineLabel, { color: colors.textPrimary }]}>{s.label}</Text>
          </View>
        ))}
      </ScrollView>
    );
  }

  if (node.representation === 'cause_effect' && steps.length >= 2) {
    const causes = steps.slice(0, -1);
    const effect = steps[steps.length - 1];
    return (
      <View style={styles.causeWrap}>
        <View style={[styles.causeBox, { backgroundColor: colors.accentTerracotta + '10', borderColor: colors.accentTerracotta + '35' }]}>
          <Text style={[styles.causeTitle, { color: colors.accentTerracotta }]}>Because…</Text>
          {causes.map((s) => (
            <Text key={s.label} style={[styles.causeLine, { color: colors.textPrimary }]}>
              {s.emoji} {s.label}
            </Text>
          ))}
        </View>
        <Ionicons name="arrow-down" size={22} color={colors.primary} style={{ alignSelf: 'center' }} />
        <View style={[styles.causeBox, { backgroundColor: colors.accentSage + '12', borderColor: colors.accentSage + '35' }]}>
          <Text style={[styles.causeTitle, { color: colors.accentSage }]}>So…</Text>
          <Text style={[styles.causeLine, { color: colors.textPrimary, fontWeight: Typography.fontWeight.semibold }]}>
            {effect.emoji} {effect.label}
          </Text>
        </View>
      </View>
    );
  }

  if (
    (node.representation === 'flow' || node.representation === 'cause_effect' || node.representation === 'concept_tree') &&
    steps.length > 0
  ) {
    return (
      <View style={styles.flowWrap}>
        {steps.map((s, i) => {
          const on = i === activeStep;
          return (
            <TouchableOpacity
              key={s.label}
              activeOpacity={0.85}
              onPress={() => setActiveStep(i)}
              style={[
                styles.flowCard,
                {
                  borderColor: on ? colors.primary : colors.glassBorder,
                  backgroundColor: on ? colors.primary + '10' : colors.glass,
                },
              ]}
            >
              <View style={[styles.flowNum, { backgroundColor: on ? colors.primary : colors.glassBorder }]}>
                <Text style={[styles.flowNumText, { color: on ? '#FFF' : colors.textMuted }]}>{i + 1}</Text>
              </View>
              <Text style={styles.flowEmoji}>{s.emoji}</Text>
              <Text style={[styles.flowLabel, { color: colors.textPrimary, fontWeight: on ? Typography.fontWeight.semibold : Typography.fontWeight.normal }]}>
                {s.label}
              </Text>
              {on ? <Ionicons name="chevron-down" size={16} color={colors.primary} /> : null}
            </TouchableOpacity>
          );
        })}
        <Text style={[styles.flowHint, { color: colors.textMuted }]}>Tap each step to focus on it</Text>
      </View>
    );
  }

  return (
    <View style={[styles.sceneCard, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '25' }]}>
      <Text style={styles.sceneEmoji}>{heroEmoji}</Text>
      {node.visualizationHint ? (
        <Text style={[styles.sceneText, { color: colors.textPrimary }]}>{node.visualizationHint}</Text>
      ) : (
        <Text style={[styles.sceneText, { color: colors.textSecondary }]}>Picture the idea like a short scene in your head.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  compareWrap: { flexDirection: 'row', alignItems: 'stretch', gap: Spacing.xs },
  compareCol: { flex: 1, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.sm, gap: 6 },
  compareHead: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold, marginBottom: 4 },
  compareItem: { fontSize: Typography.fontSize.sm, lineHeight: 20 },
  vsBadge: {
    alignSelf: 'center',
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineScroll: { gap: Spacing.md, paddingVertical: Spacing.xs },
  timelineItem: { width: 120, alignItems: 'center' },
  timelineDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  timelineEmoji: { fontSize: 20 },
  timelineLine: { position: 'absolute', top: 22, left: 88, width: 60, height: 2 },
  timelineLabel: { fontSize: Typography.fontSize.xs, textAlign: 'center', lineHeight: 16 },
  causeWrap: { gap: Spacing.sm },
  causeBox: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, gap: 6 },
  causeTitle: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
  causeLine: { fontSize: Typography.fontSize.sm, lineHeight: 20 },
  flowWrap: { gap: Spacing.sm },
  flowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
  },
  flowNum: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  flowNumText: { fontSize: 11, fontWeight: Typography.fontWeight.bold },
  flowEmoji: { fontSize: 18 },
  flowLabel: { flex: 1, fontSize: Typography.fontSize.sm, lineHeight: 20 },
  flowHint: { fontSize: Typography.fontSize.xs, textAlign: 'center', marginTop: 2 },
  sceneCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sceneEmoji: { fontSize: 48 },
  sceneText: { fontSize: Typography.fontSize.sm, lineHeight: 22, textAlign: 'center' },
});
