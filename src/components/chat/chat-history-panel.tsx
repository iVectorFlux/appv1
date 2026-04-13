import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Typography, Radius, Glass } from '@/constants/design-tokens';
import { getChatSessions, type ChatSession, type ChatMode } from '@/services/chat-storage';

interface ChatHistoryPanelProps {
  visible: boolean;
  onClose: () => void;
  onSelectSession: (date: string) => void;
  userId: string;
  mode: ChatMode;
}

export function ChatHistoryPanel({
  visible,
  onClose,
  onSelectSession,
  userId,
  mode,
}: ChatHistoryPanelProps) {
  const colors = useColors();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !userId) return;
    setLoading(true);
    getChatSessions(userId, mode)
      .then(setSessions)
      .finally(() => setLoading(false));
  }, [visible, userId, mode]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const st = createStyles(colors);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={st.overlay}>
        <TouchableOpacity style={st.overlayTouch} onPress={onClose} activeOpacity={1} />

        <View style={st.panelOuter}>
          {Platform.OS !== 'web' ? (
            <BlurView intensity={Glass.blurHeavy} tint={colors.glassTint as 'light' | 'dark'} style={StyleSheet.absoluteFill} />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: colors.glass,
                  backdropFilter: `blur(${Glass.blurHeavy}px)`,
                  WebkitBackdropFilter: `blur(${Glass.blurHeavy}px)`,
                } as any,
              ]}
            />
          )}

          <View style={st.panel}>
            <View style={st.header}>
              <View style={st.handle} />
              <View style={st.headerRow}>
                <Text style={st.title}>Chat History</Text>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Ionicons name="close-circle" size={28} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {loading ? (
              <View style={st.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : sessions.length === 0 ? (
              <View style={st.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={48} color={colors.textLight} />
                <Text style={st.emptyText}>No conversation history yet</Text>
              </View>
            ) : (
              <ScrollView style={st.list} showsVerticalScrollIndicator={false}>
                {sessions.map((session) => (
                  <TouchableOpacity
                    key={session.date}
                    style={st.sessionCard}
                    onPress={() => {
                      onSelectSession(session.date);
                      onClose();
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={st.sessionHeader}>
                      <Text style={st.sessionDate}>{formatDate(session.date)}</Text>
                      <Text style={st.sessionCount}>
                        {session.messageCount} msg{session.messageCount !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <Text style={st.sessionPreview} numberOfLines={2}>
                      {session.preview}
                    </Text>
                    {session.emotions.length > 0 && (
                      <View style={st.emotionRow}>
                        {session.emotions.map((em) => (
                          <View key={em} style={st.emotionChip}>
                            <Text style={st.emotionChipText}>{em}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    overlayTouch: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.3)',
    },
    panelOuter: {
      maxHeight: '75%',
      borderTopLeftRadius: Radius['2xl'],
      borderTopRightRadius: Radius['2xl'],
      overflow: 'hidden',
    },
    panel: {
      paddingBottom: 40,
    },
    header: {
      alignItems: 'center',
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.md,
      paddingHorizontal: Spacing.lg,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.textLight,
      marginBottom: Spacing.md,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
    },
    title: {
      fontSize: Typography.fontSize.xl,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
    },
    loadingContainer: {
      padding: Spacing['3xl'],
      alignItems: 'center',
    },
    emptyContainer: {
      padding: Spacing['3xl'],
      alignItems: 'center',
      gap: Spacing.md,
    },
    emptyText: {
      fontSize: Typography.fontSize.base,
      color: colors.textMuted,
    },
    list: {
      paddingHorizontal: Spacing.md,
    },
    sessionCard: {
      backgroundColor: colors.surface,
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    sessionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.xs,
    },
    sessionDate: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
    },
    sessionCount: {
      fontSize: Typography.fontSize.xs,
      color: colors.textMuted,
    },
    sessionPreview: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      lineHeight: Typography.fontSize.sm * 1.4,
    },
    emotionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
      marginTop: Spacing.xs,
    },
    emotionChip: {
      backgroundColor: colors.glass,
      borderRadius: Radius.full,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    emotionChipText: {
      fontSize: Typography.fontSize.micro,
      color: colors.textSecondary,
      textTransform: 'capitalize',
    },
  });
