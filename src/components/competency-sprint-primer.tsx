import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, ActivityIndicator } from 'react-native';
import { useColors, Spacing, Radius, Typography, Shadows } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import {
  INDUSTRY_OPTIONS,
  WORK_SETTING_OPTIONS,
  type IndustryId,
  type WorkSettingId,
  industryLabel,
  workSettingLabel,
} from '@/services/profile-context';

interface CompetencySprintPrimerProps {
  initialIndustry: IndustryId | null;
  initialRole: string | null;
  initialFunction: WorkSettingId | null;
  onStartSprint: (context: {
    industry: string;
    role: string;
    function: string;
    situation: string;
  }) => void;
  loading: boolean;
}

export function CompetencySprintPrimer({
  initialIndustry,
  initialRole,
  initialFunction,
  onStartSprint,
  loading,
}: CompetencySprintPrimerProps) {
  const colors = useColors();

  const [industry, setIndustry] = useState<IndustryId | null>(initialIndustry);
  const [role, setRole] = useState<string>(initialRole || '');
  const [workSetting, setWorkSetting] = useState<WorkSettingId | null>(initialFunction);
  const [situation, setSituation] = useState<string>('');

  const handleStart = () => {
    onStartSprint({
      industry: industryLabel(industry) || 'General Workplace',
      role: role.trim() || 'Professional',
      function: workSettingLabel(workSetting) || 'Collaborative Setting',
      situation: situation.trim(),
    });
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
    headerCard: {
      padding: Spacing.xl,
      borderRadius: Radius.xl,
      marginBottom: Spacing.lg,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      backgroundColor: colors.glass,
      ...Shadows.card,
    },
    tag: {
      color: colors.primary,
      fontFamily: Typography.fontFamily.heading,
      fontSize: 10,
      fontWeight: Typography.fontWeight.bold,
      letterSpacing: 1.5,
      marginBottom: Spacing.xs,
      textTransform: 'uppercase',
    },
    title: {
      fontFamily: Typography.fontFamily.heading,
      fontSize: Typography.fontSize['3xl'],
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
      lineHeight: Typography.fontSize['3xl'] * 1.15,
      marginBottom: Spacing.sm,
      letterSpacing: Typography.letterSpacing.narrow,
    },
    subtitle: {
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      lineHeight: Typography.fontSize.sm * 1.6,
      fontWeight: Typography.fontWeight.medium,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.md,
      marginBottom: Spacing.xl,
    },
    gridCard: {
      width: Platform.OS === 'web' ? '48%' : '100%',
      minWidth: 280,
      flexGrow: 1,
      padding: Spacing.lg,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      backgroundColor: colors.glass,
      gap: Spacing.sm,
      ...Shadows.sm,
    },
    cardIcon: {
      width: 44,
      height: 44,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.xs,
    },
    cardTitle: {
      fontFamily: Typography.fontFamily.heading,
      fontSize: Typography.fontSize.cardTitle,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
    },
    cardText: {
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.xs,
      color: colors.textSecondary,
      lineHeight: Typography.fontSize.xs * 1.5,
    },
    playbookStep: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.xs,
      marginTop: 2,
    },
    playbookNumber: {
      fontFamily: Typography.fontFamily.heading,
      fontSize: 11,
      fontWeight: Typography.fontWeight.bold,
      color: colors.accentIndigo,
      backgroundColor: colors.accentIndigo + '15',
      width: 18,
      height: 18,
      borderRadius: 9,
      textAlign: 'center',
      lineHeight: 18,
    },
    playbookText: {
      flex: 1,
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.xs,
      color: colors.textSecondary,
      lineHeight: 16,
    },
    // Form Styles
    formCard: {
      padding: Spacing.xl,
      borderRadius: Radius.xl,
      marginBottom: Spacing.xl,
      borderWidth: 1.5,
      borderColor: colors.primary + '30',
      backgroundColor: colors.glass,
      ...Shadows.card,
    },
    formTitle: {
      fontFamily: Typography.fontFamily.heading,
      fontSize: Typography.fontSize.xl,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
      marginBottom: Spacing.xs,
    },
    formSubtitle: {
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.xs,
      color: colors.textSecondary,
      lineHeight: 16,
      marginBottom: Spacing.lg,
    },
    label: {
      fontFamily: Typography.fontFamily.heading,
      fontSize: 11,
      fontWeight: Typography.fontWeight.bold,
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: Spacing.xs,
    },
    chipContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
      marginBottom: Spacing.lg,
    },
    chip: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      backgroundColor: colors.glassBorder + '10',
    },
    chipSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '18',
    },
    chipText: {
      fontFamily: Typography.fontFamily.primary,
      fontSize: 11,
      fontWeight: Typography.fontWeight.medium,
      color: colors.textSecondary,
    },
    chipTextSelected: {
      color: colors.primary,
      fontWeight: Typography.fontWeight.bold,
    },
    textInput: {
      backgroundColor: colors.glassBorder + '10',
      borderColor: colors.glassBorder,
      borderWidth: 1,
      borderRadius: Radius.md,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      fontSize: Typography.fontSize.sm,
      color: colors.textPrimary,
      fontFamily: Typography.fontFamily.primary,
      marginBottom: Spacing.lg,
      minHeight: 40,
      ...(Platform.OS === 'web' ? { outlineWidth: 0 } : {}),
    },
    textArea: {
      backgroundColor: colors.glassBorder + '10',
      borderColor: colors.glassBorder,
      borderWidth: 1,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      fontSize: Typography.fontSize.sm,
      color: colors.textPrimary,
      fontFamily: Typography.fontFamily.primary,
      minHeight: 88,
      textAlignVertical: 'top',
      marginBottom: Spacing.lg,
      ...(Platform.OS === 'web' ? { outlineWidth: 0 } : {}),
    },
    cta: {
      backgroundColor: colors.primary,
      paddingVertical: Spacing.md,
      borderRadius: Radius.xl,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: Spacing.sm,
      marginTop: Spacing.xs,
      ...Shadows.md,
      ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'transform 0.15s ease' } : {}),
    } as any,
    ctaText: {
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
              <Ionicons name="chatbubbles-outline" size={22} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>What it is</Text>
            <Text style={styles.cardText}>
              A highly deliberate, constructive dialogue designed to address misalignments, set boundaries, and resolve interpersonal friction before it escalates.
            </Text>
          </View>

          <View style={styles.gridCard}>
            <View style={[styles.cardIcon, { backgroundColor: colors.accentSage + '1A' }]}>
              <Ionicons name="shield-checkmark-outline" size={22} color={colors.accentSage} />
            </View>
            <Text style={styles.cardTitle}>Why it is crucial</Text>
            <Text style={styles.cardText}>
              Unaddressed issues breed silent resentment, damage psychological safety, and lead to systemic delays. Clear communication unlocks collaborative speed.
            </Text>
          </View>

          <View style={styles.gridCard}>
            <View style={[styles.cardIcon, { backgroundColor: colors.accentTerracotta + '1A' }]}>
              <Ionicons name="alert-circle-outline" size={22} color={colors.accentTerracotta} />
            </View>
            <Text style={styles.cardTitle}>The Common Pitfalls</Text>
            <Text style={styles.cardText}>
              Failing in two extremes: getting aggressive (forcing your point, triggering defense) or going silent/passive (apologizing, avoiding the core truth).
            </Text>
          </View>

          <View style={styles.gridCard}>
            <View style={[styles.cardIcon, { backgroundColor: colors.accentIndigo + '14' }]}>
              <Ionicons name="play-outline" size={22} color={colors.accentIndigo} />
            </View>
            <Text style={styles.cardTitle}>The Secret Playbook</Text>
            <View style={{ gap: Spacing.xs }}>
              <View style={styles.playbookStep}>
                <Text style={styles.playbookNumber}>1</Text>
                <Text style={styles.playbookText}>Acknowledge and Validate their perspective first.</Text>
              </View>
              <View style={styles.playbookStep}>
                <Text style={styles.playbookNumber}>2</Text>
                <Text style={styles.playbookText}>Frame the issue with Objective Facts, not blame.</Text>
              </View>
              <View style={styles.playbookStep}>
                <Text style={styles.playbookNumber}>3</Text>
                <Text style={styles.playbookText}>Co-create a forward-looking action agreement.</Text>
              </View>
            </View>
          </View>
          
        </View>

        {/* Customization Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Configure Your Sprint</Text>
          <Text style={styles.formSubtitle}>
            Our AI engine will customize your micro-skills, drills, and high-fidelity roleplay simulations to match your precise background and situation.
          </Text>

          {/* Industry Selection */}
          <Text style={styles.label}>Select Industry</Text>
          <View style={styles.chipContainer}>
            {INDUSTRY_OPTIONS.map((o) => {
              const isSelected = industry === o.id;
              return (
                <TouchableOpacity
                  key={o.id}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => setIndustry(o.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Professional Role */}
          <Text style={styles.label}>Professional Role / Title</Text>
          <TextInput
            style={styles.textInput}
            value={role}
            onChangeText={setRole}
            placeholder="e.g. Senior Software Engineer, Nurse Practitioner"
            placeholderTextColor={colors.textMuted}
            editable={!loading}
          />

          {/* Work Setting / Function */}
          <Text style={styles.label}>Work Setting / Function</Text>
          <View style={styles.chipContainer}>
            {WORK_SETTING_OPTIONS.map((o) => {
              const isSelected = workSetting === o.id;
              return (
                <TouchableOpacity
                  key={o.id}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => setWorkSetting(o.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Situation description */}
          <Text style={styles.label}>Friction Situation (Optional)</Text>
          <TextInput
            style={styles.textArea}
            value={situation}
            onChangeText={setSituation}
            multiline
            placeholder="e.g. A peer QA engineer rejects bug fixes with vague instructions, delaying deployment and creating stress. (Or leave blank to auto-generate a realistic challenge!)"
            placeholderTextColor={colors.textMuted}
            editable={!loading}
          />

          {/* Action Button */}
          <TouchableOpacity
            style={[styles.cta, loading && { opacity: 0.8 }]}
            activeOpacity={0.85}
            onPress={handleStart}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.ctaText}>Generate Customized Sprint</Text>
                <Ionicons name="sparkles" size={16} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

