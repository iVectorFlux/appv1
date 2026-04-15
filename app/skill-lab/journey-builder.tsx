/**
 * Skill Lab — AI-generated step-by-step learning journey for one skill.
 */

import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Animated,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useColors,
  Spacing,
  Typography,
  Radius,
} from '@/constants/design-tokens';
import { FUTURE_SKILLS, getSkillById } from '@/data/future-skills';
import { buildVercelApiUrl } from '@/utils/vercel-api';
import {
  clearLearningJourney,
  loadLearningJourney,
  loadSkillPracticeContext,
  saveLearningJourney,
  practiceContextForApi,
  isSkillPracticeContextFilled,
  type LearningJourney,
  type LearningJourneyStep,
} from '@/services/skill-practice-context';

function formatSavedDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

export default function JourneyBuilderScreen() {
  const { skillId: paramSkillId } = useLocalSearchParams<{ skillId?: string }>();
  const router = useRouter();
  const colors = useColors();
  const initialId = (typeof paramSkillId === 'string' && paramSkillId) ? paramSkillId : FUTURE_SKILLS[0]?.id ?? '';
  const [skillId, setSkillId] = useState(initialId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [journey, setJourney] = useState<LearningJourney | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const stepsAnims = useRef<Animated.Value[]>([]).current;

  const skill = getSkillById(skillId) ?? FUTURE_SKILLS[0];

  useEffect(() => {
    if (typeof paramSkillId === 'string' && paramSkillId && getSkillById(paramSkillId)) {
      setSkillId(paramSkillId);
    }
  }, [paramSkillId]);

  useEffect(() => {
    if (!skill) return;
    loadLearningJourney(skill.id).then(setJourney);
  }, [skill]);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeAnim]);

  // Animate steps when journey loads (rebuild parallel anim values per step count).
  useEffect(() => {
    if (!journey?.steps.length) return;
    stepsAnims.length = 0;
    journey.steps.forEach(() => stepsAnims.push(new Animated.Value(0)));
    Animated.stagger(
      80,
      stepsAnims.map((a) => Animated.timing(a, { toValue: 1, duration: 350, useNativeDriver: true }))
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stepsAnims is effect-local staging; deps are length + skill id
  }, [journey?.steps.length, journey?.skillId]);

  const onGenerate = useCallback(async () => {
    if (!skill) return;
    setError(null);
    setLoading(true);
    try {
      const pc = await loadSkillPracticeContext();
      const practiceContext = isSkillPracticeContextFilled(pc) ? practiceContextForApi(pc) : undefined;

      const res = await fetch(buildVercelApiUrl('/api/skills-coach'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generateLearningJourney: true,
          skillId: skill.id,
          skillName: skill.name,
          atomicSkillsForJourney: skill.atomicSkills.map((a) => ({ id: a.id, name: a.name })),
          practiceContext,
        }),
      });

      if (!res.ok) {
        const t = await res.text().catch(() => '');
        let msg = `Could not generate (${res.status})`;
        try {
          const j = JSON.parse(t) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }

      const data = (await res.json()) as { summary?: string; steps?: LearningJourneyStep[] };
      const steps = Array.isArray(data.steps) ? data.steps : [];
      const saved: LearningJourney = {
        skillId: skill.id,
        skillName: skill.name,
        summary: String(data.summary ?? '').trim(),
        steps,
        savedAt: new Date().toISOString(),
      };
      await saveLearningJourney(saved);
      setJourney(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, [skill]);

  const onClearJourney = useCallback(() => {
    if (!skill) return;
    if (Platform.OS === 'web') {
      clearLearningJourney(skill.id).then(() => setJourney(null));
    } else {
      Alert.alert(
        'Clear journey?',
        'This will remove the saved journey for this skill.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear',
            style: 'destructive',
            onPress: () => clearLearningJourney(skill.id).then(() => setJourney(null)),
          },
        ]
      );
    }
  }, [skill]);

  const styles = createStyles(colors);
  const hasExistingJourney = journey && journey.steps.length > 0;

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <View style={styles.titleRow}>
              <View style={[styles.headerIcon, { backgroundColor: colors.accentIndigo + '15' }]}>
                <Ionicons name="map-outline" size={18} color={colors.accentIndigo} />
              </View>
              <Text style={styles.title}>Learning journey</Text>
            </View>
            <Text style={styles.subtitle}>
              Generate a step-by-step path for one skill. You can still open any skill anytime — this is an optional guide.
            </Text>
          </View>
        </View>

        {/* Skill picker */}
        <Text style={styles.fieldLabel}>Skill</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.skillPicker}>
          {FUTURE_SKILLS.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[
                styles.skillChip,
                {
                  borderColor: skillId === s.id ? s.color : colors.border,
                  backgroundColor: skillId === s.id ? s.color + '16' : colors.surface,
                },
              ]}
              onPress={() => {
                setSkillId(s.id);
                loadLearningJourney(s.id).then(setJourney);
              }}
            >
              <View style={[styles.skillChipDot, { backgroundColor: s.color }]} />
              <Text
                style={[styles.skillChipText, { color: skillId === s.id ? s.color : colors.textSecondary }]}
                numberOfLines={1}
              >
                {s.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Saved journey metadata */}
        {hasExistingJourney && journey.savedAt && (
          <View style={[styles.savedMeta, { backgroundColor: colors.floating, borderColor: colors.border }]}>
            <Ionicons name="time-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.savedMetaText, { color: colors.textMuted }]}>
              Last generated {formatSavedDate(journey.savedAt)}
            </Text>
          </View>
        )}

        {/* Generate / regenerate CTA */}
        <TouchableOpacity
          style={[styles.generateBtn, { backgroundColor: skill?.color ?? colors.primary }]}
          onPress={onGenerate}
          disabled={loading || !skill}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="sparkles-outline" size={20} color="#fff" />
              <Text style={styles.generateBtnText}>
                {hasExistingJourney ? 'Regenerate journey' : 'Create journey with AI'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {hasExistingJourney && (
          <Text style={[styles.regenerateHint, { color: colors.textMuted }]}>
            Regenerating will replace your saved journey for this skill.
          </Text>
        )}

        {/* Practice context link */}
        <TouchableOpacity
          onPress={() => router.push('/skill-lab/practice-setup')}
          style={[styles.linkCard, { borderColor: colors.border, backgroundColor: colors.floating }]}
          activeOpacity={0.75}
        >
          <Ionicons name="person-outline" size={16} color={colors.primary} />
          <Text style={[styles.linkCardText, { color: colors.primary }]}>
            Set practice context for better tailoring
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Error */}
        {error ? (
          <View style={[styles.errorBox, { borderColor: colors.destructive + '55', backgroundColor: colors.destructive + '12' }]}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          </View>
        ) : null}

        {/* Journey: visual timeline */}
        {hasExistingJourney ? (
          <View style={styles.journeyBlock}>
            {journey.summary ? (
              <View style={[styles.summaryBox, { borderColor: colors.border, backgroundColor: colors.floating }]}>
                <View style={styles.summaryHeader}>
                  <Ionicons name="document-text-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Overview</Text>
                </View>
                <Text style={[styles.summaryText, { color: colors.textPrimary }]}>{journey.summary}</Text>
              </View>
            ) : null}

            <Text style={styles.stepsHeading}>Steps</Text>
            {journey.steps.map((step, i) => {
              const journeySkill = getSkillById(journey.skillId) ?? skill;
              const sub = step.suggestedSubSkillId
                ? journeySkill?.atomicSkills.find((a) => a.id === step.suggestedSubSkillId)
                : null;
              const accent = journeySkill?.color ?? colors.primary;
              const isLast = i === journey.steps.length - 1;
              const anim = stepsAnims[i];
              const wrapStyle = anim
                ? { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }
                : {};

              return (
                <Animated.View key={`${step.order}-${i}`} style={[styles.timelineRow, wrapStyle as any]}>
                  {/* Timeline track */}
                  <View style={styles.timelineTrack}>
                    <View style={[styles.timelineDot, { backgroundColor: accent, borderColor: accent + '40' }]}>
                      <Text style={styles.timelineDotText}>{step.order}</Text>
                    </View>
                    {!isLast && (
                      <View style={[styles.timelineLine, { backgroundColor: accent + '25' }]} />
                    )}
                  </View>

                  {/* Step content */}
                  <View style={[styles.stepCard, { borderColor: colors.border, backgroundColor: colors.floating }]}>
                    <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
                      {step.title}
                    </Text>
                    <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>{step.description}</Text>
                    {sub ? (
                      <View style={[styles.subSkillTag, { backgroundColor: accent + '12' }]}>
                        <Ionicons name="layers-outline" size={12} color={accent} />
                        <Text style={[styles.subSkillText, { color: accent }]}>
                          {sub.name}
                        </Text>
                      </View>
                    ) : null}
                    {journeySkill ? (
                      <TouchableOpacity
                        style={[styles.openPractice, { borderColor: accent + '40' }]}
                        onPress={() => router.push(`/skill-lab/${journeySkill.id}` as never)}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.openPracticeText, { color: accent }]}>Open skill lab</Text>
                        <Ionicons name="arrow-forward" size={14} color={accent} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </Animated.View>
              );
            })}

            {/* Clear journey */}
            <TouchableOpacity onPress={onClearJourney} style={styles.clearLink} activeOpacity={0.65}>
              <Ionicons name="trash-outline" size={14} color={colors.destructive} />
              <Text style={[styles.clearLinkText, { color: colors.destructive }]}>Clear saved journey</Text>
            </TouchableOpacity>
          </View>
        ) : journey && journey.steps.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="map-outline" size={40} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No steps returned. Try generating again.</Text>
          </View>
        ) : !loading ? (
          <View style={styles.emptyState}>
            <Ionicons name="sparkles-outline" size={40} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No journey yet</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Pick a skill above and tap "Create journey" to get a personalised learning path.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </Animated.View>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: {
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing['2xl'],
      paddingTop: Platform.OS === 'ios' ? 48 : Spacing.lg,
      maxWidth: 640,
      alignSelf: 'center',
      width: '100%',
    },
    header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.lg },
    backBtn: { marginTop: 2 },
    headerText: { flex: 1 },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginBottom: Spacing.xs,
    },
    headerIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: Typography.fontSize['2xl'],
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      lineHeight: Typography.fontSize.sm * 1.5,
    },
    fieldLabel: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      marginBottom: Spacing.sm,
    },
    skillPicker: { gap: Spacing.sm, paddingBottom: Spacing.md },
    skillChip: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.full,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    skillChipDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    skillChipText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium, maxWidth: 200 },
    savedMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      borderWidth: 1,
      borderRadius: Radius.md,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      marginBottom: Spacing.md,
    },
    savedMetaText: { fontSize: Typography.fontSize.xs },
    generateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      borderRadius: Radius.lg,
      paddingVertical: Spacing.md,
      marginBottom: Spacing.xs,
    },
    generateBtnText: { color: '#fff', fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold },
    regenerateHint: {
      fontSize: Typography.fontSize.xs,
      textAlign: 'center',
      marginBottom: Spacing.md,
    },
    linkCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      borderWidth: 1,
      borderRadius: Radius.md,
      paddingVertical: Spacing.sm + 2,
      paddingHorizontal: Spacing.md,
      marginBottom: Spacing.lg,
    },
    linkCardText: { flex: 1, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.sm,
      borderWidth: 1,
      borderRadius: Radius.md,
      padding: Spacing.sm,
      marginBottom: Spacing.md,
    },
    errorText: { flex: 1, fontSize: Typography.fontSize.sm, lineHeight: Typography.fontSize.sm * 1.45 },
    journeyBlock: { marginTop: Spacing.sm },
    summaryBox: {
      borderWidth: 1,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.lg,
      gap: Spacing.sm,
    },
    summaryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    summaryLabel: {
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.semibold,
    },
    summaryText: { fontSize: Typography.fontSize.sm, lineHeight: Typography.fontSize.sm * 1.55 },
    stepsHeading: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      marginBottom: Spacing.md,
    },

    /* Timeline */
    timelineRow: {
      flexDirection: 'row',
      gap: Spacing.md,
      marginBottom: 0,
    },
    timelineTrack: {
      alignItems: 'center',
      width: 28,
    },
    timelineDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timelineDotText: {
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.bold,
      color: '#fff',
    },
    timelineLine: {
      width: 2,
      flex: 1,
      minHeight: 20,
    },
    stepCard: {
      flex: 1,
      borderWidth: 1,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      gap: Spacing.xs,
    },
    stepTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold },
    stepDesc: { fontSize: Typography.fontSize.sm, lineHeight: Typography.fontSize.sm * 1.5 },
    subSkillTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      alignSelf: 'flex-start',
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
      borderRadius: Radius.full,
      marginTop: Spacing.xs,
    },
    subSkillText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.medium },
    openPractice: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm - 2,
      marginTop: Spacing.sm,
    },
    openPracticeText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
    clearLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      marginTop: Spacing.md,
      paddingVertical: Spacing.xs,
    },
    clearLinkText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },

    /* Empty state */
    emptyState: {
      alignItems: 'center',
      paddingVertical: Spacing['2xl'],
      gap: Spacing.sm,
    },
    emptyTitle: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
    },
    emptyText: {
      fontSize: Typography.fontSize.sm,
      textAlign: 'center',
      lineHeight: Typography.fontSize.sm * 1.5,
      maxWidth: 280,
    },
  });
