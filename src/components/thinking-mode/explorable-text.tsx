import React from 'react';
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useColors, Typography, Spacing, Radius } from '@/constants/design-tokens';
import type { ThinkingConceptLink } from '@/data/thinking-mode-types';

interface ExplorableTextProps {
  text: string;
  concepts: ThinkingConceptLink[];
  onExploreConcept: (term: string) => void;
}

/** Renders explanation with [bracketed] terms as tappable concept links. */
export function ExplorableText({ text, concepts, onExploreConcept }: ExplorableTextProps) {
  const colors = useColors();
  const conceptTerms = new Set(concepts.map((c) => c.term.toLowerCase()));

  const parts = text.split(/(\[[^\]]+\])/g);

  return (
    <Text style={[styles.body, { color: colors.textSecondary }]}>
      {parts.map((part, i) => {
        const match = part.match(/^\[(.+)\]$/);
        if (match) {
          const term = match[1];
          const isConcept = conceptTerms.has(term.toLowerCase());
          if (isConcept) {
            return (
              <Text key={`${term}-${i}`} onPress={() => onExploreConcept(term)} suppressHighlighting>
                <Text style={[styles.link, { color: colors.primary, backgroundColor: colors.primary + '14' }]}>
                  {term}
                </Text>
              </Text>
            );
          }
          return (
            <Text key={`${term}-${i}`} style={{ fontWeight: Typography.fontWeight.semibold, color: colors.textPrimary }}>
              {term}
            </Text>
          );
        }
        return <Text key={`t-${i}`}>{part}</Text>;
      })}
    </Text>
  );
}

interface ConceptChipProps {
  concept: ThinkingConceptLink;
  onPress: () => void;
}

export function ConceptChip({ concept, onPress }: ConceptChipProps) {
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, { borderColor: colors.primary + '40', backgroundColor: colors.primary + '10' }]}
    >
      <Text style={[styles.chipTerm, { color: colors.primary }]}>{concept.term}</Text>
      <Text style={[styles.chipReason, { color: colors.textMuted }]} numberOfLines={2}>
        {concept.reason}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: Typography.fontSize.sm, lineHeight: Typography.fontSize.sm * 1.6 },
  link: {
    fontWeight: Typography.fontWeight.bold,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  chip: {
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: 2,
  },
  chipTerm: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold },
  chipReason: { fontSize: Typography.fontSize.xs, lineHeight: 16 },
});
