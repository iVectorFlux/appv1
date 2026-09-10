/**
 * Thinking Mode hub — ask a question, start a Socratic learning journey.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassBackground } from '@/components/ui/glass-background';
import { GlassCard } from '@/components/ui/glass-card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { useColors, Spacing, Typography, Radius, Shadows } from '@/constants/design-tokens';
import { THINKING_STARTER_QUESTIONS } from '@/data/thinking-mode-types';

export default function ThinkingModeHubScreen() {
  const router = useRouter();
  const colors = useColors();
  const [question, setQuestion] = useState('');

  const start = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    router.push({
      pathname: '/thinking-mode/session',
      params: { q: trimmed },
    } as never);
  };

  return (
    <GlassBackground>
      <ScreenHeader title="Thinking Mode" showHomeButton backFallbackHref="/(tabs)/home" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.heroCard, { borderColor: colors.primary + '35', backgroundColor: colors.primary + '10' }]}>
            <View style={[styles.heroIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="git-network-outline" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.heroTag, { color: colors.primary }]}>💭 Thinking Mode</Text>
            <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
              Learn step by step — with pictures, not walls of text
            </Text>
            <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
              One card at a time: pause and think, see a visual, then pick where to go next. Tap any concept for a quick
              detour without losing your place.
            </Text>
          </View>

          <View style={[styles.inputCard, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]}>
            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>What do you want to understand?</Text>
            <TextInput
              value={question}
              onChangeText={setQuestion}
              placeholder="e.g. How does a rainbow appear?"
              placeholderTextColor={colors.textMuted}
              multiline
              style={[
                styles.input,
                { borderColor: colors.glassBorder, color: colors.textPrimary, backgroundColor: colors.background },
              ]}
            />
            <TouchableOpacity
              onPress={() => start(question)}
              disabled={!question.trim()}
              style={[
                styles.startBtn,
                { backgroundColor: colors.primary, opacity: question.trim() ? 1 : 0.45 },
              ]}
            >
              <Ionicons name="sparkles-outline" size={20} color="#FFF" />
              <Text style={styles.startBtnText}>Start exploring</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Try a starter question</Text>
          <View style={styles.starters}>
            {THINKING_STARTER_QUESTIONS.map((q) => (
              <GlassCard key={q.text} onPress={() => start(q.text)} style={styles.starterCard}>
                <Text style={styles.starterEmoji}>{q.emoji}</Text>
                <Text style={[styles.starterText, { color: colors.textPrimary }]}>{q.text}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </GlassCard>
            ))}
          </View>

          <View style={[styles.howItWorks, { borderColor: colors.glassBorder }]}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted, marginBottom: Spacing.sm }]}>
              How it works
            </Text>
            {[
              { icon: 'layers-outline' as const, text: 'One step at a time — the graph grows as you explore' },
              { icon: 'search-outline' as const, text: 'Tap any concept to zoom in without losing your place' },
              { icon: 'fitness-outline' as const, text: 'Predict, test, and rethink with built-in challenges' },
            ].map((row) => (
              <View key={row.text} style={styles.howRow}>
                <Ionicons name={row.icon} size={18} color={colors.primary} />
                <Text style={[styles.howText, { color: colors.textSecondary }]}>{row.text}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing['5xl'], gap: Spacing.md },
  heroCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  heroTag: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
  heroTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
    lineHeight: Typography.fontSize.xl * 1.25,
  },
  heroSub: { fontSize: Typography.fontSize.sm, lineHeight: Typography.fontSize.sm * 1.55, textAlign: 'center' },
  inputCard: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, gap: Spacing.sm },
  inputLabel: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    minHeight: 88,
    fontSize: Typography.fontSize.base,
    textAlignVertical: 'top',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.xl,
    ...Shadows.sm,
  },
  startBtnText: { color: '#FFF', fontWeight: Typography.fontWeight.bold, fontSize: Typography.fontSize.base },
  sectionTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  starters: { gap: Spacing.sm },
  starterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  starterEmoji: { fontSize: 22, width: 28, textAlign: 'center' },
  starterText: { flex: 1, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
  howItWorks: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, gap: Spacing.sm },
  howRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  howText: { flex: 1, fontSize: Typography.fontSize.sm, lineHeight: 20 },
});
