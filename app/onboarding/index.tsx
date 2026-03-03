/**
 * Onboarding — 5 screens
 *
 * 1. Welcome + What you'll do + Privacy (one screen, Get started)
 * 2. Name (optional)
 * 3. What brings you here? (why — 2 columns)
 * 4. How often do you want to use it? (frequency — single select)
 * 5. How are you feeling? → confirmation → Home
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  TouchableOpacity,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TagChip } from '@/components/ui/tag-chip';
import { useColors, Spacing, Typography, Radius, Shadows } from '@/constants/design-tokens';
import { emotionColors } from '@/constants/themes';
import type { EmotionTag } from '@/types';
import { Ionicons } from '@expo/vector-icons';

const TOTAL_STEPS = 5;

// Screen 5: emotions (subset of Reflect)
const ONBOARDING_EMOTIONS: EmotionTag[] = [
  'Happy', 'Calm', 'Anxious', 'Stressed', 'Sad', 'Tired',
  'Relaxed', 'Overwhelmed', 'Content', 'Grateful', 'Frustrated', 'Hopeful',
];

// Screen 4 — What brings you here? (multi-select)
const WHY_OPTIONS = [
  { id: 'understand_emotions', label: 'Understand my emotions', icon: 'heart-outline' as const },
  { id: 'handle_stress', label: 'Handle stress better', icon: 'leaf-outline' as const },
  { id: 'build_skills', label: 'Build emotional skills', icon: 'trending-up-outline' as const },
  { id: 'relationships', label: 'Improve relationships', icon: 'people-outline' as const },
  { id: 'anxiety_worry', label: 'Manage anxiety or worry', icon: 'shield-checkmark-outline' as const },
  { id: 'self_confidence', label: 'Build self-confidence', icon: 'ribbon-outline' as const },
  { id: 'work_life', label: 'Better work–life balance', icon: 'briefcase-outline' as const },
  { id: 'sleep_mood', label: 'Sleep or mood', icon: 'moon-outline' as const },
  { id: 'life_transitions', label: 'Life transitions or change', icon: 'swap-horizontal-outline' as const },
  { id: 'curiosity', label: 'Curiosity about EQ', icon: 'bulb-outline' as const },
  { id: 'recommended', label: 'Recommended by someone', icon: 'chatbubble-outline' as const },
  { id: 'general_wellbeing', label: 'General wellbeing', icon: 'fitness-outline' as const },
  { id: 'exploring', label: 'Just exploring', icon: 'compass-outline' as const },
  { id: 'prefer_not_say', label: 'Prefer not to say', icon: 'ellipsis-horizontal-outline' as const },
] as const;

const FREQUENCY_OPTIONS = [
  { id: 'daily', label: 'Daily' },
  { id: 'few_times_week', label: 'A few times a week' },
  { id: 'weekly', label: 'About once a week' },
  { id: 'few_times_month', label: 'A few times a month' },
  { id: 'occasionally', label: 'Occasionally' },
  { id: 'when_overwhelmed', label: 'When I feel overwhelmed' },
  { id: 'decide_later', label: "I'll decide later" },
] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const { setOnboardingComplete, refreshDisplayName } = useAuthStore();
  const colors = useColors();

  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState('');
  const [whyIds, setWhyIds] = useState<string[]>([]);
  const [frequencyId, setFrequencyId] = useState<string | null>(null);
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionTag | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleWhy = (id: string) => {
    if (id === 'prefer_not_say') {
      setWhyIds(['prefer_not_say']);
      return;
    }
    setWhyIds((prev) => {
      const withoutPns = prev.filter((x) => x !== 'prefer_not_say');
      if (withoutPns.includes(id)) return withoutPns.filter((x) => x !== id);
      return [...withoutPns, id];
    });
  };

  const canContinue = () => {
    if (step === 5) return selectedEmotion !== null;
    return true;
  };

  const handleContinue = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    }
  };

  const handleFirstActionContinue = async () => {
    if (!selectedEmotion) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const userId = session.user.id;

        // Save optional personalization — goals (JSONB array) + frequency in one row
        const goalsToSave = whyIds.filter((id) => id !== 'prefer_not_say');
        const frequencyMap: Record<string, string> = {
          daily: 'daily',
          few_times_week: 'few_times_week',
          weekly: 'weekly',
          few_times_month: 'weekly',
          occasionally: 'weekly',
          when_overwhelmed: 'when_reminded',
          decide_later: 'no_reminders',
        };
        const { error: prefsErr } = await supabase.from('user_preferences').upsert(
          {
            user_id: userId,
            check_in_frequency: frequencyMap[frequencyId ?? ''] ?? 'few_times_week',
            goals: goalsToSave,
          },
          { onConflict: 'user_id' }
        );
        if (prefsErr) {
          console.error('[Onboarding] user_preferences upsert failed:', prefsErr.message, prefsErr.code);
        }
        // Save display name to profiles
        const nameToSave = displayName.trim();
        if (nameToSave) {
          const { error: profileErr } = await supabase.from('profiles').update({ display_name: nameToSave }).eq('id', userId);
          if (profileErr) {
            console.error('[Onboarding] profiles display_name update failed:', profileErr.message, profileErr.code);
          }
        }
        await refreshDisplayName();
        // Save first emotion as data point
        const { error: emotionErr } = await supabase.from('onboarding_emotional_check').insert({
          user_id: userId,
          question_id: 'onboarding_first_emotion',
          value_type: 'emotion',
          value_emotion: selectedEmotion,
          order_index: 0,
        });
        if (emotionErr) {
          console.error('[Onboarding] onboarding_emotional_check insert failed:', emotionErr.message, emotionErr.code);
        }

        await setOnboardingComplete(['welcome', 'name', 'what_you_do', 'privacy', 'why', 'frequency', 'first_action']);
      } else {
        await setOnboardingComplete(['welcome', 'name', 'what_you_do', 'privacy', 'why', 'frequency', 'first_action']);
      }
      setShowConfirmation(true);
      setTimeout(() => {
        router.replace('/(tabs)/home');
      }, 1800);
    } catch (err) {
      console.error('[Onboarding] save error:', err);
      await setOnboardingComplete(['welcome', 'name', 'what_you_do', 'privacy', 'why', 'frequency', 'first_action']);
      router.replace('/(tabs)/home');
    } finally {
      setLoading(false);
    }
  };

  const getEmotionColor = (emotion: EmotionTag): string => {
    const colorKey = emotionColors[emotion] || 'primary';
    return colors[colorKey as keyof typeof colors] as string;
  };

  const styles = createStyles(colors);

  // Screen 5 confirmation
  if (showConfirmation) {
    return (
      <View style={styles.container}>
        <View style={styles.confirmationWrap}>
          <View style={styles.confirmationIconWrap}>
            <Ionicons name="checkmark-circle" size={56} color={colors.primary} />
          </View>
          <Text style={styles.confirmationText}>
            Noticing how you feel is the first EQ skill.
          </Text>
          <Text style={styles.confirmationSubtext}>Taking you to your home…</Text>
        </View>
      </View>
    );
  }

  const renderFixedButton = () => {
    if (step === 5) {
      return (
        <Button
          title="Continue"
          onPress={handleFirstActionContinue}
          disabled={!selectedEmotion}
          loading={loading}
          fullWidth
          size="lg"
        />
      );
    }
    const label = step === 1 ? 'Get started' : 'Continue';
    return <Button title={label} onPress={handleContinue} fullWidth size="lg" />;
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
        {/* Step indicator */}
        <View style={styles.stepRow}>
          <View style={styles.stepBarBg}>
            <View style={[styles.stepBarFill, { width: `${(step / TOTAL_STEPS) * 100}%` }]} />
          </View>
          <Text style={styles.stepCount}>{step} of {TOTAL_STEPS}</Text>
        </View>

        {/* Screen 1 — Welcome + What you'll do + Privacy (one screen) */}
        {step === 1 && (
          <View style={styles.screen}>
            <View style={styles.welcomeHero}>
              <View style={styles.heroIconWrap}>
                <Ionicons name="heart" size={40} color={colors.primary} />
              </View>
              <Text style={styles.headline}>Your EQ journey starts here</Text>
              <Text style={styles.subtext}>
                A few minutes a day to understand emotions, build skills, and feel more in control.
              </Text>
            </View>

            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>2–5 min/day</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>No scores</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Private</Text>
              </View>
            </View>

            <Text style={styles.miniSectionTitle}>What you'll do</Text>
            <View style={styles.wayCards}>
              <View style={[styles.wayCard, { borderLeftColor: colors.primary }]}>
                <View style={[styles.wayCardIconWrap, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="journal-outline" size={22} color={colors.primary} />
                </View>
                <View style={styles.wayCardText}>
                  <Text style={styles.wayRowLabel}>Reflect</Text>
                  <Text style={styles.wayRowDesc}>Name emotions and write privately—only you see it.</Text>
                </View>
              </View>
              <View style={[styles.wayCard, { borderLeftColor: colors.accentEnergy }]}>
                <View style={[styles.wayCardIconWrap, { backgroundColor: colors.accentEnergy + '20' }]}>
                  <Ionicons name="checkmark-circle-outline" size={22} color={colors.accentEnergy} />
                </View>
                <View style={styles.wayCardText}>
                  <Text style={styles.wayRowLabel}>Check-in</Text>
                  <Text style={styles.wayRowDesc}>Short self-checks to build emotional awareness.</Text>
                </View>
              </View>
              <View style={[styles.wayCard, { borderLeftColor: colors.accentCalm }]}>
                <View style={[styles.wayCardIconWrap, { backgroundColor: colors.accentCalm + '20' }]}>
                  <Ionicons name="leaf-outline" size={22} color={colors.accentCalm} />
                </View>
                <View style={styles.wayCardText}>
                  <Text style={styles.wayRowLabel}>Recover</Text>
                  <Text style={styles.wayRowDesc}>Breathing techniques when things feel heavy.</Text>
                </View>
              </View>
            </View>

            <View style={styles.privacyCard}>
              <Ionicons name="shield-checkmark" size={20} color={colors.primary} style={styles.privacyCardIcon} />
              <Text style={styles.privacyCardText}>Your journal is encrypted and never read by us.</Text>
            </View>
          </View>
        )}

        {/* Screen 2 — Name (optional) */}
        {step === 2 && (
          <View style={styles.screen}>
            <Text style={styles.screenTitle}>What should we call you?</Text>
            <Text style={styles.screenSubtitle}>Optional — we'll use this in the app</Text>
            <Input
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name or nickname"
              autoCapitalize="words"
            />
          </View>
        )}

        {/* Screen 3 — What brings you here? (why — 2 columns) */}
        {step === 3 && (
          <View style={styles.screen}>
            <Text style={styles.screenTitle}>What brings you here right now?</Text>
            <Text style={styles.screenSubtitle}>Optional — select all that apply</Text>
            <View style={styles.optionsGridTwoCol}>
              {WHY_OPTIONS.map((o) => {
                const isSelected = whyIds.includes(o.id);
                return (
                  <Pressable
                    key={o.id}
                    onPress={() => toggleWhy(o.id)}
                    style={[styles.optionCardTwoCol, isSelected && styles.optionCardSelected]}
                  >
                    <Ionicons name={o.icon} size={16} color={isSelected ? colors.primary : colors.textSecondary} style={styles.optionIcon} />
                    <Text style={[styles.optionLabelTwoCol, isSelected && styles.optionLabelSelected]} numberOfLines={2}>{o.label}</Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={16} color={colors.primary} style={styles.optionCheck} />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Screen 4 — How often do you want to use it? */}
        {step === 4 && (
          <View style={styles.screen}>
            <Text style={styles.screenTitle}>How often do you want to use it?</Text>
            <Text style={styles.screenSubtitle}>Choose one — you can change this later in settings</Text>
            <View style={styles.options}>
              {FREQUENCY_OPTIONS.map((o) => (
                <Pressable
                  key={o.id}
                  onPress={() => setFrequencyId(o.id)}
                  style={[styles.optionCard, styles.optionCardFull, frequencyId === o.id && styles.optionCardSelected]}
                >
                  <Text style={[styles.optionLabel, frequencyId === o.id && styles.optionLabelSelected]}>{o.label}</Text>
                  {frequencyId === o.id && <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={styles.optionCheck} />}
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Screen 5 — How are you feeling? */}
        {step === 5 && (
          <View style={styles.screen}>
            <Text style={styles.screenTitle}>How are you feeling right now?</Text>
            <Text style={styles.screenSubtitle}>Pick one — there's no wrong answer</Text>
            <View style={styles.emotionGrid}>
              {ONBOARDING_EMOTIONS.map((emotion) => (
                <TagChip
                  key={emotion}
                  label={emotion}
                  selected={selectedEmotion === emotion}
                  selectedColor={getEmotionColor(emotion)}
                  onPress={() => setSelectedEmotion(emotion)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Spacer so content isn't hidden behind fixed button */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Fixed bottom CTA — always on screen */}
      <View style={styles.fixedCta}>
        {renderFixedButton()}
      </View>
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
    badgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: Spacing.sm,
      marginBottom: Spacing['2xl'],
    },
    badge: {
      backgroundColor: colors.surface,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.lg,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    badgeText: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      fontWeight: Typography.fontWeight.medium,
      fontFamily: Typography.fontFamily.primary,
    },
    miniSectionTitle: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      marginBottom: Spacing.lg,
      fontFamily: Typography.fontFamily.heading,
    },
    wayCards: {
      gap: Spacing.md,
      marginBottom: Spacing.xl,
    },
    wayCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      borderLeftWidth: 4,
      borderWidth: 1,
      borderColor: colors.borderLight,
      ...(Platform.OS === 'web' ? { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' } : Shadows.sm),
    },
    wayCardIconWrap: {
      width: 44,
      height: 44,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.lg,
    },
    wayCardText: { flex: 1 },
    wayRowLabel: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      marginBottom: 2,
      fontFamily: Typography.fontFamily.heading,
    },
    wayRowDesc: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
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
    cards: {
      gap: Spacing.md,
      marginBottom: Spacing.lg,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
      ...(Platform.OS === 'web' ? { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' } : Shadows.sm),
    },
    cardReflect: {
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    cardCheckIn: {
      borderLeftWidth: 4,
      borderLeftColor: colors.accentEnergy,
    },
    cardRecover: {
      borderLeftWidth: 4,
      borderLeftColor: colors.accentCalm,
    },
    cardIconWrap: {
      width: 36,
      height: 36,
      borderRadius: Radius.md,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.sm,
    },
    cardLabel: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      marginBottom: 2,
      fontFamily: Typography.fontFamily.heading,
    },
    cardDesc: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
      fontFamily: Typography.fontFamily.primary,
    },
    privacyScreen: {
      backgroundColor: colors.surface,
      marginHorizontal: -Spacing.xl,
      paddingHorizontal: Spacing.xl,
      paddingVertical: Spacing['2xl'],
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    privacyIconWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primary + '14',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginBottom: Spacing.lg,
    },
    privacyHeadline: {
      fontSize: Typography.fontSize['2xl'],
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
      marginBottom: Spacing.xl,
      fontFamily: Typography.fontFamily.heading,
      textAlign: 'center',
    },
    bulletList: {
      marginBottom: Spacing.xl,
    },
    bulletRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: Spacing.md,
    },
    bulletIcon: {
      marginRight: Spacing.sm,
      marginTop: 2,
    },
    bullet: {
      flex: 1,
      fontSize: Typography.fontSize.base,
      color: colors.textSecondary,
      lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base + 2,
      fontFamily: Typography.fontFamily.primary,
    },
    privacyFooter: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      marginBottom: Spacing['2xl'],
      fontFamily: Typography.fontFamily.primary,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    questionLabel: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      marginBottom: Spacing.xs,
      marginTop: Spacing.lg,
      fontFamily: Typography.fontFamily.primary,
    },
    questionHint: {
      fontSize: Typography.fontSize.xs,
      color: colors.textSecondary,
      marginBottom: Spacing.sm,
      fontFamily: Typography.fontFamily.primary,
    },
    options: {
      gap: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    optionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
      marginBottom: Spacing.md,
    },
    optionsGridTwoCol: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
      marginBottom: Spacing.md,
      justifyContent: 'space-between',
    },
    optionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderLight,
      minWidth: '47%',
      maxWidth: '100%',
    },
    optionCardTwoCol: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.sm,
      borderRadius: Radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderLight,
      width: '48%',
    },
    optionCardSelected: {
      backgroundColor: colors.primary + '12',
      borderWidth: 2,
      borderColor: colors.primary,
    },
    optionCardFull: {
      minWidth: '100%',
    },
    optionIcon: {
      marginRight: Spacing.sm,
    },
    optionLabel: {
      flex: 1,
      fontSize: Typography.fontSize.xs,
      color: colors.textPrimary,
      fontFamily: Typography.fontFamily.primary,
    },
    optionLabelTwoCol: {
      flex: 1,
      fontSize: Typography.fontSize.xs,
      color: colors.textPrimary,
      fontFamily: Typography.fontFamily.primary,
    },
    optionLabelSelected: {
      fontWeight: Typography.fontWeight.semibold,
      color: colors.primary,
    },
    optionCheck: {
      marginLeft: Spacing.xs,
    },
    emotionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
      marginBottom: Spacing.lg,
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
