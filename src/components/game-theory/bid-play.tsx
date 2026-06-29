import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Radius, Typography } from '@/constants/design-tokens';

interface BidPlayProps {
  variant: 'first_price' | 'second_price';
  trueValue?: number;
  onComplete?: () => void;
}

export function BidPlay({ variant, trueValue = 100, onComplete }: BidPlayProps) {
  const colors = useColors();
  const [bid, setBid] = useState<number | null>(null);
  const rivalBid = Math.round(trueValue * (0.85 + Math.random() * 0.1));

  const options = [
    { label: 'Low bid', value: Math.round(trueValue * 0.7) },
    { label: 'Fair bid', value: trueValue },
    { label: 'High bid', value: Math.round(trueValue * 1.15) },
  ];

  const submit = (value: number) => {
    setBid(value);
    onComplete?.();
  };

  const reset = () => setBid(null);

  const won = bid != null && bid > rivalBid;
  const pay =
    variant === 'first_price'
      ? won
        ? bid
        : 0
      : won
        ? Math.max(rivalBid, Math.round(trueValue * 0.75))
        : 0;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.lead, { color: colors.textSecondary }]}>
        Item worth about ${trueValue} to you.{' '}
        {variant === 'first_price'
          ? 'Highest bid wins and pays their bid.'
          : 'Highest bid wins but pays the second-highest bid.'}
      </Text>

      {bid == null ? (
        <View style={styles.col}>
          {options.map((o) => (
            <TouchableOpacity
              key={o.label}
              onPress={() => submit(o.value)}
              style={[styles.btn, { borderColor: colors.primary, backgroundColor: colors.primary + '12' }]}
            >
              <Text style={[styles.btnLabel, { color: colors.textPrimary }]}>{o.label}</Text>
              <Text style={[styles.btnValue, { color: colors.primary }]}>${o.value}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={[styles.result, { borderColor: colors.primary + '40', backgroundColor: colors.primary + '10' }]}>
          <Ionicons name={won ? 'trophy-outline' : 'close-circle-outline'} size={28} color={won ? colors.accentSage : colors.textMuted} />
          <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>
            {won ? `You win! You pay $${pay}.` : `You lose — rival bid $${rivalBid}.`}
          </Text>
          <Text style={[styles.resultBody, { color: colors.textSecondary }]}>
            {variant === 'second_price'
              ? 'In a second-price auction, bidding your true value is the smart move — you only pay the next-highest bid.'
              : 'In a first-price auction, bidding too high eats your profit. Bid below your true value to stay safe.'}
          </Text>
          <TouchableOpacity onPress={reset} style={{ marginTop: Spacing.sm }}>
            <Text style={{ color: colors.primary, fontWeight: Typography.fontWeight.semibold }}>Bid again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.md },
  lead: { fontSize: Typography.fontSize.sm, lineHeight: 20, textAlign: 'center' },
  col: { gap: Spacing.sm },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
  },
  btnLabel: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
  btnValue: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold },
  result: { padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.sm, alignItems: 'center' },
  resultTitle: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold, textAlign: 'center' },
  resultBody: { fontSize: Typography.fontSize.sm, lineHeight: Typography.fontSize.sm * 1.5, textAlign: 'center' },
});
