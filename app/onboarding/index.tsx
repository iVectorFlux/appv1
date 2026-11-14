/**
 * Onboarding - 4 steps
 *
 * 1. Welcome
 * 2. Name (optional)
 * 3. Context (optional) - life situation; industry if employed; interests
 * 4. Primary goal → save and Home
 */

import React, { useState, useEffect } from 'react';
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
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  updateUserProfileContext,
  type LifeSituationId,
  LIFE_SITUATION_OPTIONS,
  INDUSTRY_OPTIONS,
  type IndustryId,
} from '@/services/profile-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useColors, Spacing, Typography, Radius, Shadows } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';

const TOTAL_STEPS = 4;

const WELCOME_EXPERIENCE_PILLS: { label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Learn EQ', icon: 'book-outline' },
  { label: 'AI Companion', icon: 'chatbubbles-outline' },
  { label: 'Recover', icon: 'leaf-outline' },
];

const DEFAULT_CHECK_IN_FREQUENCY = 'few_times_week' as const;

type PrimaryGoalId = 'feel_better' | 'build_skills' | 'manage_stress' | 'ai_growth' | 'explore';

const PRIMARY_GOALS: {
  id: PrimaryGoalId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: 'feel_better', label: 'Feel better day to day', icon: 'leaf-outline' },
  { id: 'build_skills', label: 'Build emotional and professional skills', icon: 'trending-up-outline' },
  { id: 'manage_stress', label: 'Manage stress and anxiety', icon: 'shield-checkmark-outline' },
  { id: 'ai_growth', label: 'Grow with coaching support', icon: 'sparkles-outline' },
  { id: 'explore', label: 'Just exploring', icon: 'compass-outline' },
];

const STEPS_COMPLETED = ['welcome', 'name', 'context', 'goal'] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, setOnboardingComplete, refreshDisplayName } = useAuthStore();
  const colors = useColors();

  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState('');
  const [primaryGoalId, setPrimaryGoalId] = useState<PrimaryGoalId | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contextInterests, setContextInterests] = useState('');
  const [contextLifeSituation, setContextLifeSituation] = useState<LifeSituationId | null>(null);
  const [contextIndustry, setContextIndustry] = useState<IndustryId | null>(null);

  useEffect(() => {
    if (contextLifeSituation !== 'employed') setContextIndustry(null);
  }, [contextLifeSituation]);

  const canContinue = () => {
    if (step === 4) return primaryGoalId !== null;
    return true;
  };

  const handleContinue = () => {
    if (!canContinue() || step >= 4) return;
    setStep((s) => s + 1);
  };

  const handleFinish = async () => {
    if (!primaryGoalId) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id ?? user?.id;
      if (userId) {
        try {
          const { data: existingPrefs } = await supabase
            .from('user_preferences')
            .select('reminder_enabled, reminder_times, reminder_days, context')
            .eq('user_id', userId)
            .maybeSingle();

          const { error: prefsErr } = await supabase.from('user_preferences').upsert(
            {
              user_id: userId,
              check_in_frequency: DEFAULT_CHECK_IN_FREQUENCY,
              goals: [primaryGoalId],
              reminder_enabled: existingPrefs?.reminder_enabled ?? true,
              reminder_times: existingPrefs?.reminder_times ?? [],
              reminder_days: existingPrefs?.reminder_days ?? [0, 1, 2, 3, 4, 5, 6],
              context: existingPrefs?.context ?? null,
            },
            { onConflict: 'user_id' }
          );
          if (prefsErr) console.error('[Onboarding] user_preferences upsert failed:', prefsErr.message);
        } catch (e) {
          console.error('[Onboarding] user_preferences error:', e);
        }
        const nameToSave = displayName.trim();
        if (nameToSave) {
          try {
            const { error: profileErr } = await supabase.from('profiles').update({ display_name: nameToSave }).eq('id', userId);
            if (profileErr) console.error('[Onboarding] profiles update failed:', profileErr.message);
          } catch (e) {
            console.error('[Onboarding] profiles error:', e);
          }
          await refreshDisplayName();
        }
        if (isSupabaseConfigured() && (contextInterests.trim() || contextLifeSituation)) {
          const r = await updateUserProfileContext(userId, {
            profileInterests: contextInterests.trim() || null,
            lifeSituation: contextLifeSituation,
            industry: contextLifeSituation === 'employed' ? contextIndustry : null,
          });
          if (!r.ok) console.error('[Onboarding] profile context:', r.error);
        }
      }
      await setOnboardingComplete([...STEPS_COMPLETED]);
      setShowConfirmation(true);
      setTimeout(() => {
        router.replace('/(tabs)/home');
      }, 1800);
    } catch (err) {
      console.error('[Onboarding] save error:', err);
      await setOnboardingComplete([...STEPS_COMPLETED]);
      setShowConfirmation(true);
      setTimeout(() => {
        router.replace('/(tabs)/home');
      }, 1500);
    } finally {
      setLoading(false);
    }
  };

  const styles = createStyles(colors);

  if (showConfirmation) {
    return (
      <View style={styles.container}>
        <View style={styles.confirmationWrap}>
          <View style={styles.confirmationIconWrap}>
            <Ionicons name="checkmark-circle" size={56} color={colors.primary} />
          </View>
          <Text style={styles.confirmationText}>{"You're all set. Let's get started."}</Text>
          <Text style={styles.confirmationSubtext}>Taking you to your home…</Text>
        </View>
      </View>
    );
  }

  const renderFixedButton = () => {
    if (step === 4) {
      return (
        <Button
          title="Continue"
          onPress={() => void handleFinish()}
          disabled={!primaryGoalId}
          loading={loading}
          fullWidth
          size="lg"
        />
      );
    }
    const label = step === 1 ? 'Get started' : 'Continue';
    return (
      <Button
        title={label}
        onPress={handleContinue}
        disabled={!canContinue()}
        fullWidth
        size="lg"
      />
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepRow}>
          <View style={styles.stepBarBg}>
            <View style={[styles.stepBarFill, { width: `${(step / TOTAL_STEPS) * 100}%` }]} />
          </View>
          <Text style={styles.stepCount}>
            {step} of {TOTAL_STEPS}
          </Text>
        </View>

        {step === 1 && (
          <View style={styles.screen}>
            <View style={styles.welcomeHero}>
              <View style={styles.heroIconWrap}>
                <Ionicons name="sparkles" size={40} color={colors.primary} />
              </View>
              <Text style={styles.headline}>Your personal growth companion</Text>
              <Text style={styles.subtext}>
                Grow EQ, think clearly under pressure, and build workplace-ready skills. Lessons, guided practice, and coaching in one app.
              </Text>
            </View>

            <Text style={styles.welcomeKicker}>Inside the app</Text>
            <View style={styles.welcomePillRow}>
              {WELCOME_EXPERIENCE_PILLS.map((p) => (
                <View
                  key={p.label}
                  style={[
                    styles.welcomePill,
                    { backgroundColor: colors.surface, borderColor: colors.borderLight },
                  ]}
                >
                  <Ionicons name={p.icon} size={15} color={colors.primary} style={styles.welcomePillIcon} />
                  <Text style={styles.welcomePillText}>{p.label}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.privacyCard, { marginTop: Spacing['2xl'] }]}>
              <Ionicons name="shield-checkmark" size={20} color={colors.primary} style={styles.privacyCardIcon} />
              <Text style={styles.privacyCardText}>Your data is private and encrypted.</Text>
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.screen}>
            <Text style={styles.screenTitle}>What should we call you?</Text>
            <Text style={styles.screenSubtitle}>Optional. We will use this in the app.</Text>
            <Input
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name or nickname"
              autoCapitalize="words"
            />
          </View>
        )}

        {step === 3 && (
          <View style={styles.screen}>
            <Text style={styles.screenTitle}>A bit of context (optional)</Text>
            <Text style={styles.screenSubtitle}>
              Helps coaching feel more relevant. Skip anything you prefer not to share.
            </Text>
            <Text style={styles.subLabel}>Life situation</Text>
            <View style={styles.chipRowWrap}>
              {LIFE_SITUATION_OPTIONS.map((o) => {
                const on = contextLifeSituation === o.id;
                return (
                  <Pressable
                    key={o.id}
                    onPress={() => setContextLifeSituation((prev) => (prev === o.id ? null : o.id))}
                    style={[
                      styles.onboardChip,
                      { borderColor: on ? colors.primary : colors.borderLight, backgroundColor: on ? colors.primary + '12' : colors.surface },
                    ]}
                  >
                    <Text style={[styles.onboardChipText, { color: on ? colors.primary : colors.textSecondary }]}>{o.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {contextLifeSituation === 'employed' && (
              <>
                <Text style={styles.subLabel}>Industry (optional)</Text>
                <View style={styles.chipRowWrap}>
                  {INDUSTRY_OPTIONS.map((o) => {
                    const on = contextIndustry === o.id;
                    return (
                      <Pressable
                        key={o.id}
                        onPress={() => setContextIndustry((prev) => (prev === o.id ? null : o.id))}
                        style={[
                          styles.onboardChip,
                          { borderColor: on ? colors.primary : colors.borderLight, backgroundColor: on ? colors.primary + '12' : colors.surface },
                        ]}
                      >
                        <Text
                          style={[styles.onboardChipText, { color: on ? colors.primary : colors.textSecondary }]}
                          numberOfLines={1}
                        >
                          {o.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
            <Text style={styles.subLabel}>Interests or focus (optional)</Text>
            <Input
              value={contextInterests}
              onChangeText={setContextInterests}
              placeholder="e.g. public speaking, leading a team, studying for exams"
              autoCapitalize="sentences"
            />
          </View>
        )}

        {step === 4 && (
          <View style={styles.screen}>
            <View style={styles.goalHeaderBlock}>
              <Text style={styles.screenTitle}>What matters most right now?</Text>
              <Text style={styles.goalStepSubtitle}>
                Choose one. You can change this later from your profile.
              </Text>
            </View>
            <View style={styles.goalList}>
              {PRIMARY_GOALS.map((g) => {
                const selected = primaryGoalId === g.id;
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => setPrimaryGoalId(g.id)}
                    style={({ pressed }) => [
                      styles.goalOption,
                      {
                        borderColor: selected ? colors.primary : colors.borderLight,
                        backgroundColor: selected ? colors.primary + '10' : colors.surface,
                      },
                      selected && styles.goalOptionSelected,
                      pressed && styles.goalOptionPressed,
                    ]}
                    android_ripple={{ color: colors.primary + '24' }}
                  >
                    <View
                      style={[
                        styles.goalIconCircle,
                        { backgroundColor: selected ? colors.primary + '20' : colors.glass },
                      ]}
                    >
                      <Ionicons
                        name={g.icon}
                        size={22}
                        color={selected ? colors.primary : colors.textSecondary}
                      />
                    </View>
                    <Text
                      style={[styles.goalLabel, selected && { color: colors.primary, fontWeight: Typography.fontWeight.semibold }]}
                    >
                      {g.label}
                    </Text>
                    {selected ? (
                      <Ionicons name="checkmark-circle" size={22} color={colors.primary} style={styles.goalCheck} />
                    ) : (
                      <View style={styles.goalCheckSpacer} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.fixedCta}>{renderFixedButton()}</View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      padding: Spacing.xl,
      paddingBottom: Spacing.md,
    },
    bottomSpacer: {
      height: 24,
    },
    fixedCta: {
      paddingHorizontal: Spacing.xl,
      paddingVertical: Spacing.lg,
      paddingBottom: Spacing.xl + (Platform.OS === 'ios' ? 20 : 0),
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
      backgroundColor: colors.background,
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      marginBottom: Spacing['2xl'],
    },
    stepBarBg: {
      flex: 1,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.borderLight,
      overflow: 'hidden',
    },
    stepBarFill: {
      height: '100%',
      borderRadius: 3,
      backgroundColor: colors.primary,
    },
    stepCount: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.medium,
      color: colors.textSecondary,
      minWidth: 44,
      textAlign: 'right',
    },
    screen: {
      marginBottom: Spacing['2xl'],
    },
    welcomeHero: {
      alignItems: 'center',
      marginBottom: Spacing.xl,
    },
    heroIconWrap: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primary + '18',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.lg,
    },
    headline: {
      fontSize: Typography.fontSize['3xl'],
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
      marginBottom: Spacing.md,
      fontFamily: Typography.fontFamily.heading,
      textAlign: 'center',
      lineHeight: Typography.fontSize['3xl'] * 1.2,
      paddingHorizontal: Spacing.md,
    },
    subtext: {
      fontSize: Typography.fontSize.base,
      color: colors.textSecondary,
      lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base,
      fontFamily: Typography.fontFamily.primary,
      textAlign: 'center',
      paddingHorizontal: Spacing.sm,
    },
    welcomeKicker: {
      fontSize: Typography.fontSize.micro,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textMuted,
      letterSpacing: 0.4,
      marginBottom: Spacing.sm,
    },
    welcomePillRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: Spacing.xs,
      marginBottom: 0,
    },
    welcomePill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: Radius.full,
      borderWidth: 1,
      flexGrow: 1,
      flexBasis: 0,
      minWidth: '30%',
      justifyContent: 'center',
    },
    welcomePillIcon: {
      marginRight: 5,
    },
    welcomePillText: {
      fontSize: Typography.fontSize.xs,
      color: colors.textPrimary,
      fontWeight: Typography.fontWeight.semibold,
    },
    coreSkillsIntro: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      lineHeight: Typography.fontSize.sm * 1.5,
      marginBottom: Spacing.lg,
      fontFamily: Typography.fontFamily.primary,
    },
    coreGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: Spacing['2xl'],
    },
    coreCard: {
      width: '48%',
      borderRadius: Radius.lg,
      borderWidth: 1,
      padding: Spacing.md,
      marginBottom: Spacing.md,
    },
    coreIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.sm,
    },
    coreName: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
      lineHeight: Typography.fontSize.sm * 1.35,
      fontFamily: Typography.fontFamily.heading,
      marginBottom: 4,
    },
    coreTag: {
      fontSize: Typography.fontSize.micro,
      lineHeight: Typography.fontSize.micro * 1.45,
      fontFamily: Typography.fontFamily.primary,
    },
    privacyCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary + '0C',
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      borderWidth: 1,
      borderColor: colors.primary + '20',
    },
    privacyCardIcon: {
      marginRight: Spacing.md,
    },
    privacyCardText: {
      flex: 1,
      fontSize: Typography.fontSize.sm,
      color: colors.textPrimary,
      fontWeight: Typography.fontWeight.medium,
      fontFamily: Typography.fontFamily.primary,
    },
    screenTitle: {
      fontSize: Typography.fontSize.xl,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
      marginBottom: Spacing.xs,
      fontFamily: Typography.fontFamily.heading,
    },
    screenSubtitle: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      marginBottom: Spacing.lg,
      fontFamily: Typography.fontFamily.primary,
    },
    subLabel: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      marginBottom: Spacing.sm,
    },
    chipRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
    onboardChip: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: Radius.full,
      borderWidth: 1,
    },
    onboardChipText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
    goalHeaderBlock: {
      marginBottom: Spacing.lg,
    },
    goalStepSubtitle: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      marginTop: Spacing.xs,
      marginBottom: 0,
      lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
      fontFamily: Typography.fontFamily.primary,
    },
    goalList: {
      gap: Spacing.md,
    },
    goalOption: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 64,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderRadius: Radius.lg,
      borderWidth: 1.5,
      ...(Platform.OS === 'web' ? { boxShadow: '0 1px 3px rgba(0,0,0,0.05)' } : Shadows.sm),
    },
    goalOptionSelected: {
      borderWidth: 2,
    },
    goalOptionPressed: {
      opacity: 0.9,
    },
    goalIconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.md,
    },
    goalLabel: {
      flex: 1,
      fontSize: Typography.fontSize.base,
      lineHeight: Typography.fontSize.base * 1.35,
      color: colors.textPrimary,
      fontFamily: Typography.fontFamily.primary,
    },
    goalCheck: {
      marginLeft: Spacing.sm,
    },
    goalCheckSpacer: {
      width: 22,
      height: 22,
      marginLeft: Spacing.sm,
    },
    confirmationWrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing['2xl'],
    },
    confirmationIconWrap: {
      marginBottom: Spacing.xl,
    },
    confirmationText: {
      fontSize: Typography.fontSize.xl,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.primary,
      textAlign: 'center',
      fontFamily: Typography.fontFamily.heading,
      marginBottom: Spacing.sm,
    },
    confirmationSubtext: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      fontFamily: Typography.fontFamily.primary,
    },
  });
