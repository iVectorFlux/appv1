/**
 * Interactive Mode hub — four simulations as pills; expand opens a sheet, Play opens full page.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassBackground } from '@/components/ui/glass-background';
import { ScreenHeader } from '@/components/ui/screen-header';
import { InteractiveFrame } from '@/components/interactive/interactive-frame';
import { INTERACTIVES, type InteractiveItem } from '@/data/interactive-catalog';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';

export default function InteractiveHubScreen() {
  const router = useRouter();
  const colors = useColors();
  const [openItem, setOpenItem] = useState<InteractiveItem | null>(null);

  return (
    <GlassBackground>
      <ScreenHeader title="Interactive" showHomeButton backFallbackHref="/(tabs)/home" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { borderColor: colors.primary + '35', backgroundColor: colors.primary + '10' }]}>
          <Text style={styles.heroEmoji}>🎮</Text>
          <Text style={[styles.heroTag, { color: colors.primary }]}>Interactive</Text>
          <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
            Learn by playing with science and math
          </Text>
          <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
            Tap a topic to peek at it, or open it full screen to explore.
          </Text>
        </View>

        {INTERACTIVES.map((item) => (
          <View
            key={item.id}
            style={[styles.pillCard, { borderColor: colors.glassBorder, backgroundColor: colors.surface }]}
          >
            <TouchableOpacity style={styles.pillRow} onPress={() => setOpenItem(item)} activeOpacity={0.85}>
              <View style={[styles.emojiBox, { backgroundColor: item.accent + '18' }]}>
                <Text style={styles.emoji}>{item.emoji}</Text>
              </View>
              <View style={styles.pillText}>
                <Text style={[styles.pillTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                <Text style={[styles.pillSub, { color: colors.textMuted }]} numberOfLines={2}>
                  {item.subtitle}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setOpenItem(item)}
                style={[styles.expandBtn, { backgroundColor: item.accent }]}
                accessibilityLabel={`Open ${item.title}`}
              >
                <Ionicons name="expand-outline" size={16} color="#FFF" />
              </TouchableOpacity>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.playBtn, { backgroundColor: item.accent }]}
              onPress={() => router.push(`/interactive/${item.id}` as never)}
            >
              <Text style={styles.playBtnText}>Play full screen</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <Modal visible={!!openItem} animationType="slide" transparent onRequestClose={() => setOpenItem(null)}>
        <Pressable style={styles.overlay} onPress={() => setOpenItem(null)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.glassBorder }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
                {openItem ? `${openItem.emoji} ${openItem.title}` : ''}
              </Text>
              <TouchableOpacity onPress={() => setOpenItem(null)} hitSlop={12}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {openItem ? (
              <InteractiveFrame file={openItem.file} mode="drawer" title={openItem.title} height={520} />
            ) : null}
            {openItem ? (
              <TouchableOpacity
                style={[styles.playBtn, { backgroundColor: openItem.accent, marginTop: Spacing.md }]}
                onPress={() => {
                  const id = openItem.id;
                  setOpenItem(null);
                  router.push(`/interactive/${id}` as never);
                }}
              >
                <Text style={styles.playBtnText}>Play full screen</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFF" />
              </TouchableOpacity>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing['5xl'], gap: Spacing.md },
  hero: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  heroEmoji: { fontSize: 36 },
  heroTag: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
  heroTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
    lineHeight: Typography.fontSize.xl * 1.25,
  },
  heroSub: { fontSize: Typography.fontSize.sm, lineHeight: 20, textAlign: 'center' },
  pillCard: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.md, gap: Spacing.sm },
  pillRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  emojiBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 24 },
  pillText: { flex: 1, gap: 2 },
  pillTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold },
  pillSub: { fontSize: Typography.fontSize.xs, lineHeight: 16 },
  expandBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  playBtnText: { color: '#FFF', fontWeight: Typography.fontWeight.bold, fontSize: Typography.fontSize.sm },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: Spacing.md,
    paddingBottom: Spacing['3xl'],
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginBottom: Spacing.sm,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  sheetTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold, flex: 1 },
});
