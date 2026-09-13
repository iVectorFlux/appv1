/**
 * Full-page play view for one interactive.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GlassBackground } from '@/components/ui/glass-background';
import { ScreenHeader } from '@/components/ui/screen-header';
import { InteractiveFrame } from '@/components/interactive/interactive-frame';
import { getInteractiveById } from '@/data/interactive-catalog';
import { useColors, Spacing } from '@/constants/design-tokens';

export default function InteractiveFullScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const item = getInteractiveById(String(id ?? ''));

  if (!item) {
    return (
      <GlassBackground>
        <ScreenHeader title="Interactive" backFallbackHref="/interactive" />
        <View style={styles.centered}>
          <Text style={{ color: colors.textSecondary }}>Interactive not found.</Text>
          <TouchableOpacity onPress={() => router.replace('/interactive' as never)}>
            <Text style={{ color: colors.primary, marginTop: Spacing.md }}>Back to Interactive</Text>
          </TouchableOpacity>
        </View>
      </GlassBackground>
    );
  }

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <ScreenHeader title={item.title} backFallbackHref="/interactive" />
      <View style={styles.stage}>
        <InteractiveFrame file={item.file} mode="mobile" title={item.title} fill />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  stage: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
});
