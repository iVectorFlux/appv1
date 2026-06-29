import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useColors, Spacing, Radius, Typography } from '@/constants/design-tokens';
import type { PayoffMatrixSpec } from '@/data/game-theory-types';

interface PayoffMatrixProps {
  matrix: PayoffMatrixSpec;
  selectedRow?: number | null;
  selectedCol?: number | null;
  onSelectCell?: (row: number, col: number) => void;
}

export function PayoffMatrix({
  matrix,
  selectedRow = null,
  selectedCol = null,
  onSelectCell,
}: PayoffMatrixProps) {
  const colors = useColors();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (selectedRow == null || selectedCol == null) return;
    pulse.setValue(0.92);
    Animated.spring(pulse, { toValue: 1, useNativeDriver: true, friction: 4 }).start();
  }, [selectedRow, selectedCol, pulse]);

  const cell = (row: number, col: number, isHeader = false, label = '') => {
    const selected = selectedRow === row && selectedCol === col;
    const payoff = !isHeader && row >= 0 && col >= 0 ? matrix.payoffs[row][col] : null;

    return (
      <TouchableOpacity
        key={`${row}-${col}-${label}`}
        disabled={isHeader || !onSelectCell}
        onPress={() => onSelectCell?.(row, col)}
        activeOpacity={0.85}
        style={[
          styles.cell,
          {
            borderColor: colors.glassBorder,
            backgroundColor: selected ? colors.primary + '22' : colors.glass,
          },
          isHeader && { backgroundColor: colors.glassBorder + '18' },
        ]}
      >
        {isHeader ? (
          <Text style={[styles.headerText, { color: colors.textSecondary }]} numberOfLines={2}>
            {label}
          </Text>
        ) : (
          <Animated.View style={{ transform: [{ scale: selected ? pulse : 1 }] }}>
            <Text style={[styles.payoff, { color: selected ? colors.primary : colors.textPrimary }]}>
              {payoff ? `(${payoff[0]}, ${payoff[1]})` : ''}
            </Text>
            <Text style={[styles.payoffSub, { color: colors.textMuted }]}>
              {payoff ? `${matrix.rowPlayer} · ${matrix.colPlayer}` : ''}
            </Text>
          </Animated.View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.axis, { color: colors.textMuted }]}>{matrix.colLabel} →</Text>
      <View style={styles.grid}>
        <View style={styles.row}>
          <View style={[styles.corner, { borderColor: colors.glassBorder }]} />
          {matrix.cols.map((c, i) => cell(-1, i, true, c))}
        </View>
        {matrix.rows.map((rowLabel, ri) => (
          <View key={rowLabel} style={styles.row}>
            {cell(ri, -1, true, rowLabel)}
            {matrix.cols.map((_, ci) => cell(ri, ci))}
          </View>
        ))}
      </View>
      <Text style={[styles.rowAxis, { color: colors.textMuted }]}>{matrix.rowLabel} ↓</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.xs },
  axis: { fontSize: Typography.fontSize.xs, textAlign: 'center', marginBottom: 4 },
  rowAxis: { fontSize: Typography.fontSize.xs, marginTop: 4 },
  grid: { gap: 6 },
  row: { flexDirection: 'row', gap: 6 },
  corner: { width: 72, height: 52, borderRadius: Radius.sm, borderWidth: 1 },
  cell: {
    flex: 1,
    minHeight: 52,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
  },
  payoff: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
  },
  payoffSub: { fontSize: 9, textAlign: 'center', marginTop: 2 },
});
