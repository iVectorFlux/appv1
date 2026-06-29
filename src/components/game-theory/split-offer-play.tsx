import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Radius, Typography } from '@/constants/design-tokens';

export type SplitOfferVariant = 'ultimatum' | 'dictator' | 'divide';

const SHARE_OPTIONS = [0, 25, 50, 75, 100];

interface SplitOfferPlayProps {
  variant: SplitOfferVariant;
  pot?: number;
  onComplete?: () => void;
}

export function SplitOfferPlay({ variant, pot = 10, onComplete }: SplitOfferPlayProps) {
  const colors = useColors();
  const [yourSharePct, setYourSharePct] = useState(50);
  const [submitted, setSubmitted] = useState(false);

  const youGet = Math.round((yourSharePct / 100) * pot);
  const theirShare = pot - youGet;

  const submit = () => {
    setSubmitted(true);
    onComplete?.();
  };

  const reset = () => {
    setYourSharePct(50);
    setSubmitted(false);
  };

  const title =
    variant === 'ultimatum'
      ? 'Make an offer — they can accept or reject'
      : variant === 'dictator'
        ? 'You decide the split — they cannot say no'
        : 'Pick your share — if both sides are too greedy, nobody gets paid';

  let outcome = '';
  let lesson = '';

  if (submitted) {
    if (variant === 'ultimatum') {
      if (youGet <= pot * 0.6) {
        outcome = `They accept! You keep $${youGet}, they get $${theirShare}.`;
        lesson = 'Fair-ish offers usually get accepted. Very greedy offers often get rejected — even when that means $0 for both.';
      } else {
        outcome = 'They reject! Both get $0.';
        lesson = 'People punish unfair splits even when it hurts them too.';
      }
    } else if (variant === 'dictator') {
      outcome = `You keep $${youGet}, they receive $${theirShare}.`;
      lesson =
        theirShare > 0
          ? 'Many people still share something even with total power — kindness and norms matter.'
          : 'Keeping everything is the selfish move, but real people often give a little anyway.';
    } else {
      const greedy = youGet > pot * 0.6;
      outcome = greedy
        ? `You claim $${youGet} — if they also grab too much, the pot vanishes.`
        : `You claim $${youGet} — a reasonable ask keeps the split alive.`;
      lesson = 'Agree on a split that fits the real budget, or everyone loses.';
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={[styles.potBadge, { backgroundColor: colors.accentSage + '18' }]}>
        <Ionicons name="wallet-outline" size={20} color={colors.accentSage} />
        <Text style={[styles.potText, { color: colors.textPrimary }]}>${pot} to split</Text>
      </View>

      <Text style={[styles.lead, { color: colors.textSecondary }]}>{title}</Text>

      {!submitted ? (
        <>
          <Text style={[styles.shareLabel, { color: colors.textPrimary }]}>
            You get <Text style={{ color: colors.primary, fontWeight: '700' }}>${youGet}</Text>
            {' · '}
            They get ${theirShare}
          </Text>
          <View style={styles.shareRow}>
            {SHARE_OPTIONS.map((pct) => (
              <TouchableOpacity
                key={pct}
                onPress={() => setYourSharePct(pct)}
                style={[
                  styles.shareChip,
                  {
                    borderColor: yourSharePct === pct ? colors.primary : colors.glassBorder,
                    backgroundColor: yourSharePct === pct ? colors.primary + '18' : colors.glass,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: Typography.fontSize.xs,
                    fontWeight: Typography.fontWeight.bold,
                    color: yourSharePct === pct ? colors.primary : colors.textSecondary,
                  }}
                >
                  {pct === 0 ? 'Keep all' : pct === 50 ? 'Half' : pct === 100 ? 'Give all' : `${pct}%`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={submit} style={[styles.submitBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.submitText}>Submit offer</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={[styles.result, { borderColor: colors.primary + '40', backgroundColor: colors.primary + '10' }]}>
          <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>{outcome}</Text>
          <Text style={[styles.resultBody, { color: colors.textSecondary }]}>{lesson}</Text>
          <TouchableOpacity onPress={reset} style={{ marginTop: Spacing.sm }}>
            <Text style={{ color: colors.primary, fontWeight: Typography.fontWeight.semibold }}>Try another split</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.md },
  potBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.lg,
  },
  potText: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold },
  lead: { fontSize: Typography.fontSize.sm, lineHeight: 20, textAlign: 'center' },
  shareLabel: { fontSize: Typography.fontSize.sm, textAlign: 'center' },
  shareRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, justifyContent: 'center' },
  shareChip: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm, borderRadius: Radius.md, borderWidth: 1 },
  submitBtn: { paddingVertical: Spacing.md, borderRadius: Radius.lg, alignItems: 'center' },
  submitText: { color: '#FFF', fontWeight: Typography.fontWeight.bold, fontSize: Typography.fontSize.sm },
  result: { padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.xs },
  resultTitle: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold },
  resultBody: { fontSize: Typography.fontSize.sm, lineHeight: Typography.fontSize.sm * 1.5 },
});
