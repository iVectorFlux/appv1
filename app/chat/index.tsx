/**
 * AI Companion Chat
 *
 * Two modes: Inner Ally (wellbeing) and Coach (leadership).
 * Design goals: Claude-level chat polish — clean AI messages, animated typing,
 * per-message fade-in, growing input, minimal chrome.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import {
  useColors,
  Spacing,
  Typography,
  Radius,
} from '@/constants/design-tokens';
import { useAuthStore } from '@/stores/auth-store';
import { saveChatMessage, getChatHistory } from '@/services/chat-storage';
import type { ChatMode } from '@/services/chat-storage';
import { LEARNING_MODULES } from '@/data/learning-content';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestion?: ChatSuggestion | null;
  createdAt: string;
}

interface ChatSuggestion {
  emotions?: string[];
  groundingOptions?: string[];
  learningPathway?: string | null;
  suggestSaveAsReflection?: boolean;
  skillId?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const GROUNDING_LABELS: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  box_breathing:       { label: 'Box Breathing',       icon: 'square-outline' },
  body_scan:           { label: 'Body Scan',            icon: 'body-outline' },
  release:             { label: 'Release Exercise',     icon: 'hand-left-outline' },
  physiological_sigh:  { label: 'Physiological Sigh',  icon: 'leaf-outline' },
  quick_reset:         { label: 'Quick Reset',          icon: 'refresh-outline' },
};

const MODE_CONFIG: Record<ChatMode, {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  intro: string;
  placeholder: string;
}> = {
  inner_ally: {
    label: 'Inner Ally',
    icon: 'heart-outline',
    color: '#C45C5C',
    intro: "Hi, I'm your Inner Ally. Share how you're feeling — I'm here to listen, reflect, and suggest ways to ground yourself.",
    placeholder: "Share how you're feeling…",
  },
  coach: {
    label: 'Coach',
    icon: 'briefcase-outline',
    color: '#4F7942',
    intro: "Hi, I'm your Coach. Ask me anything about leadership, career growth, communication, or professional development.",
    placeholder: 'Ask a coaching question…',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Inline markdown renderer
// Handles: **bold**, *italic*, and \n paragraph breaks.
// ─────────────────────────────────────────────────────────────────────────────

interface TextSegment {
  text: string;
  bold: boolean;
  italic: boolean;
}

function parseInlineMarkdown(raw: string): TextSegment[] {
  const segments: TextSegment[] = [];
  // Regex matches **bold**, *italic* (not preceded by another *)
  const regex = /\*\*(.+?)\*\*|\*(?!\*)(.+?)(?<!\*)\*/gs;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: raw.slice(lastIndex, match.index), bold: false, italic: false });
    }
    if (match[1] !== undefined) {
      segments.push({ text: match[1], bold: true, italic: false });
    } else if (match[2] !== undefined) {
      segments.push({ text: match[2], bold: false, italic: true });
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < raw.length) {
    segments.push({ text: raw.slice(lastIndex), bold: false, italic: false });
  }
  return segments;
}

function MarkdownText({ content, style }: { content: string; style?: object }) {
  // Split on newlines to render paragraph breaks, then inline-parse each block
  const paragraphs = content.split(/\n+/);

  return (
    <View style={{ gap: 6 }}>
      {paragraphs.map((para, pi) => {
        if (!para.trim()) return null;
        const segments = parseInlineMarkdown(para);
        return (
          <Text key={pi} style={style}>
            {segments.map((seg, si) => (
              <Text
                key={si}
                style={{
                  fontWeight: seg.bold ? Typography.fontWeight.bold : Typography.fontWeight.normal,
                  fontStyle: seg.italic ? 'italic' : 'normal',
                }}
              >
                {seg.text}
              </Text>
            ))}
          </Text>
        );
      })}
    </View>
  );
}

function getApiBase(): string {
  const appUrl = Constants.expoConfig?.extra?.appUrl ?? '';
  if (appUrl) return appUrl;
  if (Platform.OS === 'web') return '';
  const host = (Constants.expoConfig as any)?.hostUri ?? 'localhost:8081';
  return `http://${host}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Animated typing indicator (3 bouncing dots)
// ─────────────────────────────────────────────────────────────────────────────

function TypingIndicator({ color }: { color: string }) {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: -5, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.delay(300),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, []);

  return (
    <View style={typingStyles.row}>
      <View style={[typingStyles.avatar, { backgroundColor: color + '20' }]}>
        <View style={[typingStyles.avatarDot, { backgroundColor: color }]} />
      </View>
      <View style={typingStyles.bubble}>
        {dots.map((dot, i) => (
          <Animated.View
            key={i}
            style={[typingStyles.dot, { backgroundColor: color + '80', transform: [{ translateY: dot }] }]}
          />
        ))}
      </View>
    </View>
  );
}

const typingStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, paddingVertical: Spacing.xs },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  avatarDot: { width: 10, height: 10, borderRadius: 5 },
  bubble: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 4 },
  dot: { width: 7, height: 7, borderRadius: 4 },
});

// ─────────────────────────────────────────────────────────────────────────────
// Suggestion cards
// ─────────────────────────────────────────────────────────────────────────────

function EmotionTags({ emotions, colors }: { emotions: string[]; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={sgStyles.emotionRow}>
      {emotions.slice(0, 3).map((e) => (
        <View key={e} style={[sgStyles.emotionTag, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[sgStyles.emotionText, { color: colors.textSecondary }]}>{e}</Text>
        </View>
      ))}
    </View>
  );
}

function GroundingCard({ options, colors, onPress }: {
  options: string[];
  colors: ReturnType<typeof useColors>;
  onPress: (t: string) => void;
}) {
  return (
    <View style={[sgStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[sgStyles.cardLabel, { color: colors.textMuted }]}>Try a grounding technique</Text>
      {options.map((opt) => {
        const cfg = GROUNDING_LABELS[opt] ?? { label: opt, icon: 'leaf-outline' as keyof typeof Ionicons.glyphMap };
        return (
          <TouchableOpacity key={opt} style={sgStyles.actionRow} onPress={() => onPress(opt)} activeOpacity={0.7}>
            <Ionicons name={cfg.icon} size={15} color={colors.primary} />
            <Text style={[sgStyles.actionLabel, { color: colors.textPrimary }]}>{cfg.label}</Text>
            <Ionicons name="chevron-forward" size={13} color={colors.textMuted} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function LearnCard({ pathway, colors, onPress }: {
  pathway: string;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[sgStyles.card, sgStyles.learnCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[sgStyles.learnIcon, { backgroundColor: colors.accentIndigo + '18' }]}>
        <Ionicons name="library-outline" size={14} color={colors.accentIndigo} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[sgStyles.cardLabel, { color: colors.textMuted, marginBottom: 2 }]}>Learning pathway</Text>
        <Text style={[sgStyles.actionLabel, { color: colors.textPrimary }]}>{pathway}</Text>
      </View>
      <Ionicons name="chevron-forward" size={13} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const sgStyles = StyleSheet.create({
  emotionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.xs },
  emotionTag: { borderRadius: Radius.full, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3 },
  emotionText: { fontSize: Typography.fontSize.xs, textTransform: 'capitalize' },
  card: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
  },
  learnCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  learnIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cardLabel: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold, marginBottom: Spacing.xs },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 5 },
  actionLabel: { flex: 1, fontSize: Typography.fontSize.sm },
});

// ─────────────────────────────────────────────────────────────────────────────
// Single message row
// ─────────────────────────────────────────────────────────────────────────────

function MessageRow({
  message,
  modeColor,
  colors,
  onGroundingPress,
  onLearnPress,
}: {
  message: Message;
  modeColor: string;
  colors: ReturnType<typeof useColors>;
  onGroundingPress: (t: string) => void;
  onLearnPress: (skillId?: string | null) => void;
}) {
  const isUser = message.role === 'user';
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 250, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);

  const sg = message.suggestion;
  const hasEmotions = (sg?.emotions?.length ?? 0) > 0;
  const hasGrounding = (sg?.groundingOptions?.length ?? 0) > 0;
  const hasLearn = !!sg?.learningPathway;

  if (isUser) {
    return (
      <Animated.View style={[msgStyles.userRow, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={[msgStyles.userBubble, { backgroundColor: modeColor }]}>
          <Text style={msgStyles.userText}>{message.content}</Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[msgStyles.aiRow, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {/* Avatar */}
      <View style={[msgStyles.avatar, { backgroundColor: modeColor + '18' }]}>
        <View style={[msgStyles.avatarDot, { backgroundColor: modeColor }]} />
      </View>

      <View style={msgStyles.aiContent}>
        {hasEmotions && <EmotionTags emotions={sg!.emotions!} colors={colors} />}
        <MarkdownText content={message.content} style={[msgStyles.aiText, { color: colors.textPrimary }]} />
        {hasGrounding && (
          <GroundingCard options={sg!.groundingOptions!} colors={colors} onPress={onGroundingPress} />
        )}
        {hasLearn && (
          <LearnCard
            pathway={sg!.learningPathway!}
            colors={colors}
            onPress={() => onLearnPress(sg?.skillId)}
          />
        )}
      </View>
    </Animated.View>
  );
}

const msgStyles = StyleSheet.create({
  userRow: {
    alignItems: 'flex-end',
    marginBottom: Spacing.md,
    paddingLeft: 48,
  },
  userBubble: {
    borderRadius: 20,
    borderBottomRightRadius: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    maxWidth: '100%',
  },
  userText: {
    fontSize: Typography.fontSize.base,
    color: '#fff',
    lineHeight: Typography.fontSize.base * 1.5,
  },
  aiRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  avatarDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  aiContent: {
    flex: 1,
  },
  aiText: {
    fontSize: Typography.fontSize.base,
    lineHeight: Typography.fontSize.base * 1.65,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuthStore();

  const [mode, setMode] = useState<ChatMode>('inner_ally');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  const modeColor = MODE_CONFIG[mode].color;

  // ── Load history ────────────────────────────────────────────────────────────
  const loadHistory = useCallback(
    async (selectedMode: ChatMode) => {
      if (!user?.id) return;
      setIsHistoryLoading(true);
      const history = await getChatHistory(user.id, selectedMode, 30);
      if (history.length > 0) {
        setMessages(
          history.map((m) => ({
            id: m.id ?? Math.random().toString(),
            role: m.role,
            content: m.content,
            suggestion: (m.metadata?.suggestion as ChatSuggestion) ?? null,
            createdAt: m.createdAt ?? new Date().toISOString(),
          }))
        );
      } else {
        setMessages([{
          id: 'intro',
          role: 'assistant',
          content: MODE_CONFIG[selectedMode].intro,
          suggestion: null,
          createdAt: new Date().toISOString(),
        }]);
      }
      setIsHistoryLoading(false);
    },
    [user?.id]
  );

  useEffect(() => {
    loadHistory(mode);
  }, [mode, loadHistory]);

  useEffect(() => {
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(timer);
  }, [messages, isLoading]);

  // ── Send ────────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };

    setInputText('');
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    if (user?.id) {
      saveChatMessage({ userId: user.id, mode, role: 'user', content: text });
    }

    const history = messages
      .filter((m) => m.id !== 'intro')
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch(`${getApiBase()}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          messages: [...history, { role: 'user', content: text }],
          userId: user?.id,
        }),
      });

      if (!res.ok) throw new Error('API error');

      const data = (await res.json()) as {
        reply: string;
        emotions?: string[];
        groundingOptions?: string[];
        learningPathway?: string | null;
        suggestSaveAsReflection?: boolean;
        skillId?: string | null;
      };

      const suggestion: ChatSuggestion = {
        emotions: data.emotions,
        groundingOptions: data.groundingOptions,
        learningPathway: data.learningPathway,
        suggestSaveAsReflection: data.suggestSaveAsReflection,
        skillId: data.skillId,
      };

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        suggestion,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (user?.id) {
        saveChatMessage({
          userId: user.id,
          mode,
          role: 'assistant',
          content: data.reply,
          metadata: { suggestion },
        });
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "I'm having trouble connecting right now. Please check your connection and try again.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGroundingPress = (technique: string) => {
    router.push(`/grounding?mode=${encodeURIComponent(technique)}&returnTo=chat`);
  };
  const handleLearnPress = (skillId?: string | null) => {
    if (skillId) {
      router.push(`/future-skills/${skillId}?returnTo=chat`);
      return;
    }
    const first = LEARNING_MODULES[0];
    if (first) {
      router.push(`/learning-detail?id=${encodeURIComponent(first.id)}&returnTo=chat`);
      return;
    }
    router.push('/(tabs)/learn');
  };

  const handleModeSwitch = (newMode: ChatMode) => {
    if (newMode === mode) return;
    setMessages([]);
    setMode(newMode);
  };

  const canSend = inputText.trim().length > 0 && !isLoading;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Mode pills */}
        <View style={[styles.modePills, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {(['inner_ally', 'coach'] as ChatMode[]).map((m) => {
            const active = mode === m;
            return (
              <TouchableOpacity
                key={m}
                onPress={() => handleModeSwitch(m)}
                style={[styles.modePill, active && { backgroundColor: MODE_CONFIG[m].color }]}
                activeOpacity={0.8}
              >
                <Ionicons name={MODE_CONFIG[m].icon} size={13} color={active ? '#fff' : colors.textMuted} />
                <Text style={[styles.modePillText, { color: active ? '#fff' : colors.textMuted }]}>
                  {MODE_CONFIG[m].label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.backBtn} />
      </View>

      {/* ── Messages ───────────────────────────────────────────────────────── */}
      {isHistoryLoading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg) => (
            <MessageRow
              key={msg.id}
              message={msg}
              modeColor={modeColor}
              colors={colors}
              onGroundingPress={handleGroundingPress}
              onLearnPress={handleLearnPress}
            />
          ))}
          {isLoading && <TypingIndicator color={modeColor} />}
        </ScrollView>
      )}

      {/* ── Input bar ──────────────────────────────────────────────────────── */}
      <View style={[styles.inputBar, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <View style={[styles.inputWrap, { backgroundColor: colors.floating, borderColor: canSend ? modeColor + '70' : colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.textPrimary }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder={MODE_CONFIG[mode].placeholder}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={1000}
            returnKeyType="default"
            textAlignVertical="center"
            underlineColorAndroid="transparent"
            selectionColor={modeColor}
            {...(Platform.OS === 'web'
              ? ({
                  // Remove default browser focus ring (blue rectangle)
                  outlineStyle: 'none',
                  outlineWidth: 0,
                } as object)
              : {})}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!canSend}
            style={[styles.sendBtn, { backgroundColor: canSend ? modeColor : colors.surface }]}
            activeOpacity={0.8}
          >
            <Ionicons
              name="arrow-up"
              size={17}
              color={canSend ? '#fff' : colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    ...(Platform.OS === 'web' ? ({ height: '100%', maxHeight: '100vh' } as object) : {}),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : Spacing.lg,
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  backBtn: {
    width: 36,
    alignItems: 'flex-start',
  },
  modePills: {
    flexDirection: 'row',
    borderRadius: Radius.full,
    borderWidth: 1,
    padding: 3,
    gap: 2,
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  modePillText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    flex: 1,
    minHeight: 0,
  },
  messagesContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  inputBar: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 32 : Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 26,
    borderWidth: 1.5,
    paddingLeft: Spacing.md,
    paddingRight: 5,
    paddingTop: 5,
    paddingBottom: 5,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    lineHeight: Typography.fontSize.base * 1.45,
    maxHeight: 140,
    minHeight: 36,
    paddingTop: Platform.OS === 'ios' ? 8 : 4,
    paddingBottom: Platform.OS === 'ios' ? 8 : 4,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
