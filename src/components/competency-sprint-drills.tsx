import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useColors, Spacing, Radius, Typography, Shadows } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import { useCompetencySprintStore } from '@/stores/competency-sprint-store';

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

  const drills = sprint?.microDrillsProgress || [];
  const currentDrill = drills[currentDrillIndex] || drills[0] || null;
  const microSkill = currentDrill && sprint ? sprint.microSkills.find((s) => s.id === currentDrill.microSkillId) : null;

  // Synchronize input text when drill changes - defined unconditionally before early return!
  useEffect(() => {
    if (currentDrill) {
      setInputText(currentDrill.userAnswer || '');
    }
  }, [currentDrillIndex, currentDrill]);

  // Early return statement placed strictly after all hooks
  if (!sprint || drills.length === 0 || !currentDrill) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

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
      marginBottom: Spacing.sm,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    title: {
      fontFamily: Typography.fontFamily.heading,
      fontSize: Typography.fontSize['2xl'],
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
    },
    counter: {
      fontFamily: Typography.fontFamily.heading,
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: Typography.fontWeight.bold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    skillNameCard: {
      backgroundColor: colors.primary + '10',
      borderColor: colors.primary + '33',
      borderWidth: 1,
      borderRadius: Radius.full,
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.md,
      alignSelf: 'flex-start',
      marginBottom: Spacing.md,
    },
    skillNameText: {
      fontFamily: Typography.fontFamily.heading,
      fontSize: 9,
      fontWeight: Typography.fontWeight.bold,
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
    },
    scenarioCard: {
      backgroundColor: colors.glass,
      borderColor: colors.glassBorder,
      borderWidth: 1,
      borderRadius: Radius.xl,
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
      ...Shadows.card,
    },
    avatarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    avatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.accentTerracotta,
      alignItems: 'center',
      justifyContent: 'center',
      ...Shadows.sm,
    },
    avatarText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: Typography.fontWeight.bold,
    },
    charName: {
      fontFamily: Typography.fontFamily.heading,
      fontSize: 10,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textSecondary,
      letterSpacing: 0.5,
    },
    bubble: {
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.sm,
      color: colors.textPrimary,
      fontStyle: 'italic',
      lineHeight: Typography.fontSize.sm * 1.5,
      marginBottom: Spacing.md,
      backgroundColor: colors.glassBorder + '15',
      padding: Spacing.md,
      borderRadius: Radius.lg,
      borderColor: colors.glassBorder + '30',
      borderWidth: 1,
    },
    promptLabel: {
      fontFamily: Typography.fontFamily.heading,
      fontSize: 10,
      fontWeight: Typography.fontWeight.bold,
      color: colors.primary,
      textTransform: 'uppercase',
      marginBottom: 3,
      letterSpacing: 0.5,
    },
    promptText: {
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.xs,
      color: colors.textPrimary,
      lineHeight: Typography.fontSize.xs * 1.5,
      fontWeight: Typography.fontWeight.medium,
    },
    inputBox: {
      backgroundColor: colors.glass,
      borderColor: colors.glassBorder,
      borderWidth: 1.5,
      borderRadius: Radius.xl,
      padding: Spacing.md,
      minHeight: 120,
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.base,
      color: colors.textPrimary,
      textAlignVertical: 'top',
      marginBottom: Spacing.md,
      ...Shadows.sm,
      ...(Platform.OS === 'web' ? { outlineWidth: 0 } : {}),
    },
    submitBtn: {
      backgroundColor: colors.primary,
      paddingVertical: Spacing.md,
      borderRadius: Radius.xl,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: Spacing.sm,
      ...Shadows.md,
      ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'background-color 0.2s ease, transform 0.15s ease' } : {}),
    } as any,
    submitText: {
      color: '#FFFFFF',
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.bold,
      letterSpacing: 0.3,
    },
    // Evaluation View Styles
    evalCard: {
      backgroundColor: colors.glass,
      borderColor: colors.glassBorder,
      borderWidth: 1,
      borderRadius: Radius.xl,
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
      ...Shadows.card,
      gap: Spacing.md,
    },
    scoreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    scoreLabel: {
      fontFamily: Typography.fontFamily.heading,
      fontSize: Typography.fontSize.cardTitle,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
    },
    scoreBadge: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2.5,
      ...Shadows.sm,
    },
    scoreVal: {
      fontFamily: Typography.fontFamily.heading,
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.bold,
    },
    feedbackText: {
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.xs,
      color: colors.textPrimary,
      lineHeight: Typography.fontSize.xs * 1.5,
    },
    tagSection: {
      gap: Spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.glassBorder,
      paddingTop: Spacing.md,
    },
    tagTitle: {
      fontFamily: Typography.fontFamily.heading,
      fontSize: 10,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: Typography.letterSpacing.section,
    },
    tagGrid: {
      gap: Spacing.sm,
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
      backgroundColor: colors.success + '0E',
      borderColor: colors.success + '40',
      borderWidth: 1.5,
      borderRadius: Radius.xl,
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
      gap: Spacing.xs,
      ...Shadows.sm,
    },
    masterLabel: {
      fontFamily: Typography.fontFamily.heading,
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
      lineHeight: Typography.fontSize.xs * 1.5,
      fontWeight: Typography.fontWeight.medium,
    },
    nextBtn: {
      backgroundColor: colors.success,
      paddingVertical: Spacing.md,
      borderRadius: Radius.xl,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: Spacing.sm,
      ...Shadows.md,
      ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'background-color 0.2s ease, transform 0.15s ease' } : {}),
    } as any,
    nextText: {
      color: '#FFFFFF',
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.bold,
      letterSpacing: 0.3,
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
