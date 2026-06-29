import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Radius, Typography } from '@/constants/design-tokens';
import type { PayoffMatrixSpec } from '@/data/game-theory-types';

type Phase = 'you' | 'them' | 'result';

interface MatrixDuelPlayProps {
  matrix: PayoffMatrixSpec;
  onComplete?: () => void;
}

export function MatrixDuelPlay({ matrix, onComplete }: MatrixDuelPlayProps) {
  const colors = useColors();
  const [phase, setPhase] = useState<Phase>('you');
  const [yourRow, setYourRow] = useState<number | null>(null);
  const [theirCol, setTheirCol] = useState<number | null>(null);
  const fade = useRef(new Animated.Value(0)).current;

  const animateIn = useCallback(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, [fade]);

  const pickYourMove = (row: number) => {
    setYourRow(row);
    setPhase('them');
    animateIn();
  };

  const pickTheirMove = (col: number) => {
    setTheirCol(col);
    setPhase('result');
    onComplete?.();
    animateIn();
  };

  const randomOpponent = () => {
    const col = Math.floor(Math.random() * matrix.cols.length);
    pickTheirMove(col);
  };

  const reset = () => {
    setPhase('you');
    setYourRow(null);
    setTheirCol(null);
    fade.setValue(0);
  };

  const payoff =
    yourRow != null && theirCol != null ? matrix.payoffs[yourRow][theirCol] : null;

  return (
    <View style={styles.wrap}>
      {phase === 'you' ? (
        <>
          <Text style={[styles.lead, { color: colors.textSecondary }]}>
            Step 1 — What do <Text style={{ fontWeight: '700' }}>you</Text> do?
          </Text>
          <View style={styles.btnCol}>
            {matrix.rows.map((label, i) => (
              <TouchableOpacity
                key={label}
                onPress={() => pickYourMove(i)}
                style={[styles.bigBtn, { borderColor: colors.primary, backgroundColor: colors.primary + '12' }]}
              >
                <Ionicons name="person-outline" size={22} color={colors.primary} />
                <Text style={[styles.bigBtnText, { color: colors.textPrimary }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : null}

      {phase === 'them' ? (
        <Animated.View style={{ opacity: fade, gap: Spacing.md }}>
          <Text style={[styles.lead, { color: colors.textSecondary }]}>
            You chose:{' '}
            <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
              {yourRow != null ? matrix.rows[yourRow] : ''}
            </Text>
          </Text>
          <Text style={[styles.lead, { color: colors.textSecondary }]}>
            Step 2 — What does <Text style={{ fontWeight: '700' }}>{matrix.colPlayer}</Text> do?
          </Text>
          <View style={styles.btnCol}>
            {matrix.cols.map((label, i) => (
              <TouchableOpacity
                key={label}
                onPress={() => pickTheirMove(i)}
                style={[styles.bigBtn, { borderColor: colors.accentIndigo, backgroundColor: colors.accentIndigo + '12' }]}
              >
                <Ionicons name="people-outline" size={22} color={colors.accentIndigo} />
                <Text style={[styles.bigBtnText, { color: colors.textPrimary }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={randomOpponent} style={styles.randomBtn}>
            <Ionicons name="shuffle-outline" size={16} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: Typography.fontWeight.semibold }}>
              Random opponent
            </Text>
          </TouchableOpacity>
        </Animated.View>
      ) : null}

      {phase === 'result' && payoff ? (
        <Animated.View style={{ opacity: fade, gap: Spacing.md }}>
          <View style={[styles.scoreCard, { borderColor: colors.primary + '40', backgroundColor: colors.primary + '10' }]}>
            <Text style={[styles.scoreTitle, { color: colors.textPrimary }]}>Result</Text>
            <Text style={[styles.scoreLine, { color: colors.textPrimary }]}>
              You: {matrix.rows[yourRow!]} · Them: {matrix.cols[theirCol!]}
            </Text>
            <View style={styles.payoffRow}>
              <View style={[styles.payoffPill, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.payoffNum, { color: colors.primary }]}>{payoff[0]}</Text>
                <Text style={[styles.payoffWho, { color: colors.textMuted }]}>Your points</Text>
              </View>
              <View style={[styles.payoffPill, { backgroundColor: colors.accentIndigo + '20' }]}>
                <Text style={[styles.payoffNum, { color: colors.accentIndigo }]}>{payoff[1]}</Text>
                <Text style={[styles.payoffWho, { color: colors.textMuted }]}>Their points</Text>
              </View>
            </View>
          </View>

          <MiniMatrix
            matrix={matrix}
            highlightRow={yourRow}
            highlightCol={theirCol}
            colors={colors}
          />

          <Text style={[styles.note, { color: colors.textSecondary }]}>{matrix.equilibriumNote}</Text>

          <TouchableOpacity onPress={reset}>
            <Text style={{ color: colors.primary, fontWeight: Typography.fontWeight.semibold, textAlign: 'center' }}>
              Try another combination
            </Text>
          </TouchableOpacity>
        </Animated.View>
      ) : null}
    </View>
  );
}

function MiniMatrix({
  matrix,
  highlightRow,
  highlightCol,
  colors,
}: {
  matrix: PayoffMatrixSpec;
  highlightRow: number | null;
  highlightCol: number | null;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.miniGrid, { borderColor: colors.glassBorder }]}>
      <Text style={[styles.miniLabel, { color: colors.textMuted }]}>Payoff table</Text>
      <View style={styles.miniRow}>
        <View style={styles.miniCorner} />
        {matrix.cols.map((c) => (
          <Text key={c} style={[styles.miniHeader, { color: colors.textSecondary }]} numberOfLines={1}>
            {c}
          </Text>
        ))}
      </View>
      {matrix.rows.map((row, ri) => (
        <View key={row} style={styles.miniRow}>
          <Text style={[styles.miniHeader, { color: colors.textSecondary }]} numberOfLines={1}>
            {row}
          </Text>
          {matrix.cols.map((_, ci) => {
            const p = matrix.payoffs[ri][ci];
            const hit = highlightRow === ri && highlightCol === ci;
            return (
              <View
                key={`${ri}-${ci}`}
                style={[
                  styles.miniCell,
                  {
                    backgroundColor: hit ? colors.primary + '25' : colors.glass,
                    borderColor: hit ? colors.primary : colors.glassBorder,
                  },
                ]}
              >
                <Text style={[styles.miniPayoff, { color: hit ? colors.primary : colors.textPrimary }]}>
                  {p[0]}, {p[1]}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.md },
  lead: { fontSize: Typography.fontSize.sm, lineHeight: 20, textAlign: 'center' },
  btnCol: { gap: Spacing.sm },
  bigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
  },
  bigBtnText: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, flex: 1 },
  randomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  scoreCard: { padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.sm },
  scoreTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold },
  scoreLine: { fontSize: Typography.fontSize.sm },
  payoffRow: { flexDirection: 'row', gap: Spacing.sm },
  payoffPill: { flex: 1, padding: Spacing.sm, borderRadius: Radius.md, alignItems: 'center' },
  payoffNum: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold },
  payoffWho: { fontSize: Typography.fontSize.xs, marginTop: 2 },
  note: { fontSize: Typography.fontSize.sm, lineHeight: Typography.fontSize.sm * 1.5, textAlign: 'center' },
  miniGrid: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.sm, gap: 4 },
  miniLabel: { fontSize: Typography.fontSize.xs, textAlign: 'center', marginBottom: 4 },
  miniRow: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  miniCorner: { width: 56, height: 28 },
  miniHeader: { flex: 1, fontSize: 9, fontWeight: Typography.fontWeight.semibold, textAlign: 'center' },
  miniCell: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  miniPayoff: { fontSize: 10, fontWeight: Typography.fontWeight.bold },
});
