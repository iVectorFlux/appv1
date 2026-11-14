/**
 * AI Companion Chat
 *
 * Two modes: Inner Ally (wellbeing) and Coach (growth).
 * Minimal design inspired by Claude iOS - AI messages as plain text,
 * refined input pill, no chrome.
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
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  useColors,
  Spacing,
  Typography,
  Radius,
} from '@/constants/design-tokens';
import { useAuthStore } from '@/stores/auth-store';
import {
  saveChatMessage,
  getChatHistoryWithTimeout,
  getChatSessionMessages,
  persistAssistantTurnAfterReply,
  clearLocalChatHistory,
} from '@/services/chat-storage';
import type { ChatMode } from '@/services/chat-storage';
import { refreshInnerAllyMemory, requestChatCompletion } from '@/utils/vercel-api';
import { breathToneParamFromEmotions } from '@/data/breathing-techniques';
import { ChatHistoryPanel } from '@/components/chat/chat-history-panel';

interface ChatScreenProps {
  asTab?: boolean;
  /** When true (tab bar hidden on Companion), show Home in header and use safe-area-only bottom inset */
  hideBottomTabBar?: boolean;
  /** Companion tab: fresh Inner Ally thread each visit; long-term memory still applies server-side. */
  resetInnerAllySessionOnFocus?: boolean;
}

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

const GROUNDING_LABELS: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  breath_regulation_flow: { label: 'Calm breath sequence', icon: 'fitness-outline' },
  breath_coherent: { label: 'Coherent breathing', icon: 'pulse-outline' },
  breath_extended_exhale: { label: 'Extended exhale', icon: 'flame-outline' },
  box_breathing:      { label: 'Box breathing', icon: 'square-outline' },
  body_scan:          { label: 'Body Scan',           icon: 'body-outline' },
  release:            { label: 'Release Exercise',    icon: 'hand-left-outline' },
  physiological_sigh: { label: 'Physiological Sigh', icon: 'leaf-outline' },
  quick_reset:        { label: 'Physiological sigh', icon: 'refresh-outline' },
};

interface ModeConfig {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  intro: (name?: string) => string;
  placeholder: string;
  suggestions: string[];
}

const MODE_CONFIG: Record<ChatMode, ModeConfig> = {
  inner_ally: {
    label: 'Inner Ally',
    icon: 'heart-outline',
    color: '#C45C5C',
    intro: (name) => name
      ? `Hey ${name}, I'm here for you. Share how you're feeling. I'll listen, reflect, and help you ground yourself.`
      : "Hey, I'm here for you. Share how you're feeling. I'll listen, reflect, and help you ground yourself.",
    placeholder: "What's on your mind?",
    suggestions: [
      'I am having bad day',
      'Help me calm down',
      'I have pre-meeting anxiety',
    ],
  },
  coach: {
    label: 'Coach',
    icon: 'briefcase-outline',
    color: '#2563EB',
    intro: (name) => name
      ? `Hey ${name}, ready when you are. Ask about leadership, work skills, or growth, and learn something new step by step right here.`
      : "Ready when you are. Ask about leadership, work skills, or growth, and learn something new step by step right here.",
    placeholder: 'Ask me anything...',
    suggestions: [
      'How to regulate emotion at workplace',
      'How to grow as a leader',
      'Help me solve a problem',
    ],
  },
};

// ── Inline markdown ─────────────────────────────────────────────────────

interface TextSegment { text: string; bold: boolean; italic: boolean; }

function parseInlineMarkdown(raw: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const regex = /\*\*(.+?)\*\*|\*(?!\*)(.+?)(?<!\*)\*/gs;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex)
      segments.push({ text: raw.slice(lastIndex, match.index), bold: false, italic: false });
    if (match[1] !== undefined) segments.push({ text: match[1], bold: true, italic: false });
    else if (match[2] !== undefined) segments.push({ text: match[2], bold: false, italic: true });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < raw.length)
    segments.push({ text: raw.slice(lastIndex), bold: false, italic: false });
  return segments;
}

/** Inserts paragraph breaks before likely user-facing questions so they don’t run into prior sentences. */
function formatAssistantDisplayText(raw: string): string {
  let t = raw.trim();
  t = t.replace(
    /([.!?])\s+((?:What|How|Why|When|Where|Who|Which)\s+[^.?\n]*\?)/g,
    '$1\n\n$2'
  );
  t = t.replace(
    /([.!?])\s+((?:Can you|Could you|Would you|Should you|Is there|Are you|Do you|Does that|Have you)\b[^.?\n]*\?)/gi,
    '$1\n\n$2'
  );
  return t;
}

function MarkdownText({ content, style }: { content: string; style?: object }) {
  const paragraphs = content.split(/\n+/);
  return (
    <View style={{ gap: 8 }}>
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

// ── Typing indicator ────────────────────────────────────────────────────

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
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: Spacing.sm, paddingLeft: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});

// ── Suggestion chips (inline, minimal) ──────────────────────────────────

function EmotionTags({ emotions, colors }: { emotions: string[]; colors: ReturnType<typeof useColors> }) {
  const isDark = colors.glassTint === 'dark';
  return (
    <View style={sgStyles.emotionRow}>
      {emotions.slice(0, 3).map((e, i) => (
        <View
          key={`${e}-${i}`}
          style={[
            sgStyles.emotionTag,
            {
              backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(37,99,235,0.08)',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(59,130,246,0.28)' : 'rgba(37,99,235,0.18)',
            },
          ]}
        >
          <View style={[sgStyles.emotionDot, { backgroundColor: colors.primary }]} />
          <Text style={[sgStyles.emotionText, { color: colors.primary }]}>{e}</Text>
        </View>
      ))}
    </View>
  );
}

function ReframeCard({ text, colors, modeColor }: { text: string; colors: ReturnType<typeof useColors>; modeColor: string }) {
  const isDark = colors.glassTint === 'dark';
  return (
    <View style={[sgStyles.reframeCard, { backgroundColor: isDark ? modeColor + '15' : modeColor + '0C', borderWidth: 1, borderColor: isDark ? modeColor + '25' : modeColor + '18', borderRadius: 14 }]}>
      <View style={sgStyles.reframeLabelRow}>
        <Ionicons name="bulb-outline" size={12} color={modeColor} />
        <Text style={[sgStyles.reframeLabel, { color: modeColor }]}>Another perspective</Text>
      </View>
      <Text style={[sgStyles.reframeBody, { color: colors.textPrimary }]}>{text}</Text>
    </View>
  );
}

function GroundingCard({
  options,
  colors,
  sourceEmotions,
  onPress,
}: {
  options: string[];
  colors: ReturnType<typeof useColors>;
  sourceEmotions?: string[];
  onPress: (t: string, emotions?: string[]) => void;
}) {
  return (
    <View style={sgStyles.groundingWrap}>
      <View style={sgStyles.actionsWrap}>
        {options.map((opt) => {
          const cfg = GROUNDING_LABELS[opt] ?? { label: opt, icon: 'leaf-outline' as keyof typeof Ionicons.glyphMap };
          return (
            <TouchableOpacity
              key={opt}
              style={[
                sgStyles.actionChip,
                {
                  backgroundColor: colors.glassTint === 'dark'
                    ? 'rgba(59,130,246,0.14)'
                    : 'rgba(37,99,235,0.08)',
                  borderColor: colors.primary + '38',
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                },
              ]}
              onPress={() => onPress(opt, sourceEmotions)}
              activeOpacity={0.75}
            >
              <View style={[sgStyles.chipIcon, { backgroundColor: colors.primary + '22' }]}>
                <Ionicons name={cfg.icon} size={14} color={colors.primary} />
              </View>
              <Text style={[sgStyles.actionChipText, { color: colors.primary }]}>
                Try breathing · {cfg.label}
              </Text>
              <Ionicons name="arrow-forward" size={14} color={colors.primary} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function LearnCard({ pathway, colors, onPress }: { pathway: string; colors: ReturnType<typeof useColors>; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[
        sgStyles.actionChip,
        sgStyles.learnChip,
        {
          backgroundColor: colors.glassTint === 'dark'
            ? 'rgba(255,255,255,0.10)'
            : 'rgba(255,255,255,0.65)',
          borderColor: colors.glassTint === 'dark'
            ? 'rgba(255,255,255,0.16)'
            : 'rgba(0,0,0,0.08)',
        },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[sgStyles.chipIcon, { backgroundColor: colors.accentIndigo + '14' }]}>
        <Ionicons name="library-outline" size={13} color={colors.accentIndigo} />
      </View>
      <Text style={[sgStyles.actionChipText, { color: colors.textPrimary, flex: 1 }]} numberOfLines={1}>{pathway}</Text>
      <Ionicons name="chevron-forward" size={12} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const sgStyles = StyleSheet.create({
  emotionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  emotionTag: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 5 },
  emotionDot: { width: 5, height: 5, borderRadius: 3 },
  emotionText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize', letterSpacing: 0.3 },
  reframeCard: { borderRadius: 14, padding: 14, marginTop: 14 },
  reframeLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  reframeLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  reframeBody: { fontSize: Typography.fontSize.sm, lineHeight: Typography.fontSize.sm * 1.55 },
  groundingWrap: { marginTop: 14 },
  groundingLabel: { fontSize: 11, fontWeight: '600', marginBottom: 8, letterSpacing: 0.3 },
  actionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 22, borderWidth: 1 },
  chipIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  actionChipText: { fontSize: 13, fontWeight: '500' },
  learnChip: { marginTop: 14 },
});

// ── Message row ─────────────────────────────────────────────────────────

function MessageRow({
  message, modeColor, colors, isIntro, chatMode, onGroundingPress, onLearnPress,
}: {
  message: Message;
  modeColor: string;
  colors: ReturnType<typeof useColors>;
  isIntro?: boolean;
  chatMode: ChatMode;
  onGroundingPress: (t: string, emotions?: string[]) => void;
  onLearnPress: (skillId?: string | null) => void;
}) {
  const isUser = message.role === 'user';
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const sg = message.suggestion;

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
      {isIntro && (
        <View style={[msgStyles.aiAvatar, { backgroundColor: modeColor + '14' }]}>
          <Ionicons name="sparkles" size={14} color={modeColor} />
        </View>
      )}
      <View style={msgStyles.aiContent}>
        {(sg?.emotions?.length ?? 0) > 0 && <EmotionTags emotions={sg!.emotions!} colors={colors} />}
        <MarkdownText
          content={formatAssistantDisplayText(message.content)}
          style={[
            msgStyles.aiText,
            chatMode === 'inner_ally' && msgStyles.aiTextInnerAlly,
            { color: colors.textPrimary },
          ]}
        />
        {typeof sg?.reframe === 'string' && sg.reframe.trim().length > 0 && (
          <ReframeCard text={sg.reframe.trim()} colors={colors} modeColor={modeColor} />
        )}
        {(sg?.groundingOptions?.length ?? 0) > 0 && (
          <GroundingCard
            options={sg!.groundingOptions!}
            colors={colors}
            sourceEmotions={sg?.emotions}
            onPress={onGroundingPress}
          />
        )}
        {sg?.learningPathway && (
          <LearnCard pathway={sg.learningPathway} colors={colors} onPress={() => onLearnPress(sg?.skillId)} />
        )}
      </View>
    </Animated.View>
  );
}

const msgStyles = StyleSheet.create({
  userRow: {
    alignItems: 'flex-end',
    marginBottom: 20,
    paddingLeft: 56,
  },
  userBubble: {
    borderRadius: 22,
    borderBottomRightRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: '100%',
  },
  userText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 23,
  },
  aiRow: {
    marginBottom: 24,
    paddingRight: 32,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  aiContent: {
    flex: 1,
  },
  aiText: {
    fontSize: 15.5,
    lineHeight: 24,
    letterSpacing: 0.1,
  },
  aiTextInnerAlly: {
    fontSize: 17,
    lineHeight: 26,
  },
});

// ── Main screen ─────────────────────────────────────────────────────────

function introMessageForMode(selectedMode: ChatMode, name?: string): Message {
  return {
    id: 'intro',
    role: 'assistant',
    content: MODE_CONFIG[selectedMode].intro(name),
    suggestion: null,
    createdAt: new Date().toISOString(),
  };
}

export default function ChatScreen({
  asTab,
  hideBottomTabBar,
  resetInnerAllySessionOnFocus,
}: ChatScreenProps = {}) {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const firstName = (user?.displayName?.trim() || user?.username || '').split(' ')[0];
  const displayName = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : undefined;

  const [mode, setMode] = useState<ChatMode>('inner_ally');
  const [messages, setMessages] = useState<Message[]>(() => [introMessageForMode('inner_ally', undefined)]);
  const [inputText, setInputText] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const sendScale = useRef(new Animated.Value(1)).current;
  const modeColor = MODE_CONFIG[mode].color;

  const loadHistory = useCallback(
    async (selectedMode: ChatMode) => {
      setMessages([introMessageForMode(selectedMode, displayName)]);
      if (resetInnerAllySessionOnFocus && selectedMode === 'inner_ally') {
        if (user?.id) await clearLocalChatHistory(user.id, 'inner_ally');
        return;
      }
      if (!user?.id) return;
      try {
        const history = await getChatHistoryWithTimeout(user.id, selectedMode, 30);
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
        }
      } catch {
        /* non-fatal: keep intro */
      }
    },
    [user?.id, displayName, resetInnerAllySessionOnFocus]
  );

  useEffect(() => {
    loadHistory(mode);
  }, [mode, loadHistory]);

  useFocusEffect(
    useCallback(() => {
      if (!resetInnerAllySessionOnFocus || mode !== 'inner_ally') return;
      if (user?.id) void clearLocalChatHistory(user.id, 'inner_ally');
      setMessages([introMessageForMode('inner_ally', displayName)]);
    }, [resetInnerAllySessionOnFocus, mode, user?.id, displayName])
  );

  useEffect(() => {
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(timer);
  }, [messages, isLoading]);

  const handleSelectSession = async (date: string) => {
    if (!user?.id) return;
    try {
      const sessionMsgs = await getChatSessionMessages(user.id, mode, date);
      if (sessionMsgs.length > 0) {
        setMessages(
          sessionMsgs.map((m) => ({
            id: m.id ?? Math.random().toString(),
            role: m.role,
            content: m.content,
            suggestion: (m.metadata?.suggestion as ChatSuggestion) ?? null,
            createdAt: m.createdAt ?? new Date().toISOString(),
          }))
        );
      }
    } catch {
      // keep current messages on error
    }
  };

  const sendText = async (rawText: string) => {
    const text = rawText.trim();
    if (!text || isLoading) return;

    Animated.sequence([
      Animated.timing(sendScale, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.spring(sendScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }),
    ]).start();

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
      saveChatMessage({
        userId: user.id,
        mode,
        role: 'user',
        content: text,
        id: userMsg.id,
        createdAt: userMsg.createdAt,
      });
    }

    const history = messages
      .filter((m) => m.id !== 'intro')
      .map((m) => ({ role: m.role, content: m.content }));

    const priorUserTurns = messages.filter((m) => m.role === 'user' && m.id !== 'intro').length;
    const isNewSession = mode === 'inner_ally' && priorUserTurns === 0;

    try {
      const data = await requestChatCompletion({
        mode,
        messages: [...history, { role: 'user', content: text }],
        userId: user?.id,
        isNewSession,
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
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        role: 'assistant',
        content: data.reply,
        suggestion,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setIsLoading(false);

      if (user?.id) {
        try {
          await persistAssistantTurnAfterReply({
            userId: user.id,
            mode,
            reply: data.reply,
            suggestion: { ...suggestion } as Record<string, unknown>,
            userMessageForJournal: text,
            assistantMessageId: assistantMsg.id,
            createdAt: assistantMsg.createdAt,
          });
          if (mode === 'inner_ally') {
            void refreshInnerAllyMemory({
              userId: user.id,
              userMessage: text,
              assistantReply: data.reply,
              emotions: suggestion.emotions,
              lifeContexts: suggestion.lifeContexts,
              markFollowUpsNudged: isNewSession,
            });
          }
        } catch (persistErr) {
          console.error('[Chat] Failed to persist assistant turn:', persistErr);
        }
      }
    } catch (e) {
      const detail = e instanceof Error ? e.message : 'Something went wrong.';
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `I could not reach the assistant just now.\n\n${detail}`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGroundingPress = (technique: string, emotions?: string[]) => {
    const tone = breathToneParamFromEmotions(emotions);
    const toneQs = tone ? `&tone=${encodeURIComponent(tone)}` : '';
    router.push(`/grounding?mode=${encodeURIComponent(technique)}&returnTo=chat${toneQs}`);
  };

  const handleLearnPress = () => {
    router.push('/(tabs)/learn');
  };

  const handleModeSwitch = (newMode: ChatMode) => {
    if (newMode === mode) return;
    setMode(newMode);
  };

  const canSend = inputText.trim().length > 0 && !isLoading;
  const showSuggestions = messages.length === 1 && messages[0].id === 'intro' && !isLoading;
  const topInset = Platform.OS === 'ios' ? insets.top : Spacing.md;
  const st = createChatStyles(colors);

  const handleSend = () => {
    void sendText(inputText);
  };

  const handleSuggestionPress = (text: string) => {
    void sendText(text);
  };

  return (
    <KeyboardAvoidingView
      style={[st.root, { backgroundColor: 'transparent' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* ── Header ────────────────────────────────── */}
      <View style={[st.header, { paddingTop: topInset }]}>
        <View style={st.headerRow}>
          {!asTab ? (
            <TouchableOpacity
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              style={st.headerSideBtn}
            >
              <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          ) : hideBottomTabBar ? (
            <TouchableOpacity
              onPress={() => router.replace('/(tabs)/home')}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              style={st.headerSideBtn}
              accessibilityRole="button"
              accessibilityLabel="Home"
            >
              <Ionicons name="home-outline" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          ) : (
            <View style={st.headerSideBtn} />
          )}

          <View style={st.modeSwitch}>
            {(['inner_ally', 'coach'] as ChatMode[]).map((m) => {
              const active = mode === m;
              return (
                <TouchableOpacity
                  key={m}
                  onPress={() => handleModeSwitch(m)}
                  style={[st.modeTab, active && [st.modeTabActive, { borderBottomColor: MODE_CONFIG[m].color }]]}
                  activeOpacity={0.7}
                >
                  <Text style={[st.modeTabText, { color: active ? colors.textPrimary : colors.textMuted }]}>
                    {MODE_CONFIG[m].label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={() => setHistoryVisible(true)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={st.headerSideBtn}
          >
            <Ionicons name="time-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Messages ──────────────────────────────── */}
      <ScrollView
        ref={scrollRef}
        style={st.messages}
        contentContainerStyle={st.messagesInner}
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
            isIntro={msg.id === 'intro'}
            chatMode={mode}
            onGroundingPress={handleGroundingPress}
            onLearnPress={handleLearnPress}
          />
        ))}
        {isLoading && <TypingIndicator color={modeColor} />}
      </ScrollView>

      {/* ── Input bar ─────────────────────────────── */}
      <View style={st.inputOuter}>
          <View
            style={[
              st.inputRow,
              {
                paddingBottom:
                  asTab && !hideBottomTabBar
                    ? Math.max(insets.bottom, 12) + 72
                    : Math.max(insets.bottom, Platform.OS === 'ios' ? 16 : 12),
              },
            ]}
          >
          {/* Quick suggestions */}
          {showSuggestions && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.suggestionsRow} style={st.suggestionsScroll}>
              {MODE_CONFIG[mode].suggestions.map((s, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => handleSuggestionPress(s)}
                  style={[
                    st.suggestionChip,
                    {
                      borderColor: modeColor + '35',
                      backgroundColor: colors.glassTint === 'dark'
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(255,255,255,0.50)',
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={st.suggestionChipTextCol}>
                    {s.split('\n').map((line, li) => (
                      <Text
                        key={li}
                        style={[st.suggestionText, { color: colors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {line}
                      </Text>
                    ))}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          <View
            style={[
              st.inputPill,
              {
                backgroundColor: colors.glassTint === 'dark'
                  ? 'rgba(255,255,255,0.10)'
                  : 'rgba(255,255,255,0.60)',
                borderColor: canSend ? modeColor + '40' : (colors.glassTint === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.08)'),
              },
            ]}
          >
            {/* Centered placeholder overlay - iOS multiline can't center text natively */}
            {inputText.length === 0 && !inputFocused && (
              <View pointerEvents="none" style={st.placeholderWrap}>
                <Text style={[st.placeholderText, { color: colors.textMuted }]}>{MODE_CONFIG[mode].placeholder}</Text>
              </View>
            )}
            <TextInput
              style={[st.textInput, { color: colors.textPrimary }, Platform.OS === 'android' && st.textInputAndroid]}
              value={inputText}
              onChangeText={setInputText}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder=""
              multiline
              maxLength={1000}
              returnKeyType="default"
              textAlignVertical="center"
              underlineColorAndroid="transparent"
              selectionColor={modeColor}
              cursorColor={modeColor}
              selectTextOnFocus={false}
              {...(Platform.OS === 'web' ? ({
                outlineStyle: 'none',
                outlineWidth: 0,
                outlineColor: 'transparent',
                boxShadow: 'none',
                caretColor: modeColor,
                resize: 'none',
              } as object) : {})}
            />
            <Animated.View style={[st.sendWrap, { transform: [{ scale: sendScale }], opacity: canSend ? 1 : 0.5 }]}>
              <TouchableOpacity
                onPress={handleSend}
                disabled={!canSend}
                style={[st.sendBtn, { backgroundColor: canSend ? modeColor : colors.surfaceAccent }]}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-up" size={18} color={canSend ? '#fff' : colors.textMuted} />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </View>

      {/* ── History panel ─────────────────────────── */}
      {user?.id && (
        <ChatHistoryPanel
          visible={historyVisible}
          onClose={() => setHistoryVisible(false)}
          onSelectSession={handleSelectSession}
          userId={user.id}
          mode={mode}
        />
      )}

    </KeyboardAvoidingView>
  );
}

const createChatStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    root: {
      flex: 1,
      ...(Platform.OS === 'web' ? ({ height: '100%', maxHeight: '100vh' } as object) : {}),
    },

    /* Header */
    header: {
      zIndex: 10,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.sm,
      paddingBottom: 8,
    },
    headerSideBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modeSwitch: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 4,
    },
    modeTab: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    modeTabActive: {
      borderBottomWidth: 2,
    },
    modeTabText: {
      fontSize: 15,
      fontWeight: '600',
      letterSpacing: 0.2,
    },

    /* Messages */
    messages: { flex: 1, minHeight: 0 },
    messagesInner: {
      paddingHorizontal: Spacing.md,
      paddingTop: 20,
      paddingBottom: Spacing.md,
    },

    /* Input */
    inputOuter: {},
    inputRow: {
      paddingHorizontal: 12,
      paddingTop: 10,
    },
    suggestionsScroll: {
      flexGrow: 0,
      marginBottom: 10,
      marginHorizontal: -4,
    },
    suggestionsRow: {
      paddingHorizontal: 4,
      gap: 8,
    },
    suggestionChip: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 18,
      borderWidth: 1,
    },
    suggestionChipTextCol: {
      gap: 2,
    },
    suggestionText: {
      fontSize: 13,
      fontWeight: '500',
    },
    inputPill: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 22,
      borderWidth: 1,
      paddingLeft: 16,
      paddingRight: 4,
      paddingVertical: 4,
      gap: 6,
      minHeight: 44,
    },
    placeholderWrap: {
      position: 'absolute',
      left: 16,
      right: 46,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
    },
    placeholderText: {
      fontSize: 16,
    },
    textInput: {
      flex: 1,
      fontSize: 16,
      lineHeight: 22,
      maxHeight: 140,
      borderWidth: 0,
      backgroundColor: 'transparent',
      paddingTop: Platform.OS === 'ios' ? 10 : 8,
      paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    },
    textInputAndroid: {
      includeFontPadding: false,
      textAlignVertical: 'center',
      paddingTop: 0,
      paddingBottom: 0,
    },
    sendWrap: {
      flexShrink: 0,
    },
    sendBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
