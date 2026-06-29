import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Radius, Typography } from '@/constants/design-tokens';

interface BrinkmanshipPlayProps {
  onComplete?: () => void;
}

export function BrinkmanshipPlay({ onComplete }: BrinkmanshipPlayProps) {
  const colors = useColors();
  const [yourMove, setYourMove] = useState<'swerve' | 'straight' | 'signal' | null>(null);
  const [theirMove, setTheirMove] = useState<'swerve' | 'straight' | null>(null);
  const carPos = useRef(new Animated.Value(0)).current;
  const carPos2 = useRef(new Animated.Value(0)).current;

  const play = (move: 'swerve' | 'straight' | 'signal') => {
    setYourMove(move);
    const theySwerve = Math.random() < (move === 'signal' ? 0.75 : move === 'straight' ? 0.35 : 0.55);
    setTheirMove(theySwerve ? 'swerve' : 'straight');

    carPos.setValue(0);
    carPos2.setValue(0);
    Animated.parallel([
      Animated.timing(carPos, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(carPos2, { toValue: 1, duration: 700, useNativeDriver: true }),
    ]).start();
    onComplete?.();
  };

  const reset = () => {
    setYourMove(null);
    setTheirMove(null);
    carPos.setValue(0);
    carPos2.setValue(0);
  };

  const crash =
    yourMove === 'straight' && theirMove === 'straight';
  const youSwerved = yourMove === 'swerve' || yourMove === 'signal';

  let outcome = '';
  if (yourMove && theirMove) {
    if (crash) outcome = 'Both stayed straight — crash! Everyone loses.';
    else if (youSwerved && theirMove === 'straight') outcome = 'You swerved — they “won” the standoff but risked a crash.';
    else if (yourMove === 'straight' && theirMove === 'swerve') outcome = 'They swerved — you win the standoff (but it was risky).';
    else if (yourMove === 'signal') outcome = 'Your compromise signal helped both swerve — disaster avoided.';
    else outcome = 'Both swerved — safe but nobody looks bold.';
  }

  const slide = carPos.interpolate({ inputRange: [0, 1], outputRange: [0, 24] });
  const slide2 = carPos2.interpolate({ inputRange: [0, 1], outputRange: [0, -24] });

  return (
    <View style={styles.wrap}>
      <Text style={[styles.lead, { color: colors.textSecondary }]}>
        Two cars race toward each other. What do you do?
      </Text>

      <View style={[styles.road, { backgroundColor: colors.glassBorder + '30' }]}>
        <Animated.View style={{ transform: [{ translateY: slide }] }}>
          <Ionicons name="car-sport" size={36} color={colors.primary} />
        </Animated.View>
        <View style={styles.roadLine} />
        <Animated.View style={{ transform: [{ translateY: slide2 }] }}>
          <Ionicons name="car-sport" size={36} color={colors.accentTerracotta} style={{ transform: [{ scaleX: -1 }] }} />
        </Animated.View>
      </View>

      {!yourMove ? (
        <View style={styles.btnCol}>
          <TouchableOpacity
            onPress={() => play('swerve')}
            style={[styles.btn, { borderColor: colors.accentSage, backgroundColor: colors.accentSage + '12' }]}
          >
            <Text style={[styles.btnText, { color: colors.textPrimary }]}>Swerve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => play('straight')}
            style={[styles.btn, { borderColor: colors.accentTerracotta, backgroundColor: colors.accentTerracotta + '12' }]}
          >
            <Text style={[styles.btnText, { color: colors.textPrimary }]}>Stay straight</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => play('signal')}
            style={[styles.btn, { borderColor: colors.primary, backgroundColor: colors.primary + '12' }]}
          >
            <Text style={[styles.btnText, { color: colors.textPrimary }]}>Signal a compromise</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View
          style={[
            styles.result,
            {
              borderColor: crash ? colors.accentTerracotta : colors.accentSage,
              backgroundColor: (crash ? colors.accentTerracotta : colors.accentSage) + '12',
            },
          ]}
        >
          <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>{outcome}</Text>
          <Text style={[styles.resultBody, { color: colors.textSecondary }]}>
            Threats only work if the other side believes you will follow through. A face-saving exit beats silent
            brinkmanship.
          </Text>
          <TouchableOpacity onPress={reset} style={{ marginTop: Spacing.sm }}>
            <Text style={{ color: colors.primary, fontWeight: Typography.fontWeight.semibold }}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.md },
  lead: { fontSize: Typography.fontSize.sm, lineHeight: 20, textAlign: 'center' },
  road: {
    height: 120,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  roadLine: { width: 2, height: '80%', backgroundColor: '#FFF8', borderRadius: 1 },
  btnCol: { gap: Spacing.sm },
  btn: { padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1.5, alignItems: 'center' },
  btnText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold },
  result: { padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.xs },
  resultTitle: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold },
  resultBody: { fontSize: Typography.fontSize.sm, lineHeight: Typography.fontSize.sm * 1.5 },
});
