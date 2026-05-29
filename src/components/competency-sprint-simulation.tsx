import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import { useColors, Spacing, Radius, Typography, Shadows } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import { useCompetencySprintStore } from '@/stores/competency-sprint-store';
import { useWebLaptopLayout } from '@/hooks/useWebLaptopLayout';

export function CompetencySprintSimulation() {
  const colors = useColors();
  const isWebLaptop = useWebLaptopLayout();
  const scrollViewRef = useRef<ScrollView>(null);

  const {
    sprint,
    submittingSimTurn,
    startSimulation,
    submitSimulationTurn,
    completeActiveSimulation,
    error,
  } = useCompetencySprintStore();

  const [freeText, setFreeText] = useState('');

  // Determine active stage
  const currentStage = sprint?.currentStage || 'guided';
  const chatField = currentStage === 'guided'
    ? 'guidedSimChat'
    : currentStage === 'independent'
      ? 'independentSimChat'
      : 'escalatedSimChat';

  const chatHistory = sprint ? (sprint[chatField] || []) : [];
  const turnCount = chatHistory.filter((m: any) => m.role === 'user').length;

  // Initialize simulation chat on mount
  useEffect(() => {
    void startSimulation();
  }, [currentStage]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [chatHistory.length, submittingSimTurn]);

  if (!sprint || chatHistory.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Retrieve telemetry and tip from the last assistant message
  const lastAssistantMsg = [...chatHistory].reverse().find((m: any) => m.role === 'assistant');
  const activeTelemetry = lastAssistantMsg?.telemetry || { empathy: 50, clarity: 50, assertiveness: 50, deEscalation: 50 };
  const activeTip = lastAssistantMsg?.tip || "Focus on building trust and validating their concern before proposing actions.";
  const activeOptions = lastAssistantMsg?.options || [];

  // Guided completes after 3 turns, independent and escalated can be ended by user
  const isConcluded = currentStage === 'guided' ? turnCount >= 3 : turnCount >= 4;

  const handleSendFreeText = async () => {
    if (!freeText.trim() || submittingSimTurn) return;
    const txt = freeText;
    setFreeText('');
    await submitSimulationTurn(txt);
  };

  const handleSelectOption = async (option: any) => {
    if (submittingSimTurn) return;
    await submitSimulationTurn(option.label, option.id);
  };

  const getTelemetryBarColor = (score: number) => {
    if (score >= 80) return colors.success;
    if (score >= 50) return colors.warning;
    return colors.accentTerracotta;
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: isWebLaptop ? 'row' : 'column',
    },
    // Left: Chat Dialogue Column
    chatColumn: {
      flex: isWebLaptop ? 3 : 1,
      borderRightWidth: isWebLaptop ? 1 : 0,
      borderRightColor: colors.glassBorder,
      backgroundColor: 'transparent',
    },
    chatScroll: {
      flex: 1,
    },
    chatContent: {
      padding: Spacing.lg,
      paddingBottom: Spacing['2xl'],
    },
    // Messages bubble styles
    messageRow: {
      flexDirection: 'row',
      marginBottom: Spacing.lg,
      width: '100%',
    },
    systemRow: {
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Spacing.lg,
    },
    systemCard: {
      backgroundColor: colors.primary + '10',
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: colors.primary + '33',
      ...Shadows.sm,
    },
    systemText: {
      fontSize: 9,
      fontFamily: Typography.fontFamily.heading,
      fontWeight: Typography.fontWeight.bold,
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
    },
    assistantRow: {
      justifyContent: 'flex-start',
      paddingRight: 48,
    },
    userRow: {
      justifyContent: 'flex-end',
      paddingLeft: 48,
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.sm,
      marginTop: 2,
      borderWidth: 1.5,
      borderColor: '#FFFFFF',
      ...Shadows.sm,
    },
    avatarText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: Typography.fontWeight.bold,
    },
    bubble: {
      borderRadius: Radius.xl,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      ...Shadows.sm,
    },
    assistantBubble: {
      backgroundColor: colors.glass,
      borderColor: colors.glassBorder,
      borderWidth: 1,
      borderTopLeftRadius: 3,
    },
    userBubble: {
      backgroundColor: colors.primary,
      borderTopRightRadius: 3,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
    },
    msgName: {
      fontFamily: Typography.fontFamily.heading,
      fontSize: 9,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textMuted,
      marginBottom: 3,
      letterSpacing: 0.5,
    },
    msgText: {
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.sm,
      lineHeight: Typography.fontSize.sm * 1.45,
    },
    typingIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.sm,
      backgroundColor: colors.glass,
      borderColor: colors.glassBorder,
      borderWidth: 1,
      borderRadius: Radius.md,
      alignSelf: 'flex-start',
      marginLeft: 40,
      marginBottom: Spacing.md,
      ...Shadows.sm,
    },
    typingText: {
      fontSize: Typography.fontSize.xs,
      color: colors.textMuted,
      fontFamily: Typography.fontFamily.primary,
      fontWeight: Typography.fontWeight.medium,
    },
    // Guided choice selection
    optionsContainer: {
      padding: Spacing.lg,
      backgroundColor: colors.glass,
      borderTopWidth: 1,
      borderTopColor: colors.glassBorder,
      gap: Spacing.sm,
    },
    optionsLabel: {
      fontFamily: Typography.fontFamily.heading,
      fontSize: 10,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textMuted,
      textTransform: 'uppercase',
      marginBottom: Spacing.xs,
      letterSpacing: 0.5,
    },
    optionCard: {
      backgroundColor: colors.glass,
      borderColor: colors.glassBorder,
      borderWidth: 1,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      ...Shadows.sm,
      ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'border-color 0.15s ease' } : {}),
    } as any,
    optionCardHover: {
      borderColor: colors.primary,
    },
    optionText: {
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.xs,
      color: colors.textPrimary,
      lineHeight: Typography.fontSize.xs * 1.4,
    },
    // Free text entry
    freeTextContainer: {
      flexDirection: 'row',
      padding: Spacing.lg,
      backgroundColor: colors.glass,
      borderTopWidth: 1,
      borderTopColor: colors.glassBorder,
      gap: Spacing.md,
      alignItems: 'center',
    },
    freeInput: {
      flex: 1,
      backgroundColor: colors.glass,
      borderColor: colors.glassBorder,
      borderWidth: 1.5,
      borderRadius: Radius.xl,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      color: colors.textPrimary,
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.sm,
      maxHeight: 100,
      ...Shadows.sm,
      ...(Platform.OS === 'web' ? { outlineWidth: 0 } : {}),
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...Shadows.md,
    },
    // Completion Card
    concludeCard: {
      padding: Spacing.lg,
      backgroundColor: colors.success + '0E',
      borderTopWidth: 1,
      borderTopColor: colors.success + '40',
      alignItems: 'center',
      gap: Spacing.md,
      ...Shadows.sm,
    },
    concludeText: {
      fontFamily: Typography.fontFamily.heading,
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.bold,
      color: colors.success,
    },
    concludeBtn: {
      backgroundColor: colors.success,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xl,
      borderRadius: Radius.xl,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      ...Shadows.md,
    },
    concludeBtnText: {
      color: '#FFFFFF',
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.bold,
      letterSpacing: 0.3,
    },
    // Right: Sidebar / Mobile Telemetry Card
    sidebarColumn: {
      flex: isWebLaptop ? 1.5 : undefined,
      padding: Spacing.lg,
      backgroundColor: isWebLaptop ? colors.glass : 'transparent',
      borderTopWidth: !isWebLaptop ? 1 : 0,
      borderTopColor: colors.glassBorder,
      gap: Spacing.lg,
    },
    sideTitle: {
      fontFamily: Typography.fontFamily.heading,
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
      textTransform: 'uppercase',
      letterSpacing: Typography.letterSpacing.section,
    },
    sideCard: {
      backgroundColor: colors.glass,
      borderColor: colors.glassBorder,
      borderWidth: 1,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      ...Shadows.sm,
    },
    telemetryRow: {
      marginBottom: Spacing.sm,
      gap: 2,
    },
    telemetryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    telemetryLabel: {
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textSecondary,
    },
    telemetryVal: {
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.bold,
    },
    telemetryTrack: {
      height: 6,
      backgroundColor: colors.glassBorder,
      borderRadius: Radius.full,
      overflow: 'hidden',
    },
    telemetryFill: {
      height: '100%',
      borderRadius: Radius.full,
    },
    tipBox: {
      gap: Spacing.xs,
    },
    tipIconRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    tipLabel: {
      fontFamily: Typography.fontFamily.heading,
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.bold,
      color: colors.accentTerracotta,
    },
    tipText: {
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.xs,
      color: colors.textSecondary,
      lineHeight: Typography.fontSize.xs * 1.4,
    },
  });

  const renderSimHeader = () => (
    <View style={styles.systemRow}>
      <View style={styles.systemCard}>
        <Text style={styles.systemText}>
          {currentStage === 'guided'
            ? 'Stage 4: Guided Simulation'
            : currentStage === 'independent'
              ? 'Stage 5: Independent Practice'
              : 'Stage 6: Escalation Challenge'}
        </Text>
      </View>
    </View>
  );

  const sidebarContent = (
    <View style={styles.sidebarColumn}>
      {/* Telemetry Panel */}
      <View style={styles.sideCard}>
        <Text style={[styles.sideTitle, { marginBottom: Spacing.md }]}>Live EQ Telemetry</Text>
        
        {/* Empathy */}
        <View style={styles.telemetryRow}>
          <View style={styles.telemetryHeader}>
            <Text style={styles.telemetryLabel}>Empathy & Validation</Text>
            <Text style={[styles.telemetryVal, { color: getTelemetryBarColor(activeTelemetry.empathy) }]}>
              {activeTelemetry.empathy}%
            </Text>
          </View>
          <View style={styles.telemetryTrack}>
            <View
              style={[
                styles.telemetryFill,
                {
                  width: `${activeTelemetry.empathy}%`,
                  backgroundColor: getTelemetryBarColor(activeTelemetry.empathy),
                },
              ]}
            />
          </View>
        </View>

        {/* Assertiveness */}
        <View style={styles.telemetryRow}>
          <View style={styles.telemetryHeader}>
            <Text style={styles.telemetryLabel}>Healthy Assertiveness</Text>
            <Text style={[styles.telemetryVal, { color: getTelemetryBarColor(activeTelemetry.assertiveness) }]}>
              {activeTelemetry.assertiveness}%
            </Text>
          </View>
          <View style={styles.telemetryTrack}>
            <View
              style={[
                styles.telemetryFill,
                {
                  width: `${activeTelemetry.assertiveness}%`,
                  backgroundColor: getTelemetryBarColor(activeTelemetry.assertiveness),
                },
              ]}
            />
          </View>
        </View>

        {/* Clarity */}
        <View style={styles.telemetryRow}>
          <View style={styles.telemetryHeader}>
            <Text style={styles.telemetryLabel}>Objective Clarity</Text>
            <Text style={[styles.telemetryVal, { color: getTelemetryBarColor(activeTelemetry.clarity) }]}>
              {activeTelemetry.clarity}%
            </Text>
          </View>
          <View style={styles.telemetryTrack}>
            <View
              style={[
                styles.telemetryFill,
                {
                  width: `${activeTelemetry.clarity}%`,
                  backgroundColor: getTelemetryBarColor(activeTelemetry.clarity),
                },
              ]}
            />
          </View>
        </View>

        {/* De-escalation */}
        <View style={styles.telemetryRow}>
          <View style={styles.telemetryHeader}>
            <Text style={styles.telemetryLabel}>Emotional Containment</Text>
            <Text style={[styles.telemetryVal, { color: getTelemetryBarColor(activeTelemetry.deEscalation) }]}>
              {activeTelemetry.deEscalation}%
            </Text>
          </View>
          <View style={styles.telemetryTrack}>
            <View
              style={[
                styles.telemetryFill,
                {
                  width: `${activeTelemetry.deEscalation}%`,
                  backgroundColor: getTelemetryBarColor(activeTelemetry.deEscalation),
                },
              ]}
            />
          </View>
        </View>

      </View>

      {/* Real-time tips */}
      <View style={styles.sideCard}>
        <View style={styles.tipBox}>
          <View style={styles.tipIconRow}>
            <Ionicons name="bulb" size={16} color={colors.accentTerracotta} />
            <Text style={styles.tipLabel}>COACHING TIP</Text>
          </View>
          <Text style={styles.tipText}>{activeTip}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        
        {/* Dialogue Scroll Column */}
        <View style={styles.chatColumn}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.chatScroll}
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator={false}
          >
            {renderSimHeader()}

            {chatHistory.map((msg, index) => {
              const isSarah = msg.role === 'assistant';
              const nameText = isSarah ? 'SARAH (COLLEAGUE)' : 'YOU';
              const avatarColor = isSarah ? colors.accentTerracotta : colors.primary;

              return (
                <View
                  key={msg.id}
                  style={[
                    styles.messageRow,
                    isSarah ? styles.assistantRow : styles.userRow,
                  ]}
                >
                  {isSarah && (
                    <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                      <Text style={styles.avatarText}>S</Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.bubble,
                      isSarah ? styles.assistantBubble : styles.userBubble,
                    ]}
                  >
                    <Text style={styles.msgName}>
                      {nameText}
                    </Text>
                    <Text
                      style={[
                        styles.msgText,
                        { color: isSarah ? colors.textPrimary : '#FFFFFF' },
                      ]}
                    >
                      {msg.content}
                    </Text>
                  </View>
                </View>
              );
            })}

            {/* Active typing indicator */}
            {submittingSimTurn && (
              <View style={styles.typingIndicator}>
                <ActivityIndicator size="small" color={colors.textMuted} />
                <Text style={styles.typingText}>Sarah is writing spec feedback...</Text>
              </View>
            )}
          </ScrollView>

          {/* User inputs */}
          {!isConcluded ? (
            // Free Text input
            <View style={styles.freeTextContainer}>
              <TextInput
                value={freeText}
                onChangeText={setFreeText}
                placeholder="Draft your custom response..."
                placeholderTextColor={colors.textMuted}
                style={styles.freeInput}
                multiline
                maxLength={500}
                editable={!submittingSimTurn}
              />
              <TouchableOpacity
                disabled={submittingSimTurn || !freeText.trim()}
                style={[
                  styles.sendBtn,
                  { opacity: submittingSimTurn || !freeText.trim() ? 0.6 : 1 }
                ]}
                onPress={handleSendFreeText}
                activeOpacity={0.8}
              >
                <Ionicons name="send" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            // Concluded state
            <View style={styles.concludeCard}>
              <Text style={styles.concludeText}>Conversation Concluded</Text>
              <TouchableOpacity style={styles.concludeBtn} onPress={completeActiveSimulation}>
                <Text style={styles.concludeBtnText}>
                  {currentStage === 'guided'
                    ? 'Begin Independent simulation'
                    : currentStage === 'independent'
                      ? 'Begin Escalated simulation'
                      : 'Generate Sprint Report'}
                </Text>
                <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Telemetry panel (Sidebar on Web, inline on mobile) */}
        {isWebLaptop ? sidebarContent : !isConcluded && sidebarContent}

      </View>
    </KeyboardAvoidingView>
  );
}
