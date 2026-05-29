import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useColors, Spacing, Radius, Typography, Shadows } from '@/constants/design-tokens';
import { GlassCard } from '@/components/ui/glass-card';
import { Ionicons } from '@expo/vector-icons';

interface CompetencySprintPrimerProps {
  onNext: () => void;
}

export function CompetencySprintPrimer({ onNext }: CompetencySprintPrimerProps) {
  const colors = useColors();

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
    headerCard: {
      padding: Spacing.lg,
      borderRadius: Radius.xl,
      marginBottom: Spacing.md,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      backgroundColor: colors.glass,
      ...Shadows.card,
    },
    tag: {
      color: colors.primary,
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.micro,
      fontWeight: Typography.fontWeight.bold,
      letterSpacing: Typography.letterSpacing.uppercase,
      marginBottom: Spacing.xs,
      textTransform: 'uppercase',
    },
    title: {
      fontFamily: Typography.fontFamily.heading,
      fontSize: Typography.fontSize['2xl'],
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
      lineHeight: Typography.fontSize['2xl'] * 1.2,
      marginBottom: Spacing.sm,
    },
    subtitle: {
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      lineHeight: Typography.fontSize.sm * 1.5,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.md,
      marginBottom: Spacing.lg,
    },
    gridCard: {
      width: Platform.OS === 'web' ? '48%' : '100%',
      minWidth: 260,
      flexGrow: 1,
      padding: Spacing.md,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      backgroundColor: colors.glass,
      gap: Spacing.xs,
    },
    cardIcon: {
      width: 36,
      height: 36,
      borderRadius: Radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.xs,
    },
    cardTitle: {
      fontFamily: Typography.fontFamily.heading,
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
    },
    cardText: {
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.xs,
      color: colors.textSecondary,
      lineHeight: Typography.fontSize.xs * 1.5,
    },
    cta: {
      backgroundColor: colors.primary,
      paddingVertical: Spacing.md,
      borderRadius: Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: Spacing.sm,
      marginTop: Spacing.sm,
      ...Shadows.md,
      ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'transform 0.15s ease' } : {}),
    } as any,
    ctaText: {
      color: '#FFFFFF',
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.bold,
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Header Block */}
        <View style={styles.headerCard}>
          <Text style={styles.tag}>STAGE 1: 1-MIN PRIMER</Text>
          <Text style={styles.title}>Having Difficult Conversations</Text>
          <Text style={styles.subtitle}>
            In the modern workplace, avoiding hard conversations is the single greatest multiplier of team drag and toxic culture. Mastering this skill is what separates average managers from exceptional leaders.
          </Text>
        </View>

        {/* 4 Pillars Grid */}
        <View style={styles.grid}>
          
          <View style={styles.gridCard}>
            <View style={[styles.cardIcon, { backgroundColor: colors.primary + '14' }]}>
              <Ionicons name="chatbubbles-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>What it is</Text>
            <Text style={styles.cardText}>
              A highly deliberate, constructive dialogue designed to address misalignments, set boundaries, and resolve interpersonal friction before it escalates.
            </Text>
          </View>

          <View style={styles.gridCard}>
            <View style={[styles.cardIcon, { backgroundColor: colors.accentSage + '1A' }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.accentSage} />
            </View>
            <Text style={styles.cardTitle}>Why it is crucial</Text>
            <Text style={styles.cardText}>
              Unaddressed issues breed silent resentment, damage psychological safety, and lead to systemic delays. Clear communication unlocks collaborative speed.
            </Text>
          </View>

          <View style={styles.gridCard}>
            <View style={[styles.cardIcon, { backgroundColor: colors.accentTerracotta + '1A' }]}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.accentTerracotta} />
            </View>
            <Text style={styles.cardTitle}>The Common Pitfalls</Text>
            <Text style={styles.cardText}>
              Failing in two extremes: getting aggressive (forcing your point, triggering defense) or going silent/passive (apologizing, avoiding the core truth).
            </Text>
          </View>

          <View style={styles.gridCard}>
            <View style={[styles.cardIcon, { backgroundColor: colors.accentIndigo + '14' }]}>
              <Ionicons name="play-outline" size={18} color={colors.accentIndigo} />
            </View>
            <Text style={styles.cardTitle}>The Secret Playbook</Text>
            <Text style={styles.cardText}>
              1. Acknowledge and Validate their perspective first.{"\n"}
              2. Frame the issue with Objective Facts, not blame.{"\n"}
              3. Co-create a forward-looking action agreement.
            </Text>
          </View>
          
        </View>

        {/* Action Button */}
        <TouchableOpacity style={styles.cta} activeOpacity={0.85} onPress={onNext}>
          <Text style={styles.ctaText}>Start Sprint: Analyze Micro-skills</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}
