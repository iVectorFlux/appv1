/**
 * Assist Tab — Inner Ally + Coach
 *
 * Persistent chat tab. Mode toggle at the top: Inner Ally | Coach.
 * Coach mode shows a link to Skill Lab (/skill-lab).
 * Reads `eq_assist_pendingMode` from AsyncStorage on focus to honour
 * nudge links from the Home screen.
 *
 * Chat messages are persisted to Supabase via chat-storage.ts.
 * AI responses come from /api/chat (Groq).
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useColors,
  Spacing,
  Typography,
  Radius,
} from '@/constants/design-tokens';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { saveChatMessage, getChatHistoryWithTimeout, autoJournalFromChat } from '@/services/chat-storage';
import type { ChatMode } from '@/services/chat-storage';
import { useLearningCatalog } from '@/hooks/useLearningCatalog';
import { staticFallbackDetailId } from '@/services/learning-content-catalog';
import { requestChatCompletion } from '@/utils/vercel-api';

// ─────────────────────────────────────────────────────────────────────────────
// Types & constants
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
  lifeContexts?: string[];
  groundingOptions?: string[];
  learningPathway?: string | null;
  suggestSaveAsReflection?: boolean;
  skillId?: string | null;
  reframe?: string | null;
}

const GROUNDING_LABELS: Record<string, string> = {
  box_breathing: 'Box Breathing',
  body_scan: 'Body Scan',
  release: 'Release Exercise',
  physiological_sigh: 'Physiological Sigh',
  quick_reset: 'Quick Reset',
};

const MODE_CONFIG: Record<ChatMode, {
  label: string;
  icon: string;
  color: string;
  intro: string;
  placeholder: string;
}> = {
  inner_ally: {
    label: 'Inner Ally',
    icon: 'heart-outline',
    color: '#C45C5C',
    intro: "Hi, I'm your Inner Ally. Share how you're feeling — I'm here to listen, reflect, and suggest ways to ground yourself.",
    placeholder: "Share how you're feeling...",
  },
  coach: {
    label: 'Coach',
    icon: 'briefcase-outline',
    color: '#4F7942',
    intro: "Hi, I'm your Coach. Ask me anything about leadership, career growth, communication, or professional development.",
    placeholder: 'Ask a coaching question...',
  },
};

const STORAGE_KEYS = {
  pendingMode: 'eq_assist_pendingMode',
  lastMode: 'eq_chat_lastMode',
  lastTime: 'eq_chat_lastTime',
} as const;

function introMessageForMode(selectedMode: ChatMode): Message {
  return {
    id: 'intro',
    role: 'assistant',
    content: MODE_CONFIG[selectedMode].intro,
    createdAt: new Date().toISOString(),
  };
}


// ─────────────────────────────────────────────────────────────────────────────
// Inline suggestion cards
// ─────────────────────────────────────────────────────────────────────────────

function GroundingCard({
  options,
  colors,
  onPress,
}: {
  options: string[];
  colors: ReturnType<typeof useColors>;
  onPress: (t: string) => void;
}) {
  return (
    <View style={[sgStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[sgStyles.title, { color: colors.textSecondary }]}>Try a grounding technique</Text>
      {options.map((opt) => (
        <TouchableOpacity key={opt} style={sgStyles.row} onPress={() => onPress(opt)}>
          <Ionicons name="leaf-outline" size={14} color={colors.primary} />
          <Text style={[sgStyles.rowText, { color: colors.textPrimary }]}>
            {GROUNDING_LABELS[opt] ?? opt}
          </Text>
          <Ionicons name="chevron-forward" size={13} color={colors.textLight} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ReframeCard({
  text,
  colors,
  modeColor,
}: {
  text: string;
  colors: ReturnType<typeof useColors>;
  modeColor: string;
}) {
  return (
    <View
      style={[
        sgStyles.reframeCard,
        {
          borderColor: modeColor + '4D',
          backgroundColor: modeColor + '12',
        },
      ]}
    >
      <Text style={[sgStyles.reframeLabel, { color: colors.textSecondary }]}>Another way to see it</Text>
      <Text style={[sgStyles.reframeBody, { color: colors.textPrimary }]}>{text}</Text>
    </View>
  );
}

function LearnCard({
  pathway,
  skillId,
  colors,
  onPress,
}: {
  pathway: string;
  skillId?: string | null;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[sgStyles.card, sgStyles.learnCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
    >
      <Ionicons name="library-outline" size={15} color={colors.accentIndigo} />
      <View style={{ flex: 1 }}>
        <Text style={[sgStyles.title, { color: colors.textSecondary }]}>Learning pathway</Text>
        <Text style={[sgStyles.pathway, { color: colors.textPrimary }]}>{pathway}</Text>
      </View>
      <Ionicons name="chevron-forward" size={13} color={colors.textLight} />
    </TouchableOpacity>
  );
}

const sgStyles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
  },
  reframeCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
  },
  reframeLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: 4,
  },
  reframeBody: { fontSize: Typography.fontSize.sm, lineHeight: Typography.fontSize.sm * 1.45 },
  learnCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 4 },
  rowText: { flex: 1, fontSize: Typography.fontSize.sm },
  pathway: { fontSize: Typography.fontSize.sm },
});

// ─────────────────────────────────────────────────────────────────────────────
// Message bubble
// ─────────────────────────────────────────────────────────────────────────────

function MessageBubble({
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
  const reframeText =
    typeof message.suggestion?.reframe === 'string' ? message.suggestion.reframe.trim() : '';
  const hasReframe = !isUser && reframeText.length > 0;
  return (
    <View style={[bStyles.wrap, isUser ? bStyles.wrapUser : bStyles.wrapAssistant]}>
      <View
        style={[
          bStyles.bubble,
          {
            backgroundColor: isUser ? modeColor : colors.floating,
            borderColor: isUser ? 'transparent' : colors.border,
          },
        ]}
      >
        <Text style={[bStyles.text, { color: isUser ? '#fff' : colors.textPrimary }]}>
          {message.content}
        </Text>
      </View>
      {!isUser && message.suggestion && (
        <View style={bStyles.cards}>
          {hasReframe && <ReframeCard text={reframeText} colors={colors} modeColor={modeColor} />}
          {(message.suggestion.groundingOptions?.length ?? 0) > 0 && (
            <GroundingCard options={message.suggestion.groundingOptions!} colors={colors} onPress={onGroundingPress} />
          )}
          {message.suggestion.learningPathway && (
            <LearnCard pathway={message.suggestion.learningPathway} skillId={message.suggestion.skillId} colors={colors} onPress={() => onLearnPress(message.suggestion?.skillId)} />
          )}
        </View>
      )}
    </View>
  );
}

const bStyles = StyleSheet.create({
  wrap: { marginBottom: Spacing.sm, maxWidth: '85%' },
  wrapUser: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  wrapAssistant: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  text: { fontSize: Typography.fontSize.base, lineHeight: Typography.fontSize.base * 1.5 },
  cards: { width: '100%', marginTop: Spacing.xs },
});

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────

export default function AssistScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { firstPersonalRouteId } = useLearningCatalog();

  const [mode, setMode]         = useState<ChatMode>('inner_ally');
  const [messages, setMessages] = useState<Message[]>(() => [introMessageForMode('inner_ally')]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  // ── Load history + check pending mode from home nudge ────────────────────
  const loadForMode = useCallback(async (selectedMode: ChatMode) => {
    setMessages([introMessageForMode(selectedMode)]);
    if (!user?.id) {
      setIsLoadingHistory(false);
      return;
    }
    setIsLoadingHistory(true);
    try {
      const history = await getChatHistoryWithTimeout(user.id, selectedMode, 30);
      if (history.length > 0) {
        setMessages(history.map((m) => ({
          id: m.id ?? Math.random().toString(),
          role: m.role,
          content: m.content,
          suggestion: (m.metadata?.suggestion as ChatSuggestion) ?? null,
          createdAt: m.createdAt ?? new Date().toISOString(),
        })));
      }
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user?.id]);

  // Check for pending mode on mount (set by home screen nudge)
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.pendingMode).then(async (pending) => {
      const resolvedMode: ChatMode = (pending === 'coach' || pending === 'inner_ally') ? pending : 'inner_ally';
      if (pending) await AsyncStorage.removeItem(STORAGE_KEYS.pendingMode);
      setMode(resolvedMode);
      loadForMode(resolvedMode);
    });
  }, [loadForMode]);

  // Reload when mode switches
  const handleModeSwitch = useCallback((newMode: ChatMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    setMessages([introMessageForMode(newMode)]);
    loadForMode(newMode);
  }, [mode, loadForMode]);

  // Scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages]);

  // ── Send ─────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isSending) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };

    setInputText('');
    setMessages((prev) => [...prev, userMsg]);
    setIsSending(true);

    if (user?.id) {
      saveChatMessage({ userId: user.id, mode, role: 'user', content: text });
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.lastMode, mode],
        [STORAGE_KEYS.lastTime, Date.now().toString()],
      ]);
    }

    const history = messages
      .filter((m) => m.id !== 'intro')
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const data = await requestChatCompletion({
        mode,
        messages: [...history, { role: 'user', content: text }],
        userId: user?.id,
      });

      const suggestion: ChatSuggestion = {
        emotions: data.emotions,
        lifeContexts: data.lifeContexts,
        groundingOptions: data.groundingOptions,
        learningPathway: data.learningPathway,
        suggestSaveAsReflection: data.suggestSaveAsReflection,
        skillId: data.skillId,
        reframe: data.reframe ?? null,
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
        // Save assistant turn — capture the row id so the auto-journal can link back
        const savedAssistant = await supabase
          .from('ai_chat_messages')
          .insert({ user_id: user.id, mode, role: 'assistant', content: data.reply, metadata: { suggestion } })
          .select('id')
          .single();
        const assistantMsgId = (savedAssistant.data as { id?: string } | null)?.id;

        // Auto-journal: when Inner Ally detects emotions, silently record the
        // user's message + tagged emotions as a journal entry for analytics.
        if (mode === 'inner_ally') {
          autoJournalFromChat({
            userId: user.id,
            userMessage: text,
            emotions: suggestion.emotions,
            lifeContexts: suggestion.lifeContexts,
            suggestSaveAsReflection: suggestion.suggestSaveAsReflection,
            chatMessageId: assistantMsgId,
          });
        }
      }
    } catch (e) {
      const detail = e instanceof Error ? e.message : 'Something went wrong.';
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I could not reach the assistant just now.\n\n${detail}`,
        createdAt: new Date().toISOString(),
      }]);
    } finally {
      setIsSending(false);
    }
  };

  const modeColor = MODE_CONFIG[mode].color;

  const openGroundingFromAssist = (technique: string) => {
    router.push(`/grounding?mode=${encodeURIComponent(technique)}&returnTo=assist`);
  };

  const openLearnFromAssist = (skillId?: string | null) => {
    if (skillId) {
      router.push(`/skill-lab/${skillId}?returnTo=assist`);
      return;
    }
    const id = firstPersonalRouteId ?? staticFallbackDetailId();
    if (id) {
      router.push(`/learning-detail?id=${encodeURIComponent(id)}&returnTo=assist`);
      return;
    }
    router.push('/(tabs)/learn');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={0}
    >
      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Assist</Text>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/profile')}
          style={[styles.profileBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          hitSlop={8}
        >
          <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* ── Mode toggle ── */}
      <View style={[styles.modeRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {(['inner_ally', 'coach'] as ChatMode[]).map((m) => {
          const active = mode === m;
          return (
            <TouchableOpacity
              key={m}
              onPress={() => handleModeSwitch(m)}
              style={[styles.modeBtn, active && { backgroundColor: MODE_CONFIG[m].color }]}
            >
              <Ionicons name={MODE_CONFIG[m].icon as any} size={14} color={active ? '#fff' : colors.textMuted} />
              <Text style={[styles.modeBtnText, { color: active ? '#fff' : colors.textMuted }]}>
                {MODE_CONFIG[m].label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Coach: Skill Lab banner ── */}
      {mode === 'coach' && (
        <TouchableOpacity
          style={[styles.skillsBanner, { backgroundColor: '#6366F110', borderBottomColor: colors.border }]}
          onPress={() => router.push('/skill-lab')}
        >
          <Ionicons name="rocket-outline" size={15} color="#6366F1" />
          <Text style={styles.skillsBannerText}>Practice in Skill Lab — AI scenarios & feedback</Text>
          <Ionicons name="arrow-forward" size={13} color="#6366F1" />
        </TouchableOpacity>
      )}

      {/* ── Messages (welcome visible immediately; optional row while history loads) ── */}
      <ScrollView
        ref={scrollRef}
        style={styles.scrollMessages}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            modeColor={modeColor}
            colors={colors}
            onGroundingPress={openGroundingFromAssist}
            onLearnPress={openLearnFromAssist}
          />
        ))}
        {isLoadingHistory && (
          <View style={styles.historyLoadingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
        {isSending && (
          <View style={styles.typing}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.typingDot, { backgroundColor: colors.textMuted, opacity: 0.4 + i * 0.2 }]} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Input bar ── */}
      <View
        style={[
          styles.inputBar,
          {
            borderTopColor: colors.border,
            backgroundColor: colors.floating,
            paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? Spacing.md : Spacing.sm),
          },
        ]}
      >
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
          value={inputText}
          onChangeText={setInputText}
          placeholder={MODE_CONFIG[mode].placeholder}
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={1000}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={handleSend}
          underlineColorAndroid="transparent"
          selectionColor={modeColor}
          cursorColor={modeColor}
          {...(Platform.OS === 'web'
            ? ({
                outlineStyle: 'none',
                outlineWidth: 0,
                outlineColor: 'transparent',
                boxShadow: 'none',
                caretColor: colors.textPrimary,
              } as object)
            : {})}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!inputText.trim() || isSending}
          style={[
            styles.sendBtn,
            { backgroundColor: inputText.trim() && !isSending ? modeColor : colors.surface },
          ]}
        >
          <Ionicons name="send" size={16} color={inputText.trim() && !isSending ? '#fff' : colors.textMuted} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...(Platform.OS === 'web' ? ({ height: '100%', maxHeight: '100vh' } as object) : {}),
  },
  scrollMessages: { flex: 1, minHeight: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 52 : Spacing.lg,
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
  },
  profileBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeRow: {
    flexDirection: 'row',
    padding: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: 1,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
  },
  modeBtnText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  skillsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
  },
  skillsBannerText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: '#6366F1',
    fontWeight: Typography.fontWeight.medium,
  },
  historyLoadingRow: { alignItems: 'center', paddingBottom: Spacing.sm },
  messagesList: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  typing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 4,
    paddingVertical: Spacing.sm,
    alignSelf: 'flex-start',
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: Typography.fontSize.base,
    maxHeight: 120,
    minHeight: 44,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
