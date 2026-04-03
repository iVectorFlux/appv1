/**
 * Future Skill Detail + AI Practice
 *
 * Shows skill info, atomic sub-skills, and an interactive AI practice session:
 *   1. AI generates a scenario + question
 *   2. User types their answer
 *   3. AI gives structured feedback (strengths, growth areas, refinement prompt)
 *   4. User can refine and try again, or request a new scenario
 *
 * Uses /api/skills-coach for AI calls.
 * Saves completed rounds to Supabase via skills-storage.ts.
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import {
  useColors,
  Spacing,
  Typography,
  Radius,
  Layout,
} from '@/constants/design-tokens';
import { useAuthStore } from '@/stores/auth-store';
import { getSkillById } from '@/data/future-skills';
import type { AtomicSkill, FutureSkill } from '@/data/future-skills';
import { saveSkillSession } from '@/services/skills-storage';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type PracticePhase = 'idle' | 'loading_scenario' | 'answering' | 'loading_feedback' | 'feedback';

interface Feedback {
  feedback: string;
  strengths: string[];
  growthAreas: string[];
  refinementPrompt: string;
  nextScenarioAvailable: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getApiBase(): string {
  const appUrl = Constants.expoConfig?.extra?.appUrl ?? '';
  if (appUrl) return appUrl;
  if (Platform.OS === 'web') return '';
  const host = (Constants.expoConfig as any)?.hostUri ?? 'localhost:8081';
  return `http://${host}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function AtomicSkillChip({
  skill,
  selected,
  color,
  colors,
  onPress,
}: {
  skill: AtomicSkill;
  selected: boolean;
  color: string;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        chipStyles.chip,
        {
          backgroundColor: selected ? color + '22' : colors.surface,
          borderColor: selected ? color : colors.border,
        },
      ]}
    >
      <Text
        style={[chipStyles.chipText, { color: selected ? color : colors.textSecondary }]}
      >
        {skill.name}
      </Text>
    </TouchableOpacity>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm - 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    marginRight: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  chipText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
});

function FeedbackCard({
  fb,
  colors,
  skill,
}: {
  fb: Feedback;
  colors: ReturnType<typeof useColors>;
  skill: FutureSkill;
}) {
  return (
    <View style={[fbStyles.card, { backgroundColor: colors.floating, borderColor: colors.border }]}>
      {/* Overall feedback */}
      <Text style={[fbStyles.feedbackText, { color: colors.textPrimary }]}>{fb.feedback}</Text>

      {/* Strengths */}
      {fb.strengths.length > 0 && (
        <View style={fbStyles.section}>
          <View style={fbStyles.sectionHeader}>
            <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
            <Text style={[fbStyles.sectionTitle, { color: colors.primary }]}>Strengths</Text>
          </View>
          {fb.strengths.map((s, i) => (
            <Text key={i} style={[fbStyles.bullet, { color: colors.textPrimary }]}>
              · {s}
            </Text>
          ))}
        </View>
      )}

      {/* Growth areas */}
      {fb.growthAreas.length > 0 && (
        <View style={fbStyles.section}>
          <View style={fbStyles.sectionHeader}>
            <Ionicons name="trending-up-outline" size={14} color={colors.accentWarmTan} />
            <Text style={[fbStyles.sectionTitle, { color: colors.accentWarmTan }]}>
              Growth areas
            </Text>
          </View>
          {fb.growthAreas.map((g, i) => (
            <Text key={i} style={[fbStyles.bullet, { color: colors.textPrimary }]}>
              · {g}
            </Text>
          ))}
        </View>
      )}

      {/* Refinement prompt */}
      {fb.refinementPrompt && (
        <View style={[fbStyles.refinementBox, { backgroundColor: skill.color + '12', borderColor: skill.color + '30' }]}>
          <Ionicons name="arrow-forward-circle-outline" size={16} color={skill.color} />
          <Text style={[fbStyles.refinementText, { color: colors.textPrimary }]}>
            {fb.refinementPrompt}
          </Text>
        </View>
      )}
    </View>
  );
}

const fbStyles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  feedbackText: {
    fontSize: Typography.fontSize.base,
    lineHeight: Typography.fontSize.base * 1.5,
  },
  section: {
    gap: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bullet: {
    fontSize: Typography.fontSize.sm,
    lineHeight: Typography.fontSize.sm * 1.5,
    paddingLeft: Spacing.xs,
  },
  refinementBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
  },
  refinementText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    lineHeight: Typography.fontSize.sm * 1.5,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function SkillDetailScreen() {
  const { skillId } = useLocalSearchParams<{ skillId: string }>();
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuthStore();

  const skill = getSkillById(skillId ?? '');

  const [selectedAtomicId, setSelectedAtomicId] = useState<string | null>(null);
  const [phase, setPhase] = useState<PracticePhase>('idle');
  const [scenario, setScenario] = useState('');
  const [aiQuestion, setAiQuestion] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [roundsSaved, setRoundsSaved] = useState(0);

  const scrollRef = useRef<ScrollView>(null);
  const styles = createStyles(colors);

  if (!skill) {
    return (
      <View style={styles.errorContainer}>
        <Text style={{ color: colors.textPrimary }}>Skill not found.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: colors.primary, marginTop: 8 }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const selectedAtomic = skill.atomicSkills.find((a) => a.id === selectedAtomicId) ?? null;

  // ── Start practice: generate scenario ─────────────────────────────────────
  const startPractice = useCallback(async () => {
    setPhase('loading_scenario');
    setFeedback(null);
    setUserAnswer('');
    setAttemptNumber(1);

    try {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/api/skills-coach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillId: skill.id,
          skillName: skill.name,
          atomicSkillId: selectedAtomicId ?? null,
          atomicSkillName: selectedAtomic?.name ?? null,
          generateScenario: true,
        }),
      });

      if (!res.ok) throw new Error('API error');

      const data = (await res.json()) as { scenario: string; question: string };
      setScenario(data.scenario ?? '');
      setAiQuestion(data.question ?? '');
      setPhase('answering');

      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
    } catch {
      setPhase('idle');
    }
  }, [skill, selectedAtomicId, selectedAtomic]);

  // ── Submit answer: get feedback ───────────────────────────────────────────
  const submitAnswer = useCallback(async () => {
    const answer = userAnswer.trim();
    if (!answer || phase !== 'answering') return;

    setPhase('loading_feedback');

    try {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/api/skills-coach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillId: skill.id,
          skillName: skill.name,
          atomicSkillId: selectedAtomicId ?? null,
          atomicSkillName: selectedAtomic?.name ?? null,
          scenario,
          question: aiQuestion,
          userAnswer: answer,
          attemptNumber,
        }),
      });

      if (!res.ok) throw new Error('API error');

      const data = (await res.json()) as Feedback;
      setFeedback(data);
      setPhase('feedback');

      // Save to Supabase
      if (user?.id) {
        saveSkillSession({
          userId: user.id,
          skillId: skill.id,
          atomicSkillId: selectedAtomicId,
          scenario,
          aiQuestion,
          userAnswer: answer,
          aiFeedback: data.feedback ?? '',
          strengths: data.strengths ?? [],
          growthAreas: data.growthAreas ?? [],
          attemptNumber,
        });
        setRoundsSaved((n) => n + 1);
      }

      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
    } catch {
      setPhase('answering');
    }
  }, [userAnswer, phase, skill, selectedAtomicId, selectedAtomic, scenario, aiQuestion, attemptNumber, user?.id]);

  // ── Refine answer: keep scenario, increment attempt ───────────────────────
  const refineAnswer = () => {
    setAttemptNumber((n) => n + 1);
    setUserAnswer('');
    setFeedback(null);
    setPhase('answering');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
  };

  // ── New scenario ──────────────────────────────────────────────────────────
  const newScenario = () => {
    setScenario('');
    setAiQuestion('');
    setUserAnswer('');
    setFeedback(null);
    startPractice();
  };

  const isPracticing = phase !== 'idle';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={[styles.iconCircle, { backgroundColor: skill.color + '18' }]}>
            <Ionicons name={skill.icon as any} size={24} color={skill.color} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.skillName}>{skill.name}</Text>
            <Text style={styles.skillTagline}>{skill.tagline}</Text>
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About this skill</Text>
          <Text style={styles.bodyText}>{skill.description}</Text>
          <View style={[styles.whyBox, { backgroundColor: skill.color + '10', borderColor: skill.color + '30' }]}>
            <Ionicons name="information-circle-outline" size={16} color={skill.color} />
            <Text style={[styles.whyText, { color: colors.textPrimary }]}>{skill.why}</Text>
          </View>
        </View>

        {/* Atomic skills */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sub-skills</Text>
          <Text style={styles.bodyTextMuted}>
            Select a sub-skill to focus your practice session, or practice the full skill.
          </Text>
          <View style={styles.chipRow}>
            {skill.atomicSkills.map((a) => (
              <AtomicSkillChip
                key={a.id}
                skill={a}
                selected={selectedAtomicId === a.id}
                color={skill.color}
                colors={colors}
                onPress={() =>
                  setSelectedAtomicId((prev) => (prev === a.id ? null : a.id))
                }
              />
            ))}
          </View>
          {selectedAtomic && (
            <Text style={styles.atomicDesc}>{selectedAtomic.description}</Text>
          )}
        </View>

        {/* Practice CTA (when idle) */}
        {!isPracticing && (
          <View style={styles.section}>
            {roundsSaved > 0 && (
              <View style={[styles.roundsBadge, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
                <Text style={[styles.roundsText, { color: colors.primary }]}>
                  {roundsSaved} {roundsSaved === 1 ? 'round' : 'rounds'} completed this session
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.startBtn, { backgroundColor: skill.color }]}
              onPress={startPractice}
            >
              <Ionicons name="play-circle-outline" size={20} color="#fff" />
              <Text style={styles.startBtnText}>
                {roundsSaved > 0 ? 'Practice again' : 'Start AI Practice'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.practiceHint}>
              AI will give you a scenario, you answer, then get structured feedback.
            </Text>
          </View>
        )}

        {/* ── PRACTICE AREA ─────────────────────────────────────── */}
        {isPracticing && (
          <View style={styles.section}>
            <View style={styles.practiceHeader}>
              <Ionicons name="school-outline" size={16} color={skill.color} />
              <Text style={[styles.practiceLabel, { color: skill.color }]}>
                AI Practice
                {selectedAtomic ? ` · ${selectedAtomic.name}` : ''}
              </Text>
              <TouchableOpacity
                onPress={() => setPhase('idle')}
                hitSlop={8}
                style={{ marginLeft: 'auto' }}
              >
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Loading scenario */}
            {phase === 'loading_scenario' && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={skill.color} />
                <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                  Generating your scenario...
                </Text>
              </View>
            )}

            {/* Scenario + question */}
            {(phase === 'answering' || phase === 'loading_feedback' || phase === 'feedback') && (
              <>
                <View style={[styles.scenarioBox, { backgroundColor: skill.color + '0D', borderColor: skill.color + '30' }]}>
                  <Text style={[styles.scenarioLabel, { color: skill.color }]}>Scenario</Text>
                  <Text style={[styles.scenarioText, { color: colors.textPrimary }]}>{scenario}</Text>
                </View>

                <View style={styles.questionBox}>
                  <Text style={[styles.questionLabel, { color: colors.textSecondary }]}>
                    Question {attemptNumber > 1 ? `(attempt ${attemptNumber})` : ''}
                  </Text>
                  <Text style={[styles.questionText, { color: colors.textPrimary }]}>
                    {aiQuestion}
                  </Text>
                </View>

                {/* Answer input */}
                {(phase === 'answering' || phase === 'loading_feedback') && (
                  <View style={styles.answerArea}>
                    <TextInput
                      style={[
                        styles.answerInput,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                          color: colors.textPrimary,
                        },
                      ]}
                      value={userAnswer}
                      onChangeText={setUserAnswer}
                      placeholder="Type your answer here..."
                      placeholderTextColor={colors.textMuted}
                      multiline
                      textAlignVertical="top"
                      editable={phase === 'answering'}
                    />
                    <TouchableOpacity
                      style={[
                        styles.submitBtn,
                        {
                          backgroundColor:
                            userAnswer.trim() && phase === 'answering'
                              ? skill.color
                              : colors.surface,
                        },
                      ]}
                      onPress={submitAnswer}
                      disabled={!userAnswer.trim() || phase === 'loading_feedback'}
                    >
                      {phase === 'loading_feedback' ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons
                            name="send-outline"
                            size={16}
                            color={userAnswer.trim() ? '#fff' : colors.textMuted}
                          />
                          <Text
                            style={[
                              styles.submitBtnText,
                              { color: userAnswer.trim() ? '#fff' : colors.textMuted },
                            ]}
                          >
                            Get feedback
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {/* Feedback */}
                {phase === 'feedback' && feedback && (
                  <View style={styles.feedbackArea}>
                    <FeedbackCard fb={feedback} colors={colors} skill={skill} />

                    {/* Actions */}
                    <View style={styles.feedbackActions}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.refineBtn, { borderColor: skill.color }]}
                        onPress={refineAnswer}
                      >
                        <Ionicons name="pencil-outline" size={16} color={skill.color} />
                        <Text style={[styles.actionBtnText, { color: skill.color }]}>
                          Refine my answer
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: skill.color }]}
                        onPress={newScenario}
                      >
                        <Ionicons name="shuffle-outline" size={16} color="#fff" />
                        <Text style={[styles.actionBtnText, { color: '#fff' }]}>
                          New scenario
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      onPress={() => setPhase('idle')}
                      style={styles.doneLink}
                    >
                      <Text style={[styles.doneLinkText, { color: colors.textMuted }]}>
                        Done for now
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
    },
    content: {
      paddingBottom: Spacing['3xl'],
      maxWidth: Layout.maxWidth,
      alignSelf: 'center',
      width: '100%',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    header: {
      paddingTop: Platform.OS === 'ios' ? 52 : Spacing.lg,
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    backBtn: {},
    iconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: {
      flex: 1,
    },
    skillName: {
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
    },
    skillTagline: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
    },
    section: {
      paddingHorizontal: Spacing.md,
      marginBottom: Spacing.lg,
    },
    sectionTitle: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      marginBottom: Spacing.sm,
    },
    bodyText: {
      fontSize: Typography.fontSize.base,
      color: colors.textPrimary,
      lineHeight: Typography.fontSize.base * 1.5,
      marginBottom: Spacing.sm,
    },
    bodyTextMuted: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      marginBottom: Spacing.sm,
      lineHeight: Typography.fontSize.sm * 1.5,
    },
    whyBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.sm,
      borderWidth: 1,
      borderRadius: Radius.md,
      padding: Spacing.sm,
    },
    whyText: {
      flex: 1,
      fontSize: Typography.fontSize.sm,
      lineHeight: Typography.fontSize.sm * 1.5,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: Spacing.sm,
    },
    atomicDesc: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      lineHeight: Typography.fontSize.sm * 1.5,
      fontStyle: 'italic',
    },
    roundsBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      borderRadius: Radius.md,
      padding: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    roundsText: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.medium,
    },
    startBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      borderRadius: Radius.lg,
      paddingVertical: Spacing.md,
      marginBottom: Spacing.sm,
    },
    startBtnText: {
      color: '#fff',
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
    },
    practiceHint: {
      textAlign: 'center',
      fontSize: Typography.fontSize.xs,
      color: colors.textMuted,
    },
    practiceHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      marginBottom: Spacing.md,
    },
    practiceLabel: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
    },
    loadingBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      padding: Spacing.md,
    },
    loadingText: {
      fontSize: Typography.fontSize.sm,
    },
    scenarioBox: {
      borderWidth: 1,
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginBottom: Spacing.md,
    },
    scenarioLabel: {
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.semibold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: Spacing.xs,
    },
    scenarioText: {
      fontSize: Typography.fontSize.base,
      lineHeight: Typography.fontSize.base * 1.5,
    },
    questionBox: {
      marginBottom: Spacing.md,
    },
    questionLabel: {
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.semibold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: Spacing.xs,
    },
    questionText: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.medium,
      lineHeight: Typography.fontSize.base * 1.5,
    },
    answerArea: {
      gap: Spacing.sm,
    },
    answerInput: {
      borderWidth: 1,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      fontSize: Typography.fontSize.base,
      minHeight: 120,
      lineHeight: Typography.fontSize.base * 1.5,
    },
    submitBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      borderRadius: Radius.lg,
      paddingVertical: Spacing.md,
    },
    submitBtnText: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
    },
    feedbackArea: {
      gap: Spacing.md,
    },
    feedbackActions: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      borderRadius: Radius.lg,
      paddingVertical: Spacing.sm + 2,
    },
    refineBtn: {
      borderWidth: 1.5,
      backgroundColor: 'transparent',
    },
    actionBtnText: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
    },
    doneLink: {
      alignItems: 'center',
      paddingVertical: Spacing.xs,
    },
    doneLinkText: {
      fontSize: Typography.fontSize.sm,
    },
  });
