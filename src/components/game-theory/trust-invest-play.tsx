import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Radius, Typography } from '@/constants/design-tokens';

interface TrustInvestPlayProps {
  onComplete?: () => void;
}

export function TrustInvestPlay({ onComplete }: TrustInvestPlayProps) {
  const colors = useColors();
  const [sent, setSent] = useState<number | null>(null);
  const [returned, setReturned] = useState<number | null>(null);
  const pot = 10;
  const multiplier = 3;

  const invest = (amount: number) => {
    setSent(amount);
    if (amount === 0) {
      setReturned(0);
    } else {
      const tripled = amount * multiplier;
      const giveBack = Math.random() < 0.65 ? Math.round(tripled * 0.45) : 0;
      setReturned(giveBack);
    }
    onComplete?.();
  };

  const reset = () => {
    setSent(null);
    setReturned(null);
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.lead, { color: colors.textSecondary }]}>
        You have ${pot}. Send some to a partner — it triples in their hands. Will they send money back?
      </Text>

      {sent == null ? (
        <View style={styles.row}>
          {[0, 3, 5, 10].map((amt) => (
            <TouchableOpacity
              key={amt}
              onPress={() => invest(amt)}
              style={[styles.chip, { borderColor: colors.primary, backgroundColor: colors.primary + '12' }]}
            >
              <Text style={[styles.chipText, { color: colors.textPrimary }]}>
                {amt === 0 ? 'Keep all' : `Send $${amt}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={[styles.result, { borderColor: colors.primary + '40', backgroundColor: colors.primary + '10' }]}>
          {sent === 0 ? (
            <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>You kept all ${pot}. Safe, but no shared gain.</Text>
          ) : (
            <>
              <Ionicons name="flash-outline" size={24} color={colors.primary} />
              <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>
                You sent ${sent} → it became ${sent * multiplier} for them.
              </Text>
              <Text style={[styles.resultBody, { color: colors.textSecondary }]}>
                {returned && returned > 0
                  ? `They returned $${returned}! Trust paid off this time.`
                  : 'They returned $0. Without trust, nobody invests — and everyone misses the bigger pie.'}
              </Text>
            </>
          )}
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
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'center' },
  chip: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, borderRadius: Radius.lg, borderWidth: 1.5 },
  chipText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold },
  result: { padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.sm, alignItems: 'center' },
  resultTitle: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold, textAlign: 'center' },
  resultBody: { fontSize: Typography.fontSize.sm, lineHeight: Typography.fontSize.sm * 1.5, textAlign: 'center' },
});
