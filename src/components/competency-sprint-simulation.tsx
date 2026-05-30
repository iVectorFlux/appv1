import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Platform, KeyboardAvoidingView, Animated, Easing } from 'react-native';
import { useColors, Spacing, Radius, Typography, Shadows } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import { useCompetencySprintStore } from '@/stores/competency-sprint-store';
import { useWebLaptopLayout } from '@/hooks/useWebLaptopLayout';

function TypingIndicator({ color }: { color: string }) {
  const dot0 = useRef(new Animated.Value(0.3)).current;
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const dots = [dot0, dot1, dot2];
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(dot, { toValue: 1, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.delay(400),
        ])
      )
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, [dot0, dot1, dot2]);

  return (
    <View style={typingStyles.row}>
      {[dot0, dot1, dot2].map((dot, i) => (
        <Animated.View key={i} style={[typingStyles.dot, { backgroundColor: color, opacity: dot }]} />
      ))}
    </View>
  );
}

const typingStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingLeft: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});

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
  } = useCompetencySprintStore();

  const [freeText, setFreeText] = useState('');
  const [activeMobileTab, setActiveMobileTab] = useState<'chat' | 'telemetry'>('chat');

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
  }, [currentStage, startSimulation]);

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
      flexDirection: 'row',
      justifyContent: 'flex-start',
      paddingRight: 48,
      marginBottom: Spacing.xl,
      gap: 10,
    },
    userRow: {
      alignItems: 'flex-end',
      justifyContent: 'flex-end',
      paddingLeft: 48,
      marginBottom: Spacing.md,
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
      flexShrink: 0,
    },
    avatarText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: Typography.fontWeight.bold,
    },
    assistantContent: {
      flex: 1,
    },
    userBubble: {
      backgroundColor: colors.primary,
      borderRadius: Radius.xl,
      borderBottomRightRadius: 6,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      maxWidth: '85%',
      ...Shadows.sm,
    },
    userText: {
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.sm,
      lineHeight: Typography.fontSize.sm * 1.45,
      color: '#FFFFFF',
    },
    msgName: {
      fontFamily: Typography.fontFamily.heading,
      fontSize: 9,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textMuted,
      marginBottom: 4,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    msgText: {
      fontFamily: Typography.fontFamily.primary,
      fontSize: Typography.fontSize.sm,
      lineHeight: Typography.fontSize.sm * 1.45,
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
      fontSize: 16,
      maxHeight: 100,
      ...Shadows.sm,
      ...(Platform.OS === 'web' ? { outlineStyle: 'none', outlineWidth: 0 } : {}),
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
      flex: isWebLaptop ? 1.5 : 1,
      padding: Spacing.lg,
      backgroundColor: isWebLaptop ? colors.glass : 'transparent',
      borderTopWidth: 0,
      gap: Spacing.lg,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.glassBorder,
      paddingBottom: 4,
      marginTop: Spacing.sm,
      gap: Spacing.lg,
    },
    modeTab: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    modeTabActive: {
      borderBottomColor: colors.primary,
    },
    modeTabText: {
      fontFamily: Typography.fontFamily.heading,
      fontSize: 15,
      fontWeight: '600',
      letterSpacing: 0.2,
    },
    modeTabTextActive: {
      color: colors.textPrimary,
    },
    modeTabTextInactive: {
      color: colors.textMuted,
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
        
        {currentStage === 'guided' ? (
          <>
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
          </>
        ) : (
          <View style={{ paddingVertical: Spacing.md, alignItems: 'center', gap: Spacing.sm }}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
            <Text style={{ fontFamily: Typography.fontFamily.primary, fontSize: Typography.fontSize.xs, color: colors.textMuted, textAlign: 'center', lineHeight: 16 }}>
              Live telemetry is locked in {currentStage === 'independent' ? 'Independent Practice' : 'Escalation Challenge'} mode to evaluate your skills.
            </Text>
          </View>
        )}
      </View>

      {/* Real-time tips */}
      <View style={styles.sideCard}>
        {currentStage === 'guided' ? (
          <View style={styles.tipBox}>
            <View style={styles.tipIconRow}>
              <Ionicons name="bulb" size={16} color={colors.accentTerracotta} />
              <Text style={styles.tipLabel}>COACHING TIP</Text>
            </View>
            <Text style={styles.tipText}>{activeTip}</Text>
          </View>
        ) : (
          <View style={{ paddingVertical: Spacing.xs, alignItems: 'center', gap: Spacing.sm }}>
            <Ionicons name="help-circle-outline" size={20} color={colors.textMuted} />
            <Text style={{ fontFamily: Typography.fontFamily.primary, fontSize: Typography.fontSize.xs, color: colors.textMuted, textAlign: 'center', lineHeight: 16 }}>
              Real-time hints and tips are disabled in this mode.
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderMobileTabs = () => {
    if (isWebLaptop) return null;

    return (
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={[styles.modeTab, activeMobileTab === 'chat' && styles.modeTabActive]}
          onPress={() => setActiveMobileTab('chat')}
        >
          <Text style={[styles.modeTabText, activeMobileTab === 'chat' ? styles.modeTabTextActive : styles.modeTabTextInactive]}>
            Chat
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, activeMobileTab === 'telemetry' && styles.modeTabActive]}
          onPress={() => setActiveMobileTab('telemetry')}
        >
          <Text style={[styles.modeTabText, activeMobileTab === 'telemetry' ? styles.modeTabTextActive : styles.modeTabTextInactive]}>
            Telemetry & Tip
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderChatColumn = () => (
    <View style={styles.chatColumn}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatScroll}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
      >
        {renderSimHeader()}

        {chatHistory.map((msg) => {
          const isSarah = msg.role === 'assistant';
          return (
            <View
              key={msg.id}
              style={[
                styles.messageRow,
                isSarah ? styles.assistantRow : styles.userRow,
              ]}
            >
              {isSarah ? (
                <>
                  <View style={[styles.avatar, { backgroundColor: colors.accentTerracotta }]}>
                    <Text style={styles.avatarText}>S</Text>
                  </View>
                  <View style={styles.assistantContent}>
                    <Text style={styles.msgName}>SARAH (COLLEAGUE)</Text>
                    <Text style={[styles.msgText, { color: colors.textPrimary }]}>
                      {msg.content}
                    </Text>
                  </View>
                </>
              ) : (
                <View style={styles.userBubble}>
                  <Text style={styles.userText}>
                    {msg.content}
                  </Text>
                </View>
              )}
            </View>
          );
        })}

        {/* Active typing indicator */}
        {submittingSimTurn && (
          <View style={styles.assistantRow}>
            <View style={[styles.avatar, { backgroundColor: colors.accentTerracotta }]}>
              <Text style={styles.avatarText}>S</Text>
            </View>
            <View style={styles.assistantContent}>
              <Text style={styles.msgName}>SARAH (COLLEAGUE)</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                <Text style={[styles.msgText, { color: colors.textMuted, fontStyle: 'italic' }]}>
                  Sarah is typing
                </Text>
                <TypingIndicator color={colors.textMuted} />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* User inputs */}
      {!isConcluded ? (
        activeOptions.length > 0 && currentStage === 'guided' ? (
          <View style={styles.optionsContainer}>
            <Text style={styles.optionsLabel}>Select your guided response:</Text>
            {activeOptions.map((opt: any) => (
              <TouchableOpacity
                key={opt.id}
                style={styles.optionCard}
                onPress={() => handleSelectOption(opt)}
              >
                <Text style={styles.optionText}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
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
        )
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
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        
        {/* Render Mobile Tab selector if not on web */}
        {renderMobileTabs()}

        {/* If web: show both side by side. If mobile: show selected tab */}
        {isWebLaptop ? (
          <>
            {renderChatColumn()}
            {sidebarContent}
          </>
        ) : (
          activeMobileTab === 'chat' ? (
            renderChatColumn()
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: Spacing.xl }}>
              {sidebarContent}
            </ScrollView>
          )
        )}

      </View>
    </KeyboardAvoidingView>
  );
}
