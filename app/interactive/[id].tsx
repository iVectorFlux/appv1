/**
 * Full mobile view for one interactive — phone chrome, no desktop.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassBackground } from '@/components/ui/glass-background';
import { ScreenHeader } from '@/components/ui/screen-header';
import { InteractiveFrame } from '@/components/interactive/interactive-frame';
import { getInteractiveById, type InteractiveViewMode } from '@/data/interactive-catalog';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';

const MODES: { id: InteractiveViewMode; label: string }[] = [
  { id: 'pill', label: '💊 Pill' },
  { id: 'drawer', label: '📱 Drawer' },
  { id: 'mobile', label: '📲 Full mobile' },
];

export default function InteractiveFullScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const item = getInteractiveById(String(id ?? ''));
  const [mode, setMode] = useState<InteractiveViewMode>('mobile');

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
    <GlassBackground>
      <ScreenHeader title={item.title} backFallbackHref="/interactive" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.modeRow}>
          {MODES.map((m) => {
            const on = mode === m.id;
            return (
              <TouchableOpacity
                key={m.id}
                onPress={() => setMode(m.id)}
                style={[
                  styles.modeBtn,
                  {
                    backgroundColor: on ? item.accent : colors.glass,
                    borderColor: on ? item.accent : colors.glassBorder,
                  },
                ]}
              >
                <Text style={[styles.modeBtnText, { color: on ? '#FFF' : colors.textSecondary }]}>{m.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Phone-only views. Pill is the compact lesson chip, drawer is the bottom card, full mobile is the 375×540
          screen.
        </Text>

        <View style={styles.phoneWrap}>
          <View style={[styles.phoneChrome, { borderColor: colors.glassBorder, backgroundColor: '#0F172A' }]}>
            <View style={styles.notch} />
            <View style={styles.screen}>
              <InteractiveFrame
                file={item.file}
                mode={mode}
                title={item.title}
                height={mode === 'pill' ? 220 : 540}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, paddingBottom: Spacing['5xl'], gap: Spacing.md },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  modeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  modeBtnText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold },
  hint: { fontSize: Typography.fontSize.sm, lineHeight: 20 },
  phoneWrap: { alignItems: 'center' },
  phoneChrome: {
    width: Platform.OS === 'web' ? 392 : '100%',
    maxWidth: 392,
    borderRadius: 36,
    borderWidth: 8,
    overflow: 'hidden',
    paddingBottom: 12,
  },
  notch: {
    alignSelf: 'center',
    width: 92,
    height: 10,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    marginTop: 8,
    marginBottom: 6,
  },
  screen: {
    marginHorizontal: 6,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
  },
});
