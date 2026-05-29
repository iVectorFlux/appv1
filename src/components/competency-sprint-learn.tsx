import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, LayoutAnimation } from 'react-native';
import { useColors, Spacing, Radius, Typography, Shadows } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';

interface MicroSkill {
  id: string;
  name: string;
  description: string;
  why: string;
  goodExample: string;
  badExample: string;
  understood: boolean;
}

interface CompetencySprintLearnProps {
  microSkills: MicroSkill[];
  onCheckSkill: (id: string) => void;
  onNext: () => void;
}

export function CompetencySprintLearn({ microSkills, onCheckSkill, onNext }: CompetencySprintLearnProps) {
  const colors = useColors();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setExpandedId(expandedId === id ? null : id);
  };

  const allUnderstood = microSkills.every((s) => s.understood);
  const understoodCount = microSkills.filter((s) => s.understood).length;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    scroll: {
      flex: 1,
    },
    content: {
      padding: Spacing.md,
      paddingBottom: Spacing['4xl'],
    },
    header: {
      marginBottom: Spacing.lg,
    },
    title: {
      fontFamily: Typography.fontFamily.heading,
      fontSize: Typography.fontSize['2xl'],
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
      marginBottom: Spacing.xs,
    },
    subtitle: {
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.xs,
      color: colors.textSecondary,
      lineHeight: Typography.fontSize.xs * 1.5,
    },
    progressBox: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.glass,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      marginBottom: Spacing.lg,
      ...Shadows.sm,
    },
    progressText: {
      fontFamily: Typography.fontFamily.heading,
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    progressBar: {
      height: 8,
      backgroundColor: colors.glassBorder,
      borderRadius: Radius.full,
      flex: 1,
      marginLeft: Spacing.lg,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.success,
      borderRadius: Radius.full,
    },
    list: {
      gap: Spacing.md,
      marginBottom: Spacing.xl,
    },
    card: {
      borderRadius: Radius.xl,
      borderWidth: 1,
      backgroundColor: colors.glass,
      overflow: 'hidden',
      ...Shadows.sm,
      ...(Platform.OS === 'web' ? { transition: 'border-color 0.2s ease, box-shadow 0.2s ease' } : {}),
    } as any,
    cardHeader: {
      padding: Spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.md,
    },
    cardTitleBlock: {
      flex: 1,
      gap: 3,
    },
    cardName: {
      fontFamily: Typography.fontFamily.heading,
      fontSize: Typography.fontSize.cardTitle,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
    },
    cardShortDesc: {
      fontFamily: Typography.fontFamily.primary,
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 16,
    },
    checkIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
    },
    details: {
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.glassBorder,
      paddingTop: Spacing.md,
      gap: Spacing.lg,
    },
    detailsSection: {
      gap: Spacing.xs,
      borderLeftWidth: 2.5,
      borderLeftColor: colors.primary + '60',
      paddingLeft: Spacing.sm,
    },
    detailsLabel: {
      fontFamily: Typography.fontFamily.heading,
      fontSize: 10,
      fontWeight: Typography.fontWeight.bold,
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: Typography.letterSpacing.section,
    },
    detailsText: {
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.xs,
      color: colors.textPrimary,
      lineHeight: Typography.fontSize.xs * 1.5,
    },
    exampleContainer: {
      padding: Spacing.md,
      borderRadius: Radius.md,
      borderWidth: 1,
      gap: Spacing.xs,
    },
    exampleLabel: {
      fontFamily: Typography.fontFamily.heading,
      fontSize: 10,
      fontWeight: Typography.fontWeight.bold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    exampleQuote: {
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.xs,
      fontStyle: 'italic',
      lineHeight: Typography.fontSize.xs * 1.55,
    },
    understandBtn: {
      paddingVertical: Spacing.md,
      borderRadius: Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: Spacing.xs,
      borderWidth: 1.5,
      marginTop: Spacing.xs,
      ...Shadows.sm,
      ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
    } as any,
    understandBtnText: {
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.bold,
    },
    cta: {
      paddingVertical: Spacing.md,
      borderRadius: Radius.xl,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: Spacing.sm,
      ...Shadows.md,
      ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'background-color 0.2s ease, transform 0.15s ease' } : {}),
    } as any,
    ctaText: {
      color: '#FFFFFF',
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.bold,
      letterSpacing: 0.3,
    },
  });

  const progressPercent = microSkills.length > 0 ? (understoodCount / microSkills.length) * 100 : 0;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Stage 2: Core Micro-skills</Text>
          <Text style={styles.subtitle}>
            A difficult conversation is built of micro-behaviors. Tap each card to dissect the anatomy of these skills. Study the good vs bad examples, and mark them as understood.
          </Text>
        </View>

        {/* Progress Tracker */}
        <View style={styles.progressBox}>
          <Text style={styles.progressText}>{understoodCount} of {microSkills.length} understood</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        {/* List of Skills */}
        <View style={styles.list}>
          {microSkills.map((skill) => {
            const isExpanded = expandedId === skill.id;
            const borderColor = isExpanded
              ? colors.primary
              : skill.understood
                ? colors.success + '40'
                : colors.glassBorder;

            return (
              <View key={skill.id} style={[styles.card, { borderColor }]}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => toggleExpand(skill.id)}
                  style={styles.cardHeader}
                >
                  <View style={styles.cardTitleBlock}>
                    <Text style={styles.cardName}>{skill.name}</Text>
                    <Text numberOfLines={1} style={styles.cardShortDesc}>
                      {skill.description}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.checkIcon,
                      {
                        backgroundColor: skill.understood ? colors.success + '1A' : 'transparent',
                        borderColor: skill.understood ? colors.success : colors.glassBorder,
                      },
                    ]}
                  >
                    {skill.understood ? (
                      <Ionicons name="checkmark" size={14} color={colors.success} />
                    ) : null}
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.details}>
                    {/* Deep explanation */}
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>What it is</Text>
                      <Text style={styles.detailsText}>{skill.description}</Text>
                    </View>

                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Why it matters</Text>
                      <Text style={styles.detailsText}>{skill.why}</Text>
                    </View>

                    {/* Examples side-by-side / sequential */}
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsLabel}>Anatomy Analysis</Text>

                      {/* BAD */}
                      <View
                        style={[
                          styles.exampleContainer,
                          {
                            backgroundColor: colors.accentTerracotta + '0B',
                            borderColor: colors.accentTerracotta + '2A',
                            marginBottom: Spacing.sm,
                          },
                        ]}
                      >
                        <Text style={[styles.exampleLabel, { color: colors.accentTerracotta }]}>
                          Novice Mistake (Avoid / Deflect)
                        </Text>
                        <Text style={[styles.exampleQuote, { color: colors.textSecondary }]}>
                          {skill.badExample}
                        </Text>
                      </View>

                      {/* GOOD */}
                      <View
                        style={[
                          styles.exampleContainer,
                          {
                            backgroundColor: colors.success + '0B',
                            borderColor: colors.success + '2A',
                          },
                        ]}
                      >
                        <Text style={[styles.exampleLabel, { color: colors.success }]}>
                          Master Execution (Deliberate EQ)
                        </Text>
                        <Text style={[styles.exampleQuote, { color: colors.textPrimary }]}>
                          {skill.goodExample}
                        </Text>
                      </View>
                    </View>

                    {/* Understood Action Button */}
                    <TouchableOpacity
                      style={[
                        styles.understandBtn,
                        {
                          backgroundColor: skill.understood ? 'transparent' : colors.primary + '14',
                          borderColor: skill.understood ? colors.glassBorder : colors.primary,
                        },
                      ]}
                      onPress={() => onCheckSkill(skill.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={skill.understood ? 'checkmark-circle' : 'checkmark'}
                        size={14}
                        color={skill.understood ? colors.textMuted : colors.primary}
                      />
                      <Text
                        style={[
                          styles.understandBtnText,
                          { color: skill.understood ? colors.textMuted : colors.primary },
                        ]}
                      >
                        {skill.understood ? 'I understand this' : 'Mark as Understood'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Global Action Button */}
        <TouchableOpacity
          disabled={!allUnderstood}
          style={[
            styles.cta,
            {
              backgroundColor: allUnderstood ? colors.primary : colors.glassBorder,
            },
          ]}
          activeOpacity={0.85}
          onPress={allUnderstood ? onNext : undefined}
        >
          <Text style={styles.ctaText}>Unlock Practice Drills</Text>
          <Ionicons name="lock-open-outline" size={16} color="#FFFFFF" />
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}
