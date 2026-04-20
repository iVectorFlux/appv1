/**
 * EQ + Big Five text snapshot (used on Progress).
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/glass-card';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import {
  assessmentTypeLabel,
  formatShortDate,
  latestByType,
  latestOverall,
  type EqScoreSnapshot,
} from '@/lib/home-assessment-summary';

export function AssessmentSnapshotCard({
  loading,
  snapshots,
  big5CompletedAt,
}: {
  loading: boolean;
  snapshots: EqScoreSnapshot[];
  big5CompletedAt: string | null;
}) {
  const colors = useColors();
  const latest = latestOverall(snapshots);
  const lastCheckIn = latestByType(snapshots, 'check_in');
  const lastFull = latestByType(snapshots, 'full_test');
  const st = createStyles(colors);

  return (
    <GlassCard borderRadius={Radius.lg} style={st.card}>
      {loading ? (
        <View style={st.loadingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={st.muted}>Loading your snapshot…</Text>
        </View>
      ) : (
        <>
          <View style={st.row}>
            <Ionicons name="heart-outline" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={st.kicker}>EQ</Text>
              {latest ? (
                <Text style={st.body}>
                  Latest score <Text style={st.em}>{latest.overallScore}</Text>
                  {' · '}
                  {assessmentTypeLabel(latest.assessmentType)}
                  {formatShortDate(latest.completedAt) ? ` · ${formatShortDate(latest.completedAt)}` : ''}
                </Text>
              ) : (
                <Text style={st.body}>No completed EQ session yet — start a check-in or full test from Assessments on Home.</Text>
              )}
            </View>
          </View>
          <View style={[st.row, { marginTop: Spacing.sm }]}>
            <Ionicons name="git-compare-outline" size={20} color={colors.accentIndigo} />
            <View style={{ flex: 1 }}>
              <Text style={st.kicker}>Check-in vs full test</Text>
              <Text style={st.body}>
                {lastCheckIn
                  ? `Last check-in: ${lastCheckIn.overallScore} · ${formatShortDate(lastCheckIn.completedAt) ?? ''}`
                  : 'No check-in yet'}
                {' · '}
                {lastFull
                  ? `Full test: ${lastFull.overallScore} · ${formatShortDate(lastFull.completedAt) ?? ''}`
                  : 'Full test: not completed'}
              </Text>
            </View>
          </View>
          <View style={[st.row, { marginTop: Spacing.sm }]}>
            <Ionicons name="color-wand-outline" size={20} color={colors.accentIndigo} />
            <View style={{ flex: 1 }}>
              <Text style={st.kicker}>Big Five</Text>
              <Text style={st.body}>
                {big5CompletedAt
                  ? `Last completed ${formatShortDate(big5CompletedAt) ?? ''}`
                  : 'Not completed yet — open Big Five from Assessments on Home.'}
              </Text>
            </View>
          </View>
        </>
      )}
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
    em: { fontWeight: Typography.fontWeight.bold, color: colors.textPrimary },
  });
