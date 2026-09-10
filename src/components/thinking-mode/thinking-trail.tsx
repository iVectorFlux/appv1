import React from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';

interface TrailItem {
  id: string;
  label: string;
}

interface ThinkingTrailProps {
  rootLabel: string;
  trail: TrailItem[];
  detourLabel?: string | null;
  onJumpTo: (nodeId: string) => void;
  onBackFromDetour?: () => void;
}

export function ThinkingTrail({ rootLabel, trail, detourLabel, onJumpTo, onBackFromDetour }: ThinkingTrailProps) {
  const colors = useColors();

  return (
    <View style={styles.wrap}>
      {detourLabel && onBackFromDetour ? (
        <TouchableOpacity onPress={onBackFromDetour} style={[styles.detourBar, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '35' }]}>
          <Ionicons name="arrow-back" size={16} color={colors.primary} />
          <Text style={[styles.detourText, { color: colors.primary }]} numberOfLines={1}>
            Continue: {detourLabel}
          </Text>
        </TouchableOpacity>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={() => trail[0] && onJumpTo(trail[0].id)} style={styles.crumb}>
          <Text style={[styles.crumbText, { color: colors.primary }]} numberOfLines={1}>
            {rootLabel.length > 28 ? `${rootLabel.slice(0, 28)}…` : rootLabel}
          </Text>
        </TouchableOpacity>
        {trail.slice(1).map((item) => (
          <React.Fragment key={item.id}>
            <Ionicons name="chevron-forward" size={12} color={colors.textMuted} style={styles.sep} />
            <TouchableOpacity onPress={() => onJumpTo(item.id)} style={styles.crumb}>
              <Text style={[styles.crumbText, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.label.length > 22 ? `${item.label.slice(0, 22)}…` : item.label}
              </Text>
            </TouchableOpacity>
          </React.Fragment>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.xs, marginBottom: Spacing.sm },
  detourBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  detourText: { flex: 1, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
  scroll: { alignItems: 'center', gap: 2, paddingVertical: 4 },
  crumb: { maxWidth: 140 },
  crumbText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.medium },
  sep: { marginHorizontal: 2 },
});
