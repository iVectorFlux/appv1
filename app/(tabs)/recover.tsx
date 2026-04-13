/**
 * Recover Screen
 *
 * Grounding exercises + Release & Let Go with atmospheric animation.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  TextInput,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { Button } from '@/components/ui/button';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import { GlassBackground } from '@/components/ui/glass-background';
import { GlassCard } from '@/components/ui/glass-card';

type RecoverView = 'main' | 'release';

const AFFIRMATIONS = [
  "You are releasing what no longer serves you.",
  "This weight is not yours to carry.",
  "You are safe to let this go.",
  "Peace is available to you right now.",
  "You are stronger than this moment.",
  "Let it dissolve like mist in the morning sun.",
  "You deserve lightness.",
  "Breathe in calm, breathe out what hurts.",
];

const { height: SCREEN_H } = Dimensions.get('window');

export default function RecoverScreen() {
  const router = useRouter();
  const colors = useColors();
  const [view, setView] = useState<RecoverView>('main');
  const [releaseText, setReleaseText] = useState('');
  const [isReleasing, setIsReleasing] = useState(false);
  const [hasReleased, setHasReleased] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const textOpacity = useRef(new Animated.Value(1)).current;
  const riseAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const [currentAffirmation, setCurrentAffirmation] = useState('');
  const [showText, setShowText] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    return () => { if (soundRef.current) soundRef.current.unloadAsync().catch(() => {}); };
  }, []);

  // Ambient glow pulse when on release writing screen
  useEffect(() => {
    if (view !== 'release' || isReleasing) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 0.6, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 2000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [view, isReleasing]);

  const handleRelease = async () => {
    if (!releaseText.trim()) return;
    setIsReleasing(true);
    setShowText(true);
    setCurrentAffirmation(AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)]);
    fadeAnim.setValue(1);
    scaleAnim.setValue(1);
    textOpacity.setValue(0);
    riseAnim.setValue(0);

    // Phase 1: Show the text with affirmation
    Animated.parallel([
      Animated.timing(textOpacity, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1.02, useNativeDriver: true, speed: 4, bounciness: 6 }),
    ]).start();

    // Phase 2: Float up and dissolve
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 0, duration: 3500, useNativeDriver: true }),
        Animated.timing(riseAnim, { toValue: -80, duration: 3500, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.8, duration: 3500, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 3500, useNativeDriver: true }),
      ]).start(() => {
        setShowText(false);
        setReleaseText('');
        setIsReleasing(false);
        setHasReleased(true);
        fadeAnim.setValue(1);
        scaleAnim.setValue(1);
        textOpacity.setValue(1);
        riseAnim.setValue(0);
        if (soundRef.current) soundRef.current.unloadAsync().catch(() => {});
      });
    }, 4000);
  };

  const st = createStyles(colors);

  // ── Release view ────────────────────────────────
  if (view === 'release') {
    return (
      <GlassBackground style={{ flex: 1 }}>
        <View style={st.releaseRoot}>
          {/* Back button */}
          {!isReleasing && !hasReleased && (
            <TouchableOpacity
              onPress={() => { setView('main'); setHasReleased(false); setReleaseText(''); }}
              style={st.releaseBack}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          )}

          {/* Releasing animation */}
          {isReleasing && showText ? (
            <View style={st.releaseCenter}>
              <Animated.View style={[st.releaseFloat, { opacity: textOpacity, transform: [{ scale: scaleAnim }, { translateY: riseAnim }] }]}>
                <Text style={[st.releaseHint, { color: colors.textMuted }]}>Read it one more time, then let it go...</Text>

                <Animated.View style={[st.releaseQuote, { opacity: fadeAnim, borderColor: colors.glassBorder, backgroundColor: colors.glass }]}>
                  <Text style={[st.releaseQuoteText, { color: colors.textPrimary }]}>{releaseText}</Text>
                </Animated.View>

                <Animated.View style={[st.affirmRow, { opacity: textOpacity }]}>
                  <Ionicons name="water-outline" size={20} color={colors.primary} />
                  <Text style={[st.affirmText, { color: colors.textPrimary }]}>{currentAffirmation}</Text>
                </Animated.View>

                <Text style={[st.breatheText, { color: colors.textMuted }]}>Take a deep breath. Watch these words dissolve.</Text>
              </Animated.View>
            </View>
          ) : isReleasing ? (
            <View style={st.releaseCenter}>
              <Animated.View style={{ opacity: glowAnim }}>
                <Ionicons name="water-outline" size={48} color={colors.primary} />
              </Animated.View>
              <Text style={[st.releasingLabel, { color: colors.textSecondary }]}>Letting go...</Text>
            </View>
          ) : hasReleased ? (
            /* ── Post-release state ─────────────── */
            <View style={st.releaseCenter}>
              <View style={[st.releasedIcon, { backgroundColor: colors.primary + '14' }]}>
                <Ionicons name="checkmark" size={36} color={colors.primary} />
              </View>
              <Text style={[st.releasedTitle, { color: colors.textPrimary }]}>You let it go</Text>
              <Text style={[st.releasedBody, { color: colors.textSecondary }]}>
                You don't have to carry this right now.{'\n'}Take a breath. You're doing okay.
              </Text>
              <View style={st.releasedActions}>
                <TouchableOpacity
                  style={[st.releasedBtn, { backgroundColor: colors.primary }]}
                  onPress={() => { setHasReleased(false); setReleaseText(''); }}
                  activeOpacity={0.85}
                >
                  <Text style={st.releasedBtnText}>Release something else</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[st.releasedBtnGhost]}
                  onPress={() => { setView('main'); setHasReleased(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[st.releasedBtnGhostText, { color: colors.textSecondary }]}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* ── Writing state ──────────────────── */
            <ScrollView style={{ flex: 1 }} contentContainerStyle={st.releaseWriteContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Ambient glow orb */}
              <Animated.View style={[st.glowOrb, { opacity: glowAnim, backgroundColor: colors.primary + '10' }]} />

              <View style={st.releaseWriteHeader}>
                <Ionicons name="water-outline" size={28} color={colors.primary} />
                <Text style={[st.releaseWriteTitle, { color: colors.textPrimary }]}>Release & Let Go</Text>
                <Text style={[st.releaseWriteSub, { color: colors.textSecondary }]}>
                  Write down what's weighing on you.{'\n'}Then release it — nothing is saved.
                </Text>
              </View>

              <View style={[st.releaseTextArea, { backgroundColor: colors.inputBackground, borderColor: releaseText.length > 0 ? colors.primary + '30' : colors.border }]}>
                <TextInput
                  value={releaseText}
                  onChangeText={setReleaseText}
                  placeholder="What's weighing on you right now?"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  style={[st.releaseInput, { color: colors.textPrimary }]}
                  textAlignVertical="top"
                  autoFocus
                />
              </View>

              {releaseText.length > 0 && (
                <TouchableOpacity
                  style={[st.releaseBtn, { backgroundColor: colors.primary }]}
                  onPress={handleRelease}
                  activeOpacity={0.85}
                >
                  <Ionicons name="water-outline" size={18} color="#fff" />
                  <Text style={st.releaseBtnText}>Let it go</Text>
                </TouchableOpacity>
              )}

              <Text style={[st.releaseNote, { color: colors.textMuted }]}>
                Nothing is saved. This space is completely temporary.
              </Text>
            </ScrollView>
          )}
        </View>
      </GlassBackground>
    );
  }

  // ── Main view ───────────────────────────────────
  return (
    <GlassBackground>
      <ScrollView style={st.container} contentContainerStyle={st.content}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => router.back()} style={st.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={st.title}>Recover & Grounding</Text>
          <Text style={st.subtitle}>Breathe, ground, and release</Text>
        </View>

        {/* Grounding card */}
        <View style={st.section}>
          <GlassCard onPress={() => router.push('/grounding')} borderRadius={Radius.xl}>
            <View style={st.featureCard}>
              <View style={[st.featureIcon, { backgroundColor: colors.accentCalm + '18' }]}>
                <Ionicons name="leaf-outline" size={24} color={colors.accentCalm} />
              </View>
              <Text style={[st.featureTitle, { color: colors.textPrimary }]}>Grounding Exercises</Text>
              <Text style={[st.featureSub, { color: colors.textSecondary }]}>
                Breathing techniques and sensory exercises to bring you back to the present moment.
              </Text>
              <View style={st.featureArrow}>
                <Text style={[st.featureArrowText, { color: colors.primary }]}>Start</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.primary} />
              </View>
            </View>
          </GlassCard>
        </View>

        {/* Release card */}
        <View style={st.section}>
          <GlassCard onPress={() => setView('release')} borderRadius={Radius.xl}>
            <View style={st.featureCard}>
              <View style={[st.featureIcon, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name="water-outline" size={24} color={colors.primary} />
              </View>
              <Text style={[st.featureTitle, { color: colors.textPrimary }]}>Release & Let Go</Text>
              <Text style={[st.featureSub, { color: colors.textSecondary }]}>
                Write down heavy thoughts, watch them dissolve, and feel a little lighter.
              </Text>
              <View style={st.featureArrow}>
                <Text style={[st.featureArrowText, { color: colors.primary }]}>Begin</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.primary} />
              </View>
            </View>
          </GlassCard>
        </View>
      </ScrollView>
    </GlassBackground>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.md, paddingTop: Platform.OS === 'ios' ? 56 : Spacing.lg, paddingBottom: 120 },
  header: { marginBottom: Spacing.xl },
  backBtn: { marginBottom: Spacing.sm },
  title: { fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold, color: colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: Typography.fontSize.sm, color: colors.textSecondary, fontWeight: Typography.fontWeight.medium },
  section: { marginBottom: Spacing.md },

  /* Feature cards on main screen */
  featureCard: { paddingVertical: 4 },
  featureIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  featureTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, marginBottom: 6 },
  featureSub: { fontSize: Typography.fontSize.sm, lineHeight: Typography.fontSize.sm * 1.55, marginBottom: 16 },
  featureArrow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featureArrowText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },

  /* ── Release view ─────────────────────────── */
  releaseRoot: { flex: 1, paddingTop: Platform.OS === 'ios' ? 56 : Spacing.lg },
  releaseBack: { marginLeft: Spacing.md, marginBottom: Spacing.sm, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  releaseCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl },
  releaseFloat: { width: '100%', alignItems: 'center' },
  releaseHint: { fontSize: Typography.fontSize.sm, textAlign: 'center', marginBottom: Spacing.xl, fontWeight: Typography.fontWeight.medium, letterSpacing: 0.2 },
  releaseQuote: { borderRadius: Radius.xl, padding: Spacing.xl, marginBottom: Spacing.xl, width: '100%', maxWidth: 360, borderWidth: 1 },
  releaseQuoteText: { fontSize: Typography.fontSize.lg, lineHeight: Typography.fontSize.lg * 1.6, textAlign: 'center', fontStyle: 'italic' },
  affirmRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xl },
  affirmText: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.medium, fontStyle: 'italic', textAlign: 'center', maxWidth: 280 },
  breatheText: { fontSize: Typography.fontSize.xs, textAlign: 'center' },

  releasingLabel: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.medium, marginTop: Spacing.lg },

  /* Writing state */
  releaseWriteContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing['3xl'] },
  glowOrb: { position: 'absolute', top: -60, right: -40, width: 200, height: 200, borderRadius: 100 },
  releaseWriteHeader: { alignItems: 'center', marginBottom: Spacing.xl, gap: 8 },
  releaseWriteTitle: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold },
  releaseWriteSub: { fontSize: Typography.fontSize.sm, textAlign: 'center', lineHeight: Typography.fontSize.sm * 1.55 },
  releaseTextArea: { borderRadius: Radius.xl, borderWidth: 1.5, padding: Spacing.md, marginBottom: Spacing.lg, minHeight: 160 },
  releaseInput: { fontSize: Typography.fontSize.base, lineHeight: Typography.fontSize.base * 1.65, minHeight: 140 },
  releaseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: Radius.lg },
  releaseBtnText: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: '#fff' },
  releaseNote: { fontSize: Typography.fontSize.xs, textAlign: 'center', marginTop: Spacing.xl },

  /* Post-release */
  releasedIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  releasedTitle: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.sm },
  releasedBody: { fontSize: Typography.fontSize.base, textAlign: 'center', lineHeight: Typography.fontSize.base * 1.6, marginBottom: Spacing.xl },
  releasedActions: { width: '100%', maxWidth: 300, gap: Spacing.sm },
  releasedBtn: { paddingVertical: 14, borderRadius: Radius.lg, alignItems: 'center' },
  releasedBtnText: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: '#fff' },
  releasedBtnGhost: { paddingVertical: 12, alignItems: 'center' },
  releasedBtnGhostText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
});
