import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useColors, Spacing, Radius, Typography, Shadows } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import { useCompetencySprintStore } from '@/stores/competency-sprint-store';
import { useRouter } from 'expo-router';

export function CompetencySprintReport() {
  const colors = useColors();
  const router = useRouter();

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
    // Giant Mastery Score Card
    masterCard: {
      backgroundColor: colors.glass,
      borderColor: colors.glassBorder,
      borderWidth: 1,
      borderRadius: Radius.xl,
      padding: Spacing.xl,
      alignItems: 'center',
      marginBottom: Spacing.lg,
      ...Shadows.card,
    },
    tag: {
      color: colors.primary,
      fontFamily: Typography.fontFamily.heading,
      fontSize: 10,
      fontWeight: Typography.fontWeight.bold,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      marginBottom: Spacing.xs,
    },
    rating: {
      fontFamily: Typography.fontFamily.heading,
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.bold,
      color: colors.success,
      letterSpacing: 0.8,
      marginBottom: Spacing.lg,
    },
    scoreRing: {
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 6,
      borderColor: colors.success,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.success + '0B',
      marginBottom: Spacing.md,
      shadowColor: colors.success,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
    },
    scoreVal: {
      fontFamily: Typography.fontFamily.heading,
      fontSize: 40,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
      letterSpacing: Typography.letterSpacing.tight,
    },
    scoreLabel: {
      fontFamily: Typography.fontFamily.primary,
      fontSize: 9,
      color: colors.textMuted,
      fontWeight: Typography.fontWeight.bold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    // Trait Visualizer Section
    section: {
      backgroundColor: colors.glass,
      borderColor: colors.glassBorder,
      borderWidth: 1,
      borderRadius: Radius.xl,
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
      ...Shadows.card,
    },
    sectionTitle: {
      fontFamily: Typography.fontFamily.heading,
      fontSize: Typography.fontSize.cardTitle,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
      marginBottom: Spacing.lg,
      letterSpacing: Typography.letterSpacing.narrow,
    },
    traitRow: {
      marginBottom: Spacing.md,
      gap: Spacing.xs,
    },
    traitHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    traitLabel: {
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textSecondary,
    },
    traitVal: {
      fontFamily: Typography.fontFamily.heading,
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.bold,
    },
    traitTrack: {
      height: 8,
      backgroundColor: colors.glassBorder + '40',
      borderRadius: Radius.full,
      overflow: 'hidden',
    },
    traitFill: {
      height: '100%',
      borderRadius: Radius.full,
    },
    // Coach analysis narrative
    analysisText: {
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.xs,
      color: colors.textPrimary,
      lineHeight: Typography.fontSize.xs * 1.55,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary + '50',
      paddingLeft: Spacing.md,
    },
    // Strengths and growth area lists
    bulletRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.xs,
      marginBottom: Spacing.sm,
    },
    bulletText: {
      flex: 1,
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.xs,
      color: colors.textSecondary,
      lineHeight: Typography.fontSize.xs * 1.45,
    },
    // Recommended Practice banner
    loopBanner: {
      backgroundColor: colors.primary + '0A',
      borderColor: colors.primary + '25',
      borderWidth: 1.5,
      borderRadius: Radius.xl,
      padding: Spacing.lg,
      marginBottom: Spacing.xl,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.lg,
      ...Shadows.sm,
    },
    loopIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary + '14',
      alignItems: 'center',
      justifyContent: 'center',
      ...Shadows.sm,
    },
    loopTextWrap: {
      flex: 1,
      gap: 3,
    },
    loopTitle: {
      fontFamily: Typography.fontFamily.heading,
      fontSize: 10,
      fontWeight: Typography.fontWeight.bold,
      color: colors.primary,
      letterSpacing: 0.5,
    },
    loopDesc: {
      fontFamily: Typography.fontFamily.primary,
      fontSize: 11,
      color: colors.textSecondary,
      lineHeight: 15,
      fontWeight: Typography.fontWeight.medium,
    },
    // CTA Action Row
    ctaRow: {
      flexDirection: 'row',
      gap: Spacing.md,
      marginTop: Spacing.xs,
    },
    repeatBtn: {
      flex: 1,
      backgroundColor: colors.primary,
      paddingVertical: Spacing.md,
      borderRadius: Radius.xl,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: Spacing.xs,
      ...Shadows.md,
      ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'background-color 0.2s ease' } : {}),
    } as any,
    homeBtn: {
      flex: 1,
      backgroundColor: 'transparent',
      borderColor: colors.glassBorder,
      borderWidth: 1.5,
      paddingVertical: Spacing.md,
      borderRadius: Radius.xl,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: Spacing.xs,
      ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'border-color 0.2s ease' } : {}),
    } as any,
    repeatText: {
      color: '#FFFFFF',
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.bold,
      letterSpacing: 0.3,
    },
    homeText: {
      color: colors.textSecondary,
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.bold,
      letterSpacing: 0.3,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.xl,
      gap: Spacing.sm,
    },
    loadingText: {
      fontFamily: Typography.fontFamily.heading,
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.bold,
      textAlign: 'center',
      marginTop: Spacing.sm,
    },
    loadingSub: {
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.xs,
      color: '#888888',
      textAlign: 'center',
      lineHeight: 16,
      maxWidth: 280,
    },
  });

  const {
    sprint,
    generatingReport,
    generateReport,
    resetSprint
  } = useCompetencySprintStore();

  // Trigger report compilation on mount if missing
  useEffect(() => {
    if (sprint && !sprint.finalReport && !generatingReport) {
      void generateReport();
    }
  }, [sprint]);

  if (generatingReport || !sprint || !sprint.finalReport) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Coaching AI is compiling your transcript audit...</Text>
        <Text style={styles.loadingSub}>Analyzing empathy validation, fact framing, containment under hostility, and boundary assertions.</Text>
      </View>
    );
  }

  const report = sprint.finalReport;
  const traits = report.traits || { empathy: 75, clarity: 75, assertiveness: 75, deEscalation: 75, problemSolving: 75 };

  const getTraitColor = (score: number) => {
    if (score >= 85) return colors.success;
    if (score >= 70) return colors.primary;
    if (score >= 50) return colors.warning;
    return colors.accentTerracotta;
  };

  const getRatingLabel = (score: number) => {
    if (score >= 88) return "EMPATHETIC DIPLOMAT";
    if (score >= 78) return "COLLABORATIVE ALIGNER";
    if (score >= 65) return "DEVELOPING NEGOTIATOR";
    return "STRESS ANCHOR REQUIRED";
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Giant Score Summary */}
        <View style={styles.masterCard}>
          <Text style={styles.tag}>COMPETENCY SPRINT REPORT</Text>
          <Text style={styles.rating}>{getRatingLabel(report.overallScore)}</Text>
          <View style={styles.scoreRing}>
            <Text style={styles.scoreVal}>{report.overallScore}</Text>
            <Text style={styles.scoreLabel}>out of 100</Text>
          </View>
          <Text style={styles.scoreLabel}>Overall EQ Competency Rating</Text>
        </View>

        {/* Trait Visualizer Slider Bar Charts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Behavioral Trait Breakdown</Text>
          
          {/* Empathy */}
          <View style={styles.traitRow}>
            <View style={styles.traitHeader}>
              <Text style={styles.traitLabel}>Empathy & Validation</Text>
              <Text style={[styles.traitVal, { color: getTraitColor(traits.empathy) }]}>
                {traits.empathy}/100
              </Text>
            </View>
            <View style={styles.traitTrack}>
              <View style={[styles.traitFill, { width: `${traits.empathy}%`, backgroundColor: getTraitColor(traits.empathy) }]} />
            </View>
          </View>

          {/* Clarity */}
          <View style={styles.traitRow}>
            <View style={styles.traitHeader}>
              <Text style={styles.traitLabel}>Objective Fact Framing</Text>
              <Text style={[styles.traitVal, { color: getTraitColor(traits.clarity) }]}>
                {traits.clarity}/100
              </Text>
            </View>
            <View style={styles.traitTrack}>
              <View style={[styles.traitFill, { width: `${traits.clarity}%`, backgroundColor: getTraitColor(traits.clarity) }]} />
            </View>
          </View>

          {/* Assertiveness */}
          <View style={styles.traitRow}>
            <View style={styles.traitHeader}>
              <Text style={styles.traitLabel}>Healthy Boundary Assertion</Text>
              <Text style={[styles.traitVal, { color: getTraitColor(traits.assertiveness) }]}>
                {traits.assertiveness}/100
              </Text>
            </View>
            <View style={styles.traitTrack}>
              <View style={[styles.traitFill, { width: `${traits.assertiveness}%`, backgroundColor: getTraitColor(traits.assertiveness) }]} />
            </View>
          </View>

          {/* De-escalation */}
          <View style={styles.traitRow}>
            <View style={styles.traitHeader}>
              <Text style={styles.traitLabel}>Emotional De-escalation</Text>
              <Text style={[styles.traitVal, { color: getTraitColor(traits.deEscalation) }]}>
                {traits.deEscalation}/100
              </Text>
            </View>
            <View style={styles.traitTrack}>
              <View style={[styles.traitFill, { width: `${traits.deEscalation}%`, backgroundColor: getTraitColor(traits.deEscalation) }]} />
            </View>
          </View>

          {/* Problem Solving */}
          <View style={styles.traitRow}>
            <View style={styles.traitHeader}>
              <Text style={styles.traitLabel}>Co-creative Problem Solving</Text>
              <Text style={[styles.traitVal, { color: getTraitColor(traits.problemSolving) }]}>
                {traits.problemSolving}/100
              </Text>
            </View>
            <View style={styles.traitTrack}>
              <View style={[styles.traitFill, { width: `${traits.problemSolving}%`, backgroundColor: getTraitColor(traits.problemSolving) }]} />
            </View>
          </View>

        </View>

        {/* Qualitative Audit Text */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Executive Coach Audit</Text>
          <Text style={styles.analysisText}>{report.detailedAnalysis}</Text>
        </View>

        {/* Strengths */}
        {report.strengths && report.strengths.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.success }]}>Key Strengths</Text>
            {report.strengths.map((str: string, i: number) => (
              <View key={i} style={styles.bulletRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} style={{ marginTop: 2 }} />
                <Text style={styles.bulletText}>{str}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Growth Areas */}
        {report.growthAreas && report.growthAreas.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.warning }]}>Growth Opportunities</Text>
            {report.growthAreas.map((gro: string, i: number) => (
              <View key={i} style={styles.bulletRow}>
                <Ionicons name="trending-up" size={16} color={colors.warning} style={{ marginTop: 2 }} />
                <Text style={styles.bulletText}>{gro}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Mastery Recommended loop */}
        <View style={styles.loopBanner}>
          <View style={styles.loopIconWrap}>
            <Ionicons name="repeat" size={20} color={colors.primary} />
          </View>
          <View style={styles.loopTextWrap}>
            <Text style={styles.loopTitle}>RECOMMENDED PRACTICE LOOP</Text>
            <Text style={styles.loopDesc}>
              Behavioral habits take 21 days to form. We recommend completing this simulation **{report.recommendedRepeats} more times** to build strong synaptic muscle memory for de-escalating hostile meetings.
            </Text>
          </View>
        </View>

        {/* Action button row */}
        <View style={styles.ctaRow}>
          
          <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/(tabs)/home')} activeOpacity={0.8}>
            <Ionicons name="home-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.homeText}>Return Home</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.repeatBtn} onPress={resetSprint} activeOpacity={0.85}>
            <Ionicons name="repeat" size={16} color="#FFFFFF" />
            <Text style={styles.repeatText}>Repeat Sprint</Text>
          </TouchableOpacity>

        </View>

      </ScrollView>
    </View>
  );
}
