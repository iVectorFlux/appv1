/**
 * Simplified EQ-Only Onboarding
 *
 * Keeps onboarding minimal and strictly focused on Emotional Intelligence:
 * - Optional preferred name
 * - Optional EQ focus pillar
 * - Skip anytime or continue directly to the app / baseline EQ test
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GlassBackground } from '@/components/ui/glass-background';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/shadcn-primitives';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';

type EqFocusId =
  | 'self_awareness'
  | 'self_management'
  | 'social_awareness'
  | 'relationship_management'
  | 'complete_eq';

const EQ_FOCUS_OPTIONS: {
  id: EqFocusId;
  label: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    id: 'complete_eq',
    label: 'Complete EQ Mastery',
    desc: 'Structured path across all 12 competencies',
    icon: 'sparkles-outline',
  },
  {
    id: 'self_awareness',
    label: 'Self-Awareness',
    desc: 'Recognize emotional triggers & patterns early',
    icon: 'eye-outline',
  },
  {
    id: 'self_management',
    label: 'Self-Management',
    desc: 'Stay balanced, optimistic, and adaptable under stress',
    icon: 'shield-checkmark-outline',
  },
  {
    id: 'social_awareness',
    label: 'Social Awareness',
    desc: 'Strengthen empathy and read team dynamics clearly',
    icon: 'people-outline',
  },
  {
    id: 'relationship_management',
    label: 'Relationship Management',
    desc: 'Influence, coach, resolve conflict, and lead teams',
    icon: 'git-network-outline',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, setOnboardingComplete, refreshDisplayName } = useAuthStore();
  const colors = useColors();

  const [displayName, setDisplayName] = useState('');
  const [eqFocus, setEqFocus] = useState<EqFocusId>('complete_eq');
  const [loading, setLoading] = useState(false);

  const completeOnboarding = async (target: '/(tabs)/home' | '/full-eq-test', chosenGoal: EqFocusId) => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id ?? user?.id;

      if (userId) {
        try {
          const { data: existingPrefs } = await supabase
            .from('user_preferences')
            .select('reminder_enabled, reminder_times, reminder_days, context')
            .eq('user_id', userId)
            .maybeSingle();

          await supabase.from('user_preferences').upsert(
            {
              user_id: userId,
              check_in_frequency: 'few_times_week',
              goals: [chosenGoal],
              reminder_enabled: existingPrefs?.reminder_enabled ?? true,
              reminder_times: existingPrefs?.reminder_times ?? [],
              reminder_days: existingPrefs?.reminder_days ?? [0, 1, 2, 3, 4, 5, 6],
              context: existingPrefs?.context ?? null,
            },
            { onConflict: 'user_id' }
          );
        } catch (e) {
          console.warn('[Onboarding] preferences save skipped:', e);
        }

        const cleanName = displayName.trim();
        if (cleanName) {
          try {
            await supabase.from('profiles').update({ display_name: cleanName }).eq('id', userId);
            await refreshDisplayName();
          } catch (e) {
            console.warn('[Onboarding] name save skipped:', e);
          }
        }
      }

      await setOnboardingComplete(['eq_focus']);
      router.replace(target);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.cardWrap}>
            <GlassCard style={styles.card}>
              <View style={styles.topRow}>
                <Badge label="Emotional Intelligence" icon="sparkles-outline" variant="default" />
                <Pressable
                  onPress={() => void completeOnboarding('/(tabs)/home', 'complete_eq')}
                  disabled={loading}
                  style={Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : undefined}
                >
                  <Text style={[styles.skipText, { color: colors.textMuted }]}>Skip setup</Text>
                </Pressable>
              </View>

              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Welcome to Lumi6 EQ
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Measure your Emotional Intelligence and unlock a structured learning path across all 12 workplace EQ competencies.
              </Text>

              <View style={styles.section}>
                <Input
                  label="Your name (optional)"
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="How should we greet you?"
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
                  Primary EQ Focus
                </Text>
                <View style={styles.focusGrid}>
                  {EQ_FOCUS_OPTIONS.map((opt) => {
                    const active = eqFocus === opt.id;
                    return (
                      <Pressable
                        key={opt.id}
                        onPress={() => setEqFocus(opt.id)}
                        style={[
                          styles.focusOption,
                          {
                            borderColor: active ? colors.primary : colors.border,
                            backgroundColor: active ? colors.primary + '0E' : colors.floating,
                          },
                          Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : undefined,
                        ]}
                      >
                        <View
                          style={[
                            styles.focusIcon,
                            {
                              backgroundColor: active ? colors.primary + '1A' : colors.surface,
                            },
                          ]}
                        >
                          <Ionicons
                            name={opt.icon}
                            size={18}
                            color={active ? colors.primary : colors.textSecondary}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.focusLabel,
                              { color: active ? colors.primary : colors.textPrimary },
                            ]}
                          >
                            {opt.label}
                          </Text>
                          <Text style={[styles.focusDesc, { color: colors.textSecondary }]}>
                            {opt.desc}
                          </Text>
                        </View>
                        <Ionicons
                          name={active ? 'checkmark-circle' : 'ellipse-outline'}
                          size={18}
                          color={active ? colors.primary : colors.textLight}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.actions}>
                <Button
                  title="Take EQ Test"
                  icon="analytics-outline"
                  onPress={() => void completeOnboarding('/full-eq-test', eqFocus)}
                  loading={loading}
                  size="lg"
                  fullWidth
                />
                <Button
                  title="Go to Dashboard"
                  variant="outline"
                  onPress={() => void completeOnboarding('/(tabs)/home', eqFocus)}
                  disabled={loading}
                  size="md"
                  fullWidth
                />
              </View>
            </GlassCard>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
    paddingVertical: Spacing['2xl'],
  },
  cardWrap: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  card: {
    padding: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  skipText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    fontFamily: Typography.fontFamily.primary,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.6,
    marginBottom: 8,
    fontFamily: Typography.fontFamily.heading,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    lineHeight: 22,
    marginBottom: Spacing.lg,
    fontFamily: Typography.fontFamily.primary,
  },
  section: {
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    marginBottom: 8,
    fontFamily: Typography.fontFamily.primary,
  },
  focusGrid: {
    gap: 8,
  },
  focusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  focusIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusLabel: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Typography.fontFamily.primary,
  },
  focusDesc: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: Typography.fontFamily.primary,
  },
  actions: {
    marginTop: Spacing.sm,
    gap: 10,
  },
});
