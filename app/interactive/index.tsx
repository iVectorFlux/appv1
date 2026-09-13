/**
 * Interactive Mode hub — four HTML simulations in pill, drawer, and full mobile views.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
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
  const [drawerItem, setDrawerItem] = useState<InteractiveItem | null>(null);

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
          <Text style={[styles.heroTag, { color: colors.primary }]}>Interactive Mode</Text>
          <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
            Play science and math — as a pill, a card, or a full phone
          </Text>
          <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
            Tap a pill to open the mobile card drawer. Use Full mobile for the 375×540 phone screen. Desktop is hidden
            on purpose.
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Four interactives</Text>

        {INTERACTIVES.map((item) => (
          <View
            key={item.id}
            style={[styles.pillCard, { borderColor: colors.glassBorder, backgroundColor: colors.surface }]}
          >
            <TouchableOpacity
              style={styles.pillRow}
              onPress={() => setDrawerItem(item)}
              activeOpacity={0.85}
            >
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
                onPress={() => setDrawerItem(item)}
                style={[styles.expandBtn, { backgroundColor: item.accent }]}
                accessibilityLabel={`Expand ${item.title}`}
              >
                <Ionicons name="expand-outline" size={16} color="#FFF" />
              </TouchableOpacity>
            </TouchableOpacity>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.ghostBtn, { borderColor: colors.glassBorder }]}
                onPress={() => setDrawerItem(item)}
              >
                <Text style={[styles.ghostBtnText, { color: colors.textSecondary }]}>💊 Pill → drawer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ghostBtn, { borderColor: item.accent + '50', backgroundColor: item.accent + '12' }]}
                onPress={() => router.push(`/interactive/${item.id}` as never)}
              >
                <Text style={[styles.ghostBtnText, { color: item.accent }]}>📲 Full mobile view</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={!!drawerItem} animationType="slide" transparent onRequestClose={() => setDrawerItem(null)}>
        <Pressable style={styles.overlay} onPress={() => setDrawerItem(null)}>
          <Pressable
            style={[styles.drawer, { backgroundColor: colors.background, borderColor: colors.glassBorder }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.drawerHandle} />
            <View style={styles.drawerHeader}>
              <Text style={[styles.drawerTitle, { color: colors.textPrimary }]}>
                {drawerItem ? `${drawerItem.emoji} ${drawerItem.title}` : ''}
              </Text>
              <TouchableOpacity onPress={() => setDrawerItem(null)} hitSlop={12}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.drawerHint, { color: colors.textMuted }]}>
              Mobile card view · 375 × 540 · tap Full mobile for the phone screen
            </Text>
            {drawerItem ? (
              <View style={styles.phoneCard}>
                <InteractiveFrame
                  file={drawerItem.file}
                  mode="mobile"
                  title={drawerItem.title}
                  height={Platform.OS === 'web' ? 540 : 420}
                />
              </View>
            ) : null}
            {drawerItem ? (
              <TouchableOpacity
                style={[styles.fullBtn, { backgroundColor: drawerItem.accent }]}
                onPress={() => {
                  const id = drawerItem.id;
                  setDrawerItem(null);
                  router.push(`/interactive/${id}` as never);
                }}
              >
                <Text style={styles.fullBtnText}>Open full mobile view</Text>
                <Ionicons name="phone-portrait-outline" size={16} color="#FFF" />
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
  sectionTitle: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
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
  actionRow: { flexDirection: 'row', gap: Spacing.sm },
  ghostBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingVertical: 8,
    alignItems: 'center',
  },
  ghostBtnText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  drawer: {
    maxHeight: '92%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: Spacing.md,
    paddingBottom: Spacing['3xl'],
  },
  drawerHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginBottom: Spacing.sm,
  },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  drawerTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold, flex: 1 },
  drawerHint: { fontSize: Typography.fontSize.xs, marginBottom: Spacing.sm },
  phoneCard: { alignSelf: 'center', width: '100%', maxWidth: 375 },
  fullBtn: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  fullBtnText: { color: '#FFF', fontWeight: Typography.fontWeight.bold, fontSize: Typography.fontSize.sm },
});
