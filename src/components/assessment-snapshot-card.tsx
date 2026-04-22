/**
 * Last completed EQ and Big Five scores (Progress home block).
 * Retake anytime — we always show the most recent result when present.
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/glass-card';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import { assessmentTypeLabel, formatShortDate } from '@/lib/home-assessment-summary';
import { formatBig5ScoresLine } from '@/services/profile-context';
import type { Big5Scores } from '@/services/big5-scoring';

export type LastEqSnapshot = {
  overallScore: number;
  assessmentType: 'check_in' | 'full_test';
  completedAt: string;
} | null;

export type LastBig5Snapshot = {
  scores: Big5Scores;
  completedAt: string;
} | null;

export function AssessmentSnapshotCard({
  loading,
  lastEq,
  lastBig5,
  onPressEq,
  onPressBig5,
}: {
  loading: boolean;
  lastEq: LastEqSnapshot;
  lastBig5: LastBig5Snapshot;
  onPressEq: () => void;
  onPressBig5: () => void;
}) {
  const colors = useColors();
  const st = createStyles(colors);

  if (loading) {
    return (
      <GlassCard borderRadius={Radius.lg} style={st.card}>
        <View style={st.loadingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={st.muted}>Loading assessments…</Text>
        </View>
      </GlassCard>
    );
  }

  return (
    <GlassCard borderRadius={Radius.lg} style={st.card}>
      <View style={st.row}>
        <Ionicons name="heart-outline" size={20} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={st.kicker}>Emotional intelligence (EQ)</Text>
          {lastEq ? (
            <Text style={st.body}>
              <Text style={st.em}>Last score {lastEq.overallScore}</Text>
              {' · '}
              {assessmentTypeLabel(lastEq.assessmentType)}
              {formatShortDate(lastEq.completedAt) ? ` · ${formatShortDate(lastEq.completedAt)}` : ''}
            </Text>
          ) : (
            <Text style={st.body}>Not taken yet — start a check-in or full test when you are ready.</Text>
          )}
          <TouchableOpacity onPress={onPressEq} style={st.linkRow} activeOpacity={0.7} accessibilityRole="button">
            <Text style={st.link}>{lastEq ? 'Retake or continue' : 'Start EQ'}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[st.row, { marginTop: Spacing.lg, paddingTop: Spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight }]}>
        <Ionicons name="color-wand-outline" size={20} color={colors.accentIndigo} />
        <View style={{ flex: 1 }}>
          <Text style={st.kicker}>Big Five personality</Text>
          {lastBig5 ? (
            <>
              <Text style={st.traits} numberOfLines={3} selectable={Platform.OS === 'web'}>
                {formatBig5ScoresLine(lastBig5.scores)}
              </Text>
              {formatShortDate(lastBig5.completedAt) ? (
                <Text style={[st.body, { marginTop: 4 }]}>
                  Last completed {formatShortDate(lastBig5.completedAt)}
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={st.body}>Not taken yet — about 5–10 minutes for a trait snapshot.</Text>
          )}
          <TouchableOpacity onPress={onPressBig5} style={st.linkRow} activeOpacity={0.7} accessibilityRole="button">
            <Text style={st.link}>{lastBig5 ? 'Retake test' : 'Start Big Five'}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </GlassCard>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    card: { padding: Spacing.md },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.xs,
    },
    muted: { fontSize: Typography.fontSize.sm, color: colors.textMuted },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
    kicker: {
      fontSize: Typography.fontSize.micro,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      marginBottom: 2,
    },
    body: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      lineHeight: Typography.fontSize.sm * 1.45,
    },
    traits: {
      fontSize: Typography.fontSize.sm,
      color: colors.textPrimary,
      lineHeight: Typography.fontSize.sm * 1.45,
      fontWeight: Typography.fontWeight.medium,
    },
    em: { fontWeight: Typography.fontWeight.bold, color: colors.textPrimary },
    linkRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.sm },
    link: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, color: colors.primary },
  });
