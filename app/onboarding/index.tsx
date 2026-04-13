/**
 * Onboarding — 5 steps (goal-first, feature spotlight)
 *
 * 1. Welcome — tagline + pillar badges + privacy note
 * 2. Name (optional)
 * 3. Primary goal (single select)
 * 4. Feature spotlight (adapts to goal)
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

const DEFAULT_CHECK_IN_FREQUENCY = 'few_times_week' as const;

const ONBOARDING_EMOTIONS: EmotionTag[] = [
  'Happy', 'Calm', 'Anxious', 'Stressed', 'Sad', 'Tired',
  'Relaxed', 'Overwhelmed', 'Content', 'Grateful', 'Frustrated', 'Hopeful',
];

type PrimaryGoalId = 'feel_better' | 'build_skills' | 'manage_stress' | 'ai_growth' | 'explore';

const PRIMARY_GOALS: {
  id: PrimaryGoalId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: 'feel_better', label: 'Feel better day-to-day', icon: 'leaf-outline' },
  { id: 'build_skills', label: 'Build emotional & professional skills', icon: 'trending-up-outline' },
  { id: 'manage_stress', label: 'Manage stress & anxiety', icon: 'shield-checkmark-outline' },
  { id: 'ai_growth', label: 'Grow with AI coaching', icon: 'sparkles-outline' },
  { id: 'explore', label: 'Just exploring', icon: 'compass-outline' },
];

type SpotlightItem = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: 'primary' | 'accentEnergy' | 'accentCalm' | 'accentIndigo';
  featured: boolean;
};

function spotlightForGoal(goal: PrimaryGoalId): SpotlightItem[] {
  switch (goal) {
    case 'feel_better':
      return [
        {
          id: 'inner_ally',
          title: 'AI Companion',
          description: 'Talk things through with your Inner Ally — it listens, reflects, and helps ground you.',
          icon: 'heart-outline',
          accentColor: 'primary',
          featured: true,
        },
        {
          id: 'recover',
          title: 'Recover & Grounding',
          description: 'Breathing and regulation tools when things feel heavy.',
          icon: 'leaf-outline',
          accentColor: 'accentCalm',
          featured: false,
        },
        {
          id: 'learn',
          title: 'Learn EQ',
          description: 'Build emotional awareness with expert-led lessons.',
          icon: 'library-outline',
          accentColor: 'accentEnergy',
          featured: false,
        },
      ];
    case 'build_skills':
      return [
        {
          id: 'skill_lab',
          title: 'Skill Lab',
          description: 'Practice real-world skills with AI coaching and feedback.',
          icon: 'school-outline',
          accentColor: 'accentIndigo',
          featured: true,
        },
        {
          id: 'learn',
          title: 'Learn EQ',
          description: 'Video and audio lessons on emotional intelligence topics.',
          icon: 'library-outline',
          accentColor: 'primary',
          featured: false,
        },
        {
          id: 'eq_test',
          title: 'EQ assessment',
          description: 'Deeper picture of your strengths and growth areas over time.',
          icon: 'analytics-outline',
          accentColor: 'accentEnergy',
          featured: false,
        },
      ];
    case 'manage_stress':
      return [
        {
          id: 'recover',
          title: 'Recover & Grounding',
          description: 'Calm your nervous system with structured exercises.',
          icon: 'leaf-outline',
          accentColor: 'accentCalm',
          featured: true,
        },
        {
          id: 'inner_ally',
          title: 'AI Companion',
          description: 'Talk things through with a warm companion that listens first.',
          icon: 'heart-outline',
          accentColor: 'primary',
          featured: false,
        },
        {
          id: 'learn',
          title: 'Learn EQ',
          description: 'Understand stress patterns with expert guidance.',
          icon: 'library-outline',
          accentColor: 'accentEnergy',
          featured: false,
        },
      ];
    case 'ai_growth':
      return [
        {
          id: 'ai_chat',
          title: 'AI Companion',
          description: 'Wellbeing support and professional coaching in one place.',
          icon: 'chatbubbles-outline',
          accentColor: 'primary',
          featured: true,
        },
        {
          id: 'skill_lab',
          title: 'Skill Lab',
          description: 'Hands-on practice for communication, thinking, and EQ.',
          icon: 'school-outline',
          accentColor: 'accentIndigo',
          featured: false,
        },
        {
          id: 'learn',
          title: 'Learn EQ',
          description: 'Structured lessons you can watch or listen to anytime.',
          icon: 'library-outline',
          accentColor: 'accentEnergy',
          featured: false,
        },
      ];
    case 'explore':
    default:
      return [
        {
          id: 'skill_lab',
          title: 'Skill Lab',
          description: 'Try AI-powered drills across emotional and workplace skills.',
          icon: 'school-outline',
          accentColor: 'accentIndigo',
          featured: true,
        },
        {
          id: 'ai_chat',
          title: 'AI Companion',
          description: 'Your Inner Ally and Coach for wellbeing and growth.',
          icon: 'chatbubbles-outline',
          accentColor: 'primary',
          featured: false,
        },
        {
          id: 'learn',
          title: 'Learn EQ',
          description: 'Browse lessons when you want to go deeper.',
          icon: 'library-outline',
          accentColor: 'accentEnergy',
          featured: false,
        },
      ];
  }
}

const STEPS_COMPLETED = ['welcome', 'name', 'goal', 'feature_spotlight', 'first_emotion'] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, setOnboardingComplete, refreshDisplayName } = useAuthStore();
  const colors = useColors();

  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState('');
  const [primaryGoalId, setPrimaryGoalId] = useState<PrimaryGoalId | null>(null);
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionTag | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);

  const canContinue = () => {
    if (step === 3) return primaryGoalId !== null;
    if (step === 5) return selectedEmotion !== null;
    return true;
  };

  const handleContinue = () => {
    if (!canContinue()) return;
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    }
  };

  const handleFinish = async () => {
    if (!selectedEmotion || !primaryGoalId) return;
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
        try {
          const { error: emotionErr } = await supabase.from('onboarding_emotional_check').insert({
            user_id: userId,
            question_id: 'onboarding_first_emotion',
            value_type: 'emotion',
            value_emotion: selectedEmotion,
            order_index: 0,
          });
          if (emotionErr) console.error('[Onboarding] onboarding_emotional_check insert failed:', emotionErr.message);
        } catch (e) {
          console.error('[Onboarding] onboarding_emotional_check error:', e);
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

  const getEmotionColor = (emotion: EmotionTag): string => {
    const colorKey = emotionColors[emotion] || 'primary';
    return colors[colorKey as keyof typeof colors] as string;
  };

  const accentForSpotlight = (accent: SpotlightItem['accentColor']) => {
    switch (accent) {
      case 'accentEnergy':
        return colors.accentEnergy;
      case 'accentCalm':
        return colors.accentCalm;
      case 'accentIndigo':
        return colors.accentIndigo;
      default:
        return colors.primary;
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

  const spotlightItems =
    primaryGoalId !== null ? spotlightForGoal(primaryGoalId) : [];

  const renderFixedButton = () => {
    if (step === 5) {
      return (
        <Button
          title="Continue"
          onPress={handleFinish}
          disabled={!selectedEmotion}
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
                Build emotional intelligence, get AI guidance, and track your growth — all in one place.
              </Text>
            </View>

            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Learn EQ</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>AI Companion</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Skill Lab</Text>
              </View>
            </View>

            <View style={styles.privacyCard}>
              <Ionicons name="shield-checkmark" size={20} color={colors.primary} style={styles.privacyCardIcon} />
              <Text style={styles.privacyCardText}>Your data is private and encrypted.</Text>
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.screen}>
            <Text style={styles.screenTitle}>What should we call you?</Text>
            <Text style={styles.screenSubtitle}>{"Optional — we'll use this in the app"}</Text>
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
            <Text style={styles.screenTitle}>What matters most right now?</Text>
            <Text style={styles.screenSubtitle}>{"Choose one — we'll highlight what fits you best"}</Text>
            <View style={styles.options}>
              {PRIMARY_GOALS.map((g) => {
                const selected = primaryGoalId === g.id;
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => setPrimaryGoalId(g.id)}
                    style={[styles.optionCard, styles.optionCardFull, selected && styles.optionCardSelected]}
                  >
                    <Ionicons
                      name={g.icon}
                      size={20}
                      color={selected ? colors.primary : colors.textSecondary}
                      style={styles.optionIcon}
                    />
                    <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{g.label}</Text>
                    {selected ? (
                      <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={styles.optionCheck} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {step === 4 && primaryGoalId !== null && (
          <View style={styles.screen}>
            <Text style={styles.screenTitle}>{"Here's what you can try first"}</Text>
            <Text style={styles.screenSubtitle}>You can explore everything from Home anytime</Text>
            <View style={styles.spotlightList}>
              {spotlightItems.map((item) => {
                const accent = accentForSpotlight(item.accentColor);
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.spotlightCard,
                      { borderLeftColor: accent },
                      item.featured && { borderColor: colors.primary, borderWidth: 2 },
                    ]}
                  >
                    {item.featured ? (
                      <View style={[styles.featuredPill, { backgroundColor: colors.primary + '18' }]}>
                        <Text style={[styles.featuredPillText, { color: colors.primary }]}>Featured for you</Text>
                      </View>
                    ) : null}
                    <View style={styles.spotlightRow}>
                      <View style={[styles.spotlightIconWrap, { backgroundColor: accent + '22' }]}>
                        <Ionicons name={item.icon} size={22} color={accent} />
                      </View>
                      <View style={styles.spotlightTextCol}>
                        <Text style={styles.spotlightTitle}>{item.title}</Text>
                        <Text style={styles.spotlightDesc}>{item.description}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {step === 5 && (
          <View style={styles.screen}>
            <Text style={styles.screenTitle}>How are you feeling right now?</Text>
            <Text style={styles.screenSubtitle}>{"Pick one — there's no wrong answer"}</Text>
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
    options: {
      gap: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    optionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderLight,
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
      fontSize: Typography.fontSize.sm,
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
    spotlightList: {
      gap: Spacing.md,
    },
    spotlightCard: {
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      borderLeftWidth: 4,
      borderWidth: 1,
      borderColor: colors.borderLight,
      ...(Platform.OS === 'web' ? { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' } : Shadows.sm),
    },
    featuredPill: {
      alignSelf: 'flex-start',
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      borderRadius: Radius.full,
      marginBottom: Spacing.sm,
    },
    featuredPillText: {
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.semibold,
      fontFamily: Typography.fontFamily.primary,
    },
    spotlightRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    spotlightIconWrap: {
      width: 44,
      height: 44,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.md,
    },
    spotlightTextCol: {
      flex: 1,
    },
    spotlightTitle: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      marginBottom: 4,
      fontFamily: Typography.fontFamily.heading,
    },
    spotlightDesc: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
      fontFamily: Typography.fontFamily.primary,
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
