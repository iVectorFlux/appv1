/**
 * Grounding Entry Screen
 *
 * State machine: 'detect' → 'select' → 'active' → 'complete'
 *
 * - detect:  Self-rate stress + emotional tone → recommended mode
 * - select:  Browse all 5 modes (optional)
 * - active:  Renders chosen mode component full-screen
 * - complete: Post-session stress re-rate + save
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import { useAuthStore } from '@/stores/auth-store';
import { saveRecoverySession } from '@/services/recovery-storage';
import { GROUNDING_MODES, EMOTIONAL_TONES, recommendMode } from '@/data/grounding-content';
import type {
  GroundingMode,
  StressLevel,
  EmotionalTone,
  GroundingSession,
} from '@/types/grounding';

// Mode components
import { QuickReset } from '@/components/grounding/quick-reset';
import { SensoryAnchor } from '@/components/grounding/sensory-anchor';
import { PanicInterrupt } from '@/components/grounding/panic-interrupt';
import { PreMeeting } from '@/components/grounding/pre-meeting';
import { PostConflict } from '@/components/grounding/post-conflict';

type ScreenState = 'detect' | 'select' | 'active' | 'complete';

/** Stress level color gradient from cool → warm */
const STRESS_COLORS = ['#60A5FA', '#34D399', '#FBBF24', '#F97316', '#EF4444'];

export default function GroundingScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuthStore();

  const [screen, setScreen] = useState<ScreenState>('detect');
  const [stressLevel, setStressLevel] = useState<StressLevel>(3);
  const [emotionalTone, setEmotionalTone] = useState<EmotionalTone | null>(null);
  const [selectedMode, setSelectedMode] = useState<GroundingMode | null>(null);
  const [sessionStart, setSessionStart] = useState<string>('');
  const [stressAfter, setStressAfter] = useState<StressLevel>(3);
  const [completionPct, setCompletionPct] = useState(0);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const recommended = recommendMode(stressLevel, emotionalTone);
  const recommendedConfig = GROUNDING_MODES.find((m) => m.id === recommended)!;

  // Ambient pulse for recommended card
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.02, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const transitionTo = useCallback(
    (next: ScreenState) => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.97, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        setScreen(next);
        fadeAnim.setValue(0);
        scaleAnim.setValue(1.02);
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]).start();
      });
    },
    [fadeAnim, scaleAnim],
  );

  const beginMode = useCallback(
    (mode: GroundingMode) => {
      setSelectedMode(mode);
      setSessionStart(new Date().toISOString());
      transitionTo('active');
    },
    [transitionTo],
  );

  const handleModeComplete = useCallback(
    (pct: number) => {
      setCompletionPct(pct);
      setStressAfter(stressLevel);
      transitionTo('complete');
    },
    [stressLevel, transitionTo],
  );

  const handleModeExit = useCallback(() => transitionTo('detect'), [transitionTo]);

  const handleDone = useCallback(async () => {
    if (user?.id && selectedMode) {
      const session: GroundingSession = {
        mode: selectedMode,
        stressBefore: stressLevel,
        stressAfter,
        emotionalTone,
        completionPct,
        durationMs: Date.now() - new Date(sessionStart).getTime(),
        startedAt: sessionStart,
        completedAt: new Date().toISOString(),
      };
      try { await saveRecoverySession(user.id, session); } catch (e) { console.error('[Grounding] Save failed:', e); }
    }
    router.back();
  }, [user, selectedMode, stressLevel, stressAfter, emotionalTone, completionPct, sessionStart, router]);

  const styles = createStyles(colors);

  // ═══════════════════════════════════════════════════════════════════
  // ACTIVE
  // ═══════════════════════════════════════════════════════════════════
  if (screen === 'active' && selectedMode) {
    const modeProps = { stressLevel, emotionalTone, onComplete: handleModeComplete, onExit: handleModeExit };
    switch (selectedMode) {
      case 'quick_reset': return <QuickReset {...modeProps} />;
      case 'sensory_anchor': return <SensoryAnchor {...modeProps} />;
      case 'panic_interrupt': return <PanicInterrupt {...modeProps} />;
      case 'pre_meeting': return <PreMeeting {...modeProps} />;
      case 'post_conflict': return <PostConflict {...modeProps} />;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // DETECT
  // ═══════════════════════════════════════════════════════════════════
  if (screen === 'detect') {
    return (
      <View style={styles.container}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Text style={styles.topTitle}>Ground Yourself</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <Animated.View style={[styles.flexOne, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <ScrollView contentContainerStyle={styles.detectScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.heading}>How are you right now?</Text>

            {/* Stress level */}
            <Text style={styles.stressSectionLabel}>Stress level</Text>
            <View style={styles.stressRow}>
              {([1, 2, 3, 4, 5] as StressLevel[]).map((level) => {
                const isSelected = stressLevel === level;
                const accentColor = STRESS_COLORS[level - 1];
                return (
                  <TouchableOpacity
                    key={level}
                    onPress={() => setStressLevel(level)}
                    style={[styles.stressPill, isSelected && { backgroundColor: accentColor, borderColor: accentColor }]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.stressPillText, isSelected && { color: '#fff' }]}>{level}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.stressLabelsRow}>
              <Text style={styles.stressCaption}>Low</Text>
              <Text style={styles.stressCaption}>High</Text>
            </View>

            {/* Emotional tone */}
            <Text style={[styles.sectionLabel, { marginTop: Spacing['2xl'] }]}>What best describes how you feel?</Text>
            <View style={styles.toneWrap}>
              {EMOTIONAL_TONES.map((t) => {
                const isSelected = emotionalTone === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => setEmotionalTone(isSelected ? null : t.id)}
                    style={[styles.toneTag, isSelected && styles.toneTagActive]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.toneTagText, isSelected && styles.toneTagTextActive]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Recommendation card */}
            <Animated.View style={[styles.recommendCard, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.recommendIconWrap}>
                <Ionicons name={recommendedConfig.icon as any} size={22} color={colors.primary} />
              </View>
              <View style={styles.recommendContent}>
                <Text style={styles.recommendSmall}>Recommended for you</Text>
                <Text style={styles.recommendTitle}>{recommendedConfig.label}</Text>
                <Text style={styles.recommendDuration}>{recommendedConfig.duration}</Text>
              </View>
            </Animated.View>

            <TouchableOpacity style={styles.beginBtn} onPress={() => beginMode(recommended)} activeOpacity={0.85}>
              <Text style={styles.beginBtnText}>Begin</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.primaryForeground} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.chooseOther} onPress={() => transitionTo('select')} activeOpacity={0.8}>
              <Ionicons name="list-outline" size={20} color={colors.primary} />
              <Text style={styles.chooseOtherText}>Choose another mode</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // SELECT
  // ═══════════════════════════════════════════════════════════════════
  if (screen === 'select') {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backRow} onPress={() => transitionTo('detect')}>
            <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <View />
        </View>

        <Animated.View style={[styles.flexOne, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <ScrollView contentContainerStyle={styles.selectScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.heading}>Choose a mode</Text>

            {GROUNDING_MODES.map((mode) => {
              const isRecommended = mode.id === recommended;
              return (
                <TouchableOpacity
                  key={mode.id}
                  style={[styles.modeCard, isRecommended && { borderColor: colors.primary }]}
                  activeOpacity={0.75}
                  onPress={() => beginMode(mode.id)}
                >
                  <View style={[styles.modeIcon, isRecommended && { backgroundColor: colors.primary + '20' }]}>
                    <Ionicons name={mode.icon as any} size={26} color={isRecommended ? colors.primary : colors.textSecondary} />
                  </View>
                  <View style={styles.modeContent}>
                    <View style={styles.modeHeader}>
                      <Text style={styles.modeTitle}>{mode.label}</Text>
                      {isRecommended && (
                        <View style={styles.recBadge}>
                          <Text style={styles.recBadgeText}>Recommended</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.modeSub}>{mode.subtitle} · {mode.duration}</Text>
                    <Text style={styles.modeDesc}>{mode.description}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // COMPLETE
  // ═══════════════════════════════════════════════════════════════════
  const delta = stressLevel - stressAfter;
  const modeLabel = GROUNDING_MODES.find((m) => m.id === selectedMode)?.label ?? '';

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.completeWrap, { opacity: fadeAnim }]}>
        {/* Success icon with glow */}
        <View style={styles.successGlow}>
          <View style={styles.successInner}>
            <Ionicons name="checkmark" size={36} color={colors.success} />
          </View>
        </View>

        <Text style={styles.completeHeading}>Session complete</Text>
        {modeLabel ? <Text style={styles.completeModeName}>{modeLabel}</Text> : null}

        <Text style={[styles.stressSectionLabel, { marginTop: Spacing['3xl'], textAlign: 'center' }]}>How's your stress now?</Text>
        <View style={styles.stressRow}>
          {([1, 2, 3, 4, 5] as StressLevel[]).map((level) => {
            const isSelected = stressAfter === level;
            const accentColor = STRESS_COLORS[level - 1];
            return (
              <TouchableOpacity
                key={level}
                onPress={() => setStressAfter(level)}
                style={[styles.stressPill, isSelected && { backgroundColor: accentColor, borderColor: accentColor }]}
              >
                <Text style={[styles.stressPillText, isSelected && { color: '#fff' }]}>{level}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.stressLabelsRow}>
          <Text style={styles.stressCaption}>Low</Text>
          <Text style={styles.stressCaption}>High</Text>
        </View>

        {delta > 0 && (
          <View style={styles.deltaCard}>
            <Ionicons name="trending-down" size={20} color={colors.success} />
            <Text style={styles.deltaText}>Stress dropped by {delta} point{delta > 1 ? 's' : ''}</Text>
          </View>
        )}

        <TouchableOpacity style={[styles.beginBtn, { marginTop: Spacing['3xl'], alignSelf: 'stretch' }]} onPress={handleDone} activeOpacity={0.85}>
          <Text style={styles.beginBtnText}>Done</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flexOne: { flex: 1 },

    /* ── Top bar ──────────────────────────────────────── */
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingTop: Spacing['3xl'] },
    topTitle: { fontSize: Typography.fontSize.sm, color: colors.textMuted, fontFamily: Typography.fontFamily.primary, fontWeight: Typography.fontWeight.medium, letterSpacing: 0.5 },
    closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: colors.surface },
    backRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    backText: { fontSize: Typography.fontSize.sm, color: colors.textSecondary, fontWeight: Typography.fontWeight.medium, fontFamily: Typography.fontFamily.primary },

    /* ── Detect ────────────────────────────────────────── */
    detectScroll: { padding: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing['5xl'] },
    heading: { fontSize: 26, fontWeight: Typography.fontWeight.bold, color: colors.textPrimary, fontFamily: Typography.fontFamily.heading, marginBottom: Spacing['2xl'], lineHeight: 34 },
    sectionLabel: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, color: colors.textSecondary, fontFamily: Typography.fontFamily.primary, marginBottom: Spacing.md },

    /* Stress level — compact */
    stressSectionLabel: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.medium, color: colors.textMuted, fontFamily: Typography.fontFamily.primary, marginBottom: Spacing.sm },
    stressRow: { flexDirection: 'row', gap: Spacing.xs },
    stressPill: {
      flex: 1, height: 36, borderRadius: Radius.md,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight,
    },
    stressPillText: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: colors.textPrimary, fontFamily: Typography.fontFamily.primary },
    stressLabelsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
    stressCaption: { fontSize: 10, color: colors.textMuted, fontFamily: Typography.fontFamily.primary },

    /* Tone tags */
    toneWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    toneTag: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
    toneTagActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    toneTagText: { fontSize: Typography.fontSize.sm, color: colors.textPrimary, fontFamily: Typography.fontFamily.primary, fontWeight: Typography.fontWeight.medium },
    toneTagTextActive: { color: colors.primaryForeground },

    /* Recommend card — compact */
    recommendCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.surface, borderRadius: Radius.xl,
      padding: Spacing.md, marginTop: Spacing['2xl'],
      borderWidth: 1, borderColor: colors.primary + '25',
    },
    recommendIconWrap: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: colors.primary + '12',
      alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm,
    },
    recommendContent: { flex: 1 },
    recommendSmall: { fontSize: 10, color: colors.primary, fontFamily: Typography.fontFamily.primary, fontWeight: Typography.fontWeight.semibold, marginBottom: 1, textTransform: 'uppercase', letterSpacing: 0.5 },
    recommendTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold, color: colors.textPrimary, fontFamily: Typography.fontFamily.heading },
    recommendDuration: { fontSize: Typography.fontSize.xs, color: colors.textSecondary, fontFamily: Typography.fontFamily.primary, marginTop: 1 },

    /* Begin button */
    beginBtn: {
      backgroundColor: colors.primary, borderRadius: Radius.lg,
      paddingVertical: Spacing.lg, flexDirection: 'row',
      alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
      marginTop: Spacing.xl,
    },
    beginBtnText: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, color: colors.primaryForeground, fontFamily: Typography.fontFamily.primary },

    chooseOther: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      marginTop: Spacing.xl, gap: Spacing.sm,
      paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
      borderRadius: Radius.lg, borderWidth: 1.5, borderColor: colors.primary,
      backgroundColor: colors.primary + '08',
    },
    chooseOtherText: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: colors.primary, fontFamily: Typography.fontFamily.primary },

    /* ── Select ────────────────────────────────────────── */
    selectScroll: { padding: Spacing.xl, paddingBottom: Spacing['5xl'] },
    modeCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.surface, borderRadius: Radius['2xl'],
      padding: Spacing.lg, marginBottom: Spacing.md,
      borderWidth: 1.5, borderColor: colors.borderLight,
    },
    modeIcon: {
      width: 52, height: 52, borderRadius: 26,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight,
      alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md,
    },
    modeContent: { flex: 1 },
    modeHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 2 },
    modeTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold, color: colors.textPrimary, fontFamily: Typography.fontFamily.heading },
    recBadge: { backgroundColor: colors.primary + '18', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.full },
    recBadgeText: { fontSize: 10, color: colors.primary, fontWeight: Typography.fontWeight.semibold, fontFamily: Typography.fontFamily.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
    modeSub: { fontSize: Typography.fontSize.xs, color: colors.textMuted, fontFamily: Typography.fontFamily.primary, marginBottom: Spacing.xs },
    modeDesc: { fontSize: Typography.fontSize.sm, color: colors.textSecondary, fontFamily: Typography.fontFamily.primary, lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm },

    /* ── Complete ──────────────────────────────────────── */
    completeWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
    successGlow: {
      width: 100, height: 100, borderRadius: 50,
      backgroundColor: colors.success + '12',
      alignItems: 'center', justifyContent: 'center',
      marginBottom: Spacing.xl,
    },
    successInner: {
      width: 68, height: 68, borderRadius: 34,
      backgroundColor: colors.success + '20',
      borderWidth: 2, borderColor: colors.success + '40',
      alignItems: 'center', justifyContent: 'center',
    },
    completeHeading: { fontSize: 28, fontWeight: Typography.fontWeight.bold, color: colors.textPrimary, fontFamily: Typography.fontFamily.heading, marginBottom: Spacing.xs },
    completeModeName: { fontSize: Typography.fontSize.base, color: colors.textSecondary, fontFamily: Typography.fontFamily.primary },
    deltaCard: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      backgroundColor: colors.success + '12', borderRadius: Radius.lg,
      paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
      marginTop: Spacing.xl,
    },
    deltaText: { fontSize: Typography.fontSize.base, color: colors.success, fontWeight: Typography.fontWeight.medium, fontFamily: Typography.fontFamily.primary },
  });
