/**
 * Grounding Hub Screen
 *
 * State machine: 'select' → 'active' → 'complete'
 *
 * - select:  Choose a tag + pick a technique (glassmorphic cards)
 * - active:  Renders chosen technique full-screen (dark immersive)
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Typography, Radius, Shadows } from '@/constants/design-tokens';
import { useAuthStore } from '@/stores/auth-store';
import { saveRecoverySession } from '@/services/recovery-storage';
import { GROUNDING_MODES } from '@/data/grounding-content';
import type { GroundingMode, StressLevel, EmotionalTone, GroundingSession } from '@/types/grounding';
import { aiTechniqueToGroundingMode, type ChatReturnTarget } from '@/utils/chat-suggestion-navigation';
import { GlassBackground } from '@/components/ui/glass-background';
import { GlassCard } from '@/components/ui/glass-card';
import { TagChip } from '@/components/ui/tag-chip';

import { QuickReset } from '@/components/grounding/quick-reset';
import { SensoryAnchor } from '@/components/grounding/sensory-anchor';
import { BoxBreathing } from '@/components/grounding/box-breathing';
import { PreMeeting } from '@/components/grounding/pre-meeting';
import { PostConflict } from '@/components/grounding/post-conflict';

type ScreenState = 'select' | 'active' | 'complete';
type BreathingTag =
  | 'anger'
  | 'panic'
  | 'conflict'
  | 'pre_meeting'
  | 'calm'
  | 'reset'
  | 'focus'
  | 'post_meeting'
  | 'stress'
  | 'anxiety';

const STRESS_COLORS = ['#60A5FA', '#34D399', '#FBBF24', '#F97316', '#FB923C'];

const TECHNIQUE_ICONS: Record<string, string> = {
  quick_reset: 'flash-outline',
  sensory_anchor: 'eye-outline',
  box_breathing: 'cube-outline',
  pre_meeting: 'briefcase-outline',
  post_conflict: 'heart-outline',
};

const TECHNIQUE_DESCRIPTIONS: Record<string, string> = {
  quick_reset: '60 sec · Physiological sigh + grounding',
  sensory_anchor: '3-4 min · 5-4-3-2-1 senses',
  box_breathing: '4-5 min · Square breath + release',
  pre_meeting: '2-3 min · Breath + intention',
  post_conflict: '4-6 min · Label + breathe + reframe',
};

function parseReturnTo(raw: string | string[] | undefined): ChatReturnTarget | null {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === 'chat' || v === 'assist') return v;
  return null;
}

export default function GroundingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string | string[]; returnTo?: string | string[] }>();
  const colors = useColors();
  const { user } = useAuthStore();

  const returnTarget = parseReturnTo(params.returnTo);

  const [screen, setScreen] = useState<ScreenState>('select');
  const [stressLevel, setStressLevel] = useState<StressLevel>(3);
  const [emotionalTone, setEmotionalTone] = useState<EmotionalTone | null>(null);
  const [selectedMode, setSelectedMode] = useState<GroundingMode | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<BreathingTag | null>(null);
  const [sessionStart, setSessionStart] = useState<string>('');
  const [stressAfter, setStressAfter] = useState<StressLevel | null>(null);
  const [completionPct, setCompletionPct] = useState(0);
  const [helpful, setHelpful] = useState<boolean | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const deepLinkedRef = useRef(false);

  useEffect(() => {
    if (deepLinkedRef.current) return;
    const raw = params.mode;
    const modeParam = Array.isArray(raw) ? raw[0] : raw;
    if (!modeParam) return;
    const resolved = aiTechniqueToGroundingMode(modeParam);
    if (!resolved) return;
    deepLinkedRef.current = true;
    setSelectedMode(resolved);
    setSessionStart(new Date().toISOString());
    setScreen('active');
  }, [params.mode]);

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
      setStressAfter(selectedMode && selectedMode !== 'pre_meeting' ? stressLevel : null);
      setHelpful(null);
      transitionTo('complete');
    },
    [selectedMode, stressLevel, transitionTo],
  );

  const exitGrounding = useCallback(() => {
    if (returnTarget === 'chat') { router.replace('/chat'); return; }
    if (returnTarget === 'assist') { router.replace('/(tabs)/assist'); return; }
    router.replace('/(tabs)/recover');
  }, [router, returnTarget]);

  const handleModeExit = useCallback(() => {
    if (returnTarget) { exitGrounding(); return; }
    transitionTo('select');
  }, [returnTarget, exitGrounding, transitionTo]);

  const handleDone = useCallback(async () => {
    if (!user?.id || !selectedMode) { exitGrounding(); return; }
    const session: GroundingSession = {
      mode: selectedMode,
      stressBefore: stressLevel,
      stressAfter,
      emotionalTone,
      completionPct,
      durationMs: Date.now() - new Date(sessionStart).getTime(),
      startedAt: sessionStart,
      completedAt: new Date().toISOString(),
      helpful,
    };
    setSaveError(null);
    setIsSaving(true);
    try {
      await saveRecoverySession(user.id, session);
      exitGrounding();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('not configured') || msg.includes('Supabase')) { exitGrounding(); return; }
      console.error('[Grounding] Save failed:', e);
      setSaveError(msg || 'Could not save. Check connection and try again.');
    } finally {
      setIsSaving(false);
    }
  }, [user, selectedMode, stressLevel, stressAfter, emotionalTone, completionPct, sessionStart, helpful, exitGrounding]);

  const st = createStyles(colors);

  // ═══════════════ ACTIVE ════════════════════════════════════
  if (screen === 'active' && selectedMode) {
    const modeProps = { stressLevel, emotionalTone, onComplete: handleModeComplete, onExit: handleModeExit };
    switch (selectedMode) {
      case 'quick_reset': return <QuickReset {...modeProps} />;
      case 'sensory_anchor': return <SensoryAnchor {...modeProps} />;
      case 'box_breathing': return <BoxBreathing {...modeProps} />;
      case 'pre_meeting': return <PreMeeting {...modeProps} />;
      case 'post_conflict': return <PostConflict {...modeProps} />;
    }
  }

  // ═══════════════ SELECT ════════════════════════════════════
  if (screen === 'select') {
    const tags: Array<{ id: BreathingTag; label: string; defaultStress: StressLevel }> = [
      { id: 'anxiety', label: 'Anxiety', defaultStress: 4 },
      { id: 'calm', label: 'Calm', defaultStress: 2 },
      { id: 'reset', label: 'Reset', defaultStress: 3 },
      { id: 'focus', label: 'Focus', defaultStress: 3 },
      { id: 'stress', label: 'Stress', defaultStress: 4 },
      { id: 'panic', label: 'Panic', defaultStress: 5 },
      { id: 'anger', label: 'Anger', defaultStress: 5 },
      { id: 'conflict', label: 'Conflict', defaultStress: 4 },
      { id: 'pre_meeting', label: 'Pre‑meeting', defaultStress: 4 },
      { id: 'post_meeting', label: 'Post‑meeting', defaultStress: 2 },
    ];

    const recommendedByTag: Record<BreathingTag, GroundingMode> = {
      anxiety: 'quick_reset',
      calm: 'sensory_anchor',
      reset: 'quick_reset',
      focus: 'sensory_anchor',
      stress: 'box_breathing',
      panic: 'box_breathing',
      anger: 'post_conflict',
      conflict: 'post_conflict',
      pre_meeting: 'pre_meeting',
      post_meeting: 'quick_reset',
    };

    const accentForMode = (mode: GroundingMode) => {
      if (mode === 'quick_reset') return colors.accentWarm;
      if (mode === 'box_breathing') return colors.primary;
      if (mode === 'sensory_anchor') return colors.accentCalm;
      if (mode === 'pre_meeting') return colors.accentEnergy;
      return colors.accentSoft;
    };

    const recommendedMode = selectedTag ? recommendedByTag[selectedTag] : null;

    const renderTechniqueCard = (mode: GroundingMode, isRecommended: boolean) => {
      const cfg = GROUNDING_MODES.find((m) => m.id === mode);
      const accent = accentForMode(mode);
      return (
        <GlassCard
          key={mode}
          style={isRecommended ? { borderColor: accent + '50', borderWidth: 1.5 } : undefined}
          onPress={() => {
            setSelectedScenarioId(selectedTag);
            setEmotionalTone(null);
            beginMode(mode);
          }}
        >
          <View style={st.techniqueRow}>
            <View style={[st.techniqueIconWrap, { backgroundColor: accent }]}>
              <Ionicons name={(TECHNIQUE_ICONS[mode] ?? cfg?.icon ?? 'leaf-outline') as any} size={22} color="#fff" />
            </View>
            <View style={st.techniqueTextWrap}>
              <Text style={st.techniqueTitle}>{cfg?.label ?? mode}</Text>
              <Text style={st.techniqueDesc}>{TECHNIQUE_DESCRIPTIONS[mode] ?? ''}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
        </GlassCard>
      );
    };

    return (
      <GlassBackground>
        <View style={st.topBar}>
          <Text style={st.topTitle}>Grounding</Text>
          <TouchableOpacity style={st.closeBtn} onPress={exitGrounding} hitSlop={12}>
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <Animated.View style={[st.flexOne, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <ScrollView contentContainerStyle={st.selectScroll} showsVerticalScrollIndicator={false}>
            <Text style={st.heading}>What do you want to shift?</Text>

            <View style={st.tagRow}>
              {tags.map((t) => {
                const active = selectedTag === t.id;
                const accent = accentForMode(recommendedByTag[t.id]);
                return (
                  <TagChip
                    key={t.id}
                    label={t.label}
                    selected={active}
                    selectedColor={accent}
                    onPress={() => {
                      setSelectedTag(active ? null : t.id);
                      setStressLevel(t.defaultStress);
                    }}
                    style={!active ? { borderColor: accent + '33' } : undefined}
                  />
                );
              })}
            </View>

            {recommendedMode && (
              <>
                <Text style={st.sectionLabel}>Recommended</Text>
                {renderTechniqueCard(recommendedMode, true)}
              </>
            )}

            <Text style={st.sectionLabel}>All techniques</Text>
            <View style={st.techniqueList}>
              {GROUNDING_MODES.map((m) => renderTechniqueCard(m.id, recommendedMode === m.id))}
            </View>
          </ScrollView>
        </Animated.View>
      </GlassBackground>
    );
  }

  // ═══════════════ COMPLETE ══════════════════════════════════
  const delta = stressAfter != null ? stressLevel - stressAfter : 0;
  const modeLabel = GROUNDING_MODES.find((m) => m.id === selectedMode)?.label ?? '';
  const showStressSection = selectedMode && selectedMode !== 'pre_meeting';

  return (
    <GlassBackground>
      <ScrollView
        contentContainerStyle={st.completeScrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={[st.completeWrap, { opacity: fadeAnim }]}>
          <View style={st.successGlow}>
            <View style={st.successInner}>
              <Ionicons name="checkmark" size={36} color={colors.success} />
            </View>
          </View>

          <Text style={st.completeHeading}>Did it help?</Text>
          {modeLabel ? <Text style={st.completeModeName}>{modeLabel}</Text> : null}

          <View style={st.thumbRow}>
            <TouchableOpacity
              onPress={() => setHelpful(true)}
              activeOpacity={0.85}
              style={[st.thumbBtn, helpful === true && st.thumbBtnActive]}
            >
              <Ionicons name="thumbs-up-outline" size={22} color={helpful === true ? colors.primaryForeground : colors.textPrimary} />
              <Text style={[st.thumbText, helpful === true && st.thumbTextActive]}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setHelpful(false)}
              activeOpacity={0.85}
              style={[st.thumbBtn, helpful === false && st.thumbBtnActive]}
            >
              <Ionicons name="thumbs-down-outline" size={22} color={helpful === false ? colors.primaryForeground : colors.textPrimary} />
              <Text style={[st.thumbText, helpful === false && st.thumbTextActive]}>Not really</Text>
            </TouchableOpacity>
          </View>

          {showStressSection && (
            <GlassCard style={{ marginTop: Spacing.xl, width: '100%' }}>
              <Text style={st.stressCardTitle}>How's your stress now?</Text>
              <Text style={st.stressCardHint}>Tap a number — 1 is low, 5 is high</Text>
              <View style={st.stressRow}>
                {([1, 2, 3, 4, 5] as StressLevel[]).map((level) => {
                  const isSelected = stressAfter === level;
                  const accentColor = STRESS_COLORS[level - 1];
                  return (
                    <TouchableOpacity
                      key={level}
                      onPress={() => setStressAfter(level)}
                      style={[st.stressPill, isSelected && { backgroundColor: accentColor, borderColor: accentColor }]}
                      activeOpacity={0.8}
                    >
                      <Text style={[st.stressPillText, isSelected && { color: '#fff' }]}>{level}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={st.stressLabelsRow}>
                <Text style={st.stressCaption}>Low</Text>
                <Text style={st.stressCaption}>High</Text>
              </View>
            </GlassCard>
          )}

          {stressAfter != null && delta > 0 && (
            <View style={st.deltaCard}>
              <Ionicons name="trending-down" size={20} color={colors.success} />
              <Text style={st.deltaText}>Stress dropped by {delta} point{delta > 1 ? 's' : ''}</Text>
            </View>
          )}

          {saveError ? (
            <View style={st.saveErrorWrap}>
              <Text style={st.saveErrorText}>{saveError}</Text>
              <View style={st.saveErrorButtons}>
                <TouchableOpacity onPress={handleDone} style={st.retrySaveBtn} activeOpacity={0.85}>
                  <Text style={st.retrySaveBtnText}>Try again</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={exitGrounding} style={st.leaveAnywayBtn} activeOpacity={0.85}>
                  <Text style={st.leaveAnywayBtnText}>Leave anyway</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          <TouchableOpacity
            style={[
              st.primaryBtn,
              { marginTop: Spacing.xl, alignSelf: 'stretch', opacity: helpful == null || isSaving ? 0.6 : 1 },
            ]}
            onPress={handleDone}
            activeOpacity={0.85}
            disabled={helpful == null || isSaving}
          >
            <Text style={st.primaryBtnText}>{isSaving ? 'Saving…' : 'Done'}</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </GlassBackground>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flexOne: { flex: 1 },

    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingTop: Spacing.xl, paddingBottom: Spacing.sm },
    topTitle: { fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold, color: colors.textPrimary, fontFamily: Typography.fontFamily.heading },
    closeBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.full, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder },

    selectScroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing['2xl'] },
    heading: { fontSize: 26, fontWeight: Typography.fontWeight.semibold, color: colors.textPrimary, fontFamily: Typography.fontFamily.heading, marginBottom: Spacing.lg, letterSpacing: Typography.letterSpacing.snug, lineHeight: 34 },
    sectionLabel: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold, color: colors.textMuted, fontFamily: Typography.fontFamily.primary, marginTop: Spacing.xl, marginBottom: Spacing.md, letterSpacing: 1, textTransform: 'uppercase' },

    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    techniqueList: { gap: Spacing.sm },

    techniqueRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    techniqueIconWrap: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
    techniqueTextWrap: { flex: 1 },
    techniqueTitle: { fontSize: Typography.fontSize.cardTitle, fontWeight: Typography.fontWeight.semibold, color: colors.textPrimary, fontFamily: Typography.fontFamily.heading },
    techniqueDesc: { fontSize: Typography.fontSize.xs, color: colors.textMuted, fontFamily: Typography.fontFamily.primary, marginTop: 2 },

    completeScrollContent: { flexGrow: 1, padding: Spacing.lg, paddingBottom: Spacing['3xl'] },
    completeWrap: { alignItems: 'center', paddingVertical: Spacing.md },
    successGlow: {
      width: 88, height: 88, borderRadius: 44,
      backgroundColor: colors.success + '15',
      alignItems: 'center', justifyContent: 'center',
      marginBottom: Spacing.lg,
    },
    successInner: {
      width: 60, height: 60, borderRadius: 30,
      backgroundColor: colors.success + '25',
      borderWidth: 2, borderColor: colors.success + '50',
      alignItems: 'center', justifyContent: 'center',
    },
    completeHeading: { fontSize: 26, fontWeight: Typography.fontWeight.semibold, color: colors.textPrimary, fontFamily: Typography.fontFamily.heading, marginBottom: Spacing.xs },
    completeModeName: { fontSize: Typography.fontSize.sm, color: colors.textSecondary, fontFamily: Typography.fontFamily.primary },
    thumbRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xl },
    thumbBtn: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
      borderRadius: Radius.md, backgroundColor: colors.glass,
      borderWidth: 1, borderColor: colors.glassBorder,
    },
    thumbBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    thumbText: { fontSize: Typography.fontSize.base, color: colors.textPrimary, fontFamily: Typography.fontFamily.primary, fontWeight: Typography.fontWeight.semibold },
    thumbTextActive: { color: colors.primaryForeground },

    stressCardTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: colors.textPrimary, fontFamily: Typography.fontFamily.heading, marginBottom: Spacing.xs, textAlign: 'center' },
    stressCardHint: { fontSize: Typography.fontSize.xs, color: colors.textMuted, fontFamily: Typography.fontFamily.primary, marginBottom: Spacing.md, textAlign: 'center' },
    stressRow: { flexDirection: 'row', gap: Spacing.sm },
    stressPill: {
      flex: 1, minWidth: 44, height: 44, borderRadius: Radius.md,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.borderLight,
    },
    stressPillText: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: colors.textPrimary, fontFamily: Typography.fontFamily.primary },
    stressLabelsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm, paddingHorizontal: 2 },
    stressCaption: { fontSize: Typography.fontSize.xs, color: colors.textMuted, fontFamily: Typography.fontFamily.primary },

    deltaCard: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      backgroundColor: colors.success + '12', borderRadius: Radius.lg,
      paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
      marginTop: Spacing.lg,
    },
    deltaText: { fontSize: Typography.fontSize.sm, color: colors.success, fontWeight: Typography.fontWeight.medium, fontFamily: Typography.fontFamily.primary },

    saveErrorWrap: { marginTop: Spacing.md, alignSelf: 'stretch', alignItems: 'center' },
    saveErrorText: { fontSize: Typography.fontSize.sm, color: colors.destructive, textAlign: 'center', marginBottom: Spacing.sm, fontFamily: Typography.fontFamily.primary },
    saveErrorButtons: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xs },
    retrySaveBtn: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg },
    retrySaveBtnText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, color: colors.primary, fontFamily: Typography.fontFamily.primary },
    leaveAnywayBtn: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg },
    leaveAnywayBtnText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium, color: colors.textSecondary, fontFamily: Typography.fontFamily.primary },

    primaryBtn: {
      backgroundColor: colors.primary, borderRadius: Radius.md,
      paddingVertical: 14, paddingHorizontal: Spacing.xl,
      alignItems: 'center', justifyContent: 'center',
    },
    primaryBtnText: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: colors.primaryForeground, fontFamily: Typography.fontFamily.primary },
  });
