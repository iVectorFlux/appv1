import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useColors, Spacing, Radius, Typography, Shadows } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import { useCompetencySprintStore } from '@/stores/competency-sprint-store';
import { saveSprint } from '@/services/competency-sprint-service';

// Local seeds for drills (matches API seeds)
const DEFAULT_DRILLS = [
  {
    microSkillId: 'active_validation',
    scenario: "Your product manager says: 'You are always complaining about the timeline, but we have strict market deadlines to meet!'",
    question: "Acknowledge their timeline pressure first with genuine validation, without immediately agreeing to work overtime."
  },
  {
    microSkillId: 'objective_framing',
    scenario: "A peer from sales confronts you: 'Your division is completely ignoring our client requests! You guys are totally unresponsive!'",
    question: "Frame your reply objectively by asking for facts and separating observations from their emotional generalizations."
  },
  {
    microSkillId: 'clear_assertion',
    scenario: "A teammate says: 'Hey, I can't finish my part of the slides. Can you just write the executive summary for me tonight? Thanks!'",
    question: "Assert a firm, respectful boundary saying 'No' because of your prior commitments, without over-apologizing."
  },
  {
    microSkillId: 'emotional_containment',
    scenario: "In a review, a stakeholder slams their laptop: 'This design is completely garbage! Who signed off on this rubbish?'",
    question: "Respond with absolute calm and composure to de-escalate their anger and anchor the talk around constructive specifics."
  },
  {
    microSkillId: 'co_creative_problem_solving',
    scenario: "Your developer says: 'Look, I hate this new reporting system. It's a waste of time. I'm just not going to fill it out.'",
    question: "Pivot them away from their refusal into a co-creative brainstorming loop to find a method that satisfies tracking needs without frustrating them."
  }
];

export function CompetencySprintDrills() {
  const colors = useColors();
  const {
    sprint,
    currentDrillIndex,
    submittingDrill,
    setCurrentDrillIndex,
    submitDrillAnswer,
    moveToStage
  } = useCompetencySprintStore();

  const [inputText, setInputText] = useState('');

  // Auto-seed drills progress in the store if it's empty
  useEffect(() => {
    if (sprint && (!sprint.microDrillsProgress || sprint.microDrillsProgress.length === 0)) {
      const seeded = DEFAULT_DRILLS.map((d) => ({
        ...d,
        userAnswer: '',
        score: null,
        feedback: null,
        strengths: [],
        growthAreas: [],
        perfectResponse: null,
        completed: false
      }));
      const updated = { ...sprint, microDrillsProgress: seeded };
      void saveSprint(updated).then(() => {
        // Sync locally
        useCompetencySprintStore.setState({ sprint: updated });
      });
    }
  }, [sprint]);

  if (!sprint || !sprint.microDrillsProgress || sprint.microDrillsProgress.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const drills = sprint.microDrillsProgress;
  const currentDrill = drills[currentDrillIndex] || drills[0];
  const microSkill = sprint.microSkills.find((s) => s.id === currentDrill.microSkillId);

  // Synchronize input text when drill changes
  useEffect(() => {
    setInputText(currentDrill.userAnswer || '');
  }, [currentDrillIndex, currentDrill]);

  const handleSubmit = async () => {
    if (!inputText.trim() || submittingDrill) return;
    await submitDrillAnswer(currentDrill.microSkillId, inputText);
  };

  const handleNext = () => {
    if (currentDrillIndex < drills.length - 1) {
      setCurrentDrillIndex(currentDrillIndex + 1);
    } else {
      // Finished all drills, move to Guided Simulation
      void moveToStage('guided');
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 8) return colors.success;
    if (score >= 5) return colors.warning;
    return colors.accentTerracotta;
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    scroll: {
      flex: 1,
    },
    content: {
      padding: Spacing.md,
      paddingBottom: Spacing['5xl'],
    },
    header: {
      marginBottom: Spacing.md,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      fontFamily: Typography.fontFamily.heading,
      fontSize: Typography.fontSize.xl,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
    },
    counter: {
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.xs,
      color: colors.textMuted,
      fontWeight: Typography.fontWeight.semibold,
    },
    skillNameCard: {
      backgroundColor: colors.primary + '0D',
      borderColor: colors.primary + '30',
      borderWidth: 1,
      borderRadius: Radius.md,
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.sm,
      alignSelf: 'flex-start',
      marginBottom: Spacing.md,
    },
    skillNameText: {
      fontFamily: Typography.fontFamily.primary,
      fontSize: 10,
      fontWeight: Typography.fontWeight.bold,
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: Typography.letterSpacing.section,
    },
    scenarioCard: {
      backgroundColor: colors.glass,
      borderColor: colors.glassBorder,
      borderWidth: 1,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.md,
      ...Shadows.sm,
    },
    avatarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginBottom: Spacing.xs,
    },
    avatar: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.accentTerracotta,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: Typography.fontWeight.bold,
    },
    charName: {
      fontFamily: Typography.fontFamily.heading,
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
    },
    bubble: {
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.sm,
      color: colors.textPrimary,
      fontStyle: 'italic',
      lineHeight: Typography.fontSize.sm * 1.4,
      marginBottom: Spacing.sm,
    },
    promptLabel: {
      fontFamily: Typography.fontFamily.primary,
      fontSize: 10,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textMuted,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    promptText: {
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.xs,
      color: colors.textSecondary,
      lineHeight: Typography.fontSize.xs * 1.4,
    },
    inputBox: {
      backgroundColor: colors.glass,
      borderColor: colors.glassBorder,
      borderWidth: 1,
      borderRadius: Radius.md,
      padding: Spacing.md,
      minHeight: 120,
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.base,
      color: colors.textPrimary,
      textAlignVertical: 'top',
      marginBottom: Spacing.md,
    },
    submitBtn: {
      backgroundColor: colors.primary,
      paddingVertical: Spacing.md,
      borderRadius: Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: Spacing.sm,
      ...Shadows.md,
      ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
    } as any,
    submitText: {
      color: '#FFFFFF',
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.bold,
    },
    // Evaluation View Styles
    evalCard: {
      backgroundColor: colors.glass,
      borderColor: colors.glassBorder,
      borderWidth: 1,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.md,
      ...Shadows.sm,
      gap: Spacing.md,
    },
    scoreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    scoreLabel: {
      fontFamily: Typography.fontFamily.heading,
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
    },
    scoreBadge: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
    },
    scoreVal: {
      fontFamily: Typography.fontFamily.heading,
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.bold,
    },
    feedbackText: {
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.xs,
      color: colors.textSecondary,
      lineHeight: Typography.fontSize.xs * 1.5,
    },
    tagSection: {
      gap: Spacing.xs,
    },
    tagTitle: {
      fontFamily: Typography.fontFamily.primary,
      fontSize: 10,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: Typography.letterSpacing.section,
    },
    tagGrid: {
      gap: Spacing.xs,
    },
    tagBullet: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.xs,
    },
    bulletText: {
      flex: 1,
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.xs,
      color: colors.textSecondary,
      lineHeight: Typography.fontSize.xs * 1.4,
    },
    masterCard: {
      backgroundColor: colors.success + '0A',
      borderColor: colors.success + '30',
      borderWidth: 1,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.md,
      gap: Spacing.xs,
    },
    masterLabel: {
      fontFamily: Typography.fontFamily.primary,
      fontSize: 10,
      fontWeight: Typography.fontWeight.bold,
      color: colors.success,
      textTransform: 'uppercase',
      letterSpacing: Typography.letterSpacing.section,
    },
    masterQuote: {
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.xs,
      color: colors.textPrimary,
      fontStyle: 'italic',
      lineHeight: Typography.fontSize.xs * 1.4,
    },
    nextBtn: {
      backgroundColor: colors.success,
      paddingVertical: Spacing.md,
      borderRadius: Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: Spacing.sm,
      ...Shadows.md,
      ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
    } as any,
    nextText: {
      color: '#FFFFFF',
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.bold,
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Stage 3: Practice Drills</Text>
          <Text style={styles.counter}>Drill {currentDrillIndex + 1} of {drills.length}</Text>
        </View>

        {/* Micro-skill badge */}
        <View style={styles.skillNameCard}>
          <Text style={styles.skillNameText}>{microSkill?.name || currentDrill.microSkillId}</Text>
        </View>

        {/* Drill Scenario */}
        <View style={styles.scenarioCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>C</Text>
            </View>
            <Text style={styles.charName}>COUNTERPART</Text>
          </View>
          <Text style={styles.bubble}>"{currentDrill.scenario}"</Text>
          
          <Text style={styles.promptLabel}>COACH INSTRUCTION</Text>
          <Text style={styles.promptText}>{currentDrill.question}</Text>
        </View>

        {!currentDrill.completed ? (
          // Practice Form
          <>
            <TextInput
              multiline
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type your response here..."
              placeholderTextColor={colors.textMuted}
              style={styles.inputBox}
              editable={!submittingDrill}
            />

            <TouchableOpacity
              disabled={submittingDrill || !inputText.trim()}
              style={[
                styles.submitBtn,
                { opacity: submittingDrill || !inputText.trim() ? 0.6 : 1 }
              ]}
              onPress={handleSubmit}
              activeOpacity={0.8}
            >
              {submittingDrill ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.submitText}>Submit Response</Text>
                  <Ionicons name="paper-plane" size={16} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          // Feedback view
          <>
            <View style={styles.evalCard}>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>AI Coaching Evaluation</Text>
                <View
                  style={[
                    styles.scoreBadge,
                    {
                      borderColor: scoreColor(currentDrill.score),
                      backgroundColor: scoreColor(currentDrill.score) + '14',
                    },
                  ]}
                >
                  <Text style={[styles.scoreVal, { color: scoreColor(currentDrill.score) }]}>
                    {currentDrill.score}
                  </Text>
                </View>
              </View>

              <Text style={styles.feedbackText}>{currentDrill.feedback}</Text>

              {/* Strengths */}
              {currentDrill.strengths && currentDrill.strengths.length > 0 && (
                <View style={styles.tagSection}>
                  <Text style={styles.tagTitle}>Key Strengths</Text>
                  <View style={styles.tagGrid}>
                    {currentDrill.strengths.map((str: string, i: number) => (
                      <View key={i} style={styles.tagBullet}>
                        <Ionicons name="checkmark-circle" size={14} color={colors.success} style={{ marginTop: 2 }} />
                        <Text style={styles.bulletText}>{str}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Growth Areas */}
              {currentDrill.growthAreas && currentDrill.growthAreas.length > 0 && (
                <View style={styles.tagSection}>
                  <Text style={styles.tagTitle}>Growth Opportunities</Text>
                  <View style={styles.tagGrid}>
                    {currentDrill.growthAreas.map((gro: string, i: number) => (
                      <View key={i} style={styles.tagBullet}>
                        <Ionicons name="trending-up" size={14} color={colors.warning} style={{ marginTop: 2 }} />
                        <Text style={styles.bulletText}>{gro}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Perfect rephrase */}
            {currentDrill.perfectResponse && (
              <View style={styles.masterCard}>
                <Text style={styles.masterLabel}>The Master Rephrase</Text>
                <Text style={styles.masterQuote}>"{currentDrill.perfectResponse}"</Text>
              </View>
            )}

            {/* Next Action */}
            <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.8}>
              <Text style={styles.nextText}>
                {currentDrillIndex < drills.length - 1 ? 'Next Micro-drill' : 'Begin Guided Simulation'}
              </Text>
              <Ionicons
                name={currentDrillIndex < drills.length - 1 ? 'arrow-forward' : 'chatbubble-ellipses'}
                size={16}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </>
        )}

      </ScrollView>
    </View>
  );
}
