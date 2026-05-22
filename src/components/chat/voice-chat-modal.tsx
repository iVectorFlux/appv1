/**
 * Hands-free voice conversation for Inner Ally / Coach.
 * Opens with a spoken intro, then listens and replies in a loop.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Radius, Typography } from '@/constants/design-tokens';
import type { ChatMode } from '@/services/chat-storage';
import { useVoiceConversation, type VoicePhase } from '@/hooks/use-voice-conversation';

type VoiceChatModalProps = {
  visible: boolean;
  mode: ChatMode;
  modeColor: string;
  modeLabel: string;
  introText: string;
  onClose: () => void;
  onUserTranscript: (text: string) => Promise<string | null>;
};

function phaseLabel(phase: VoicePhase): string {
  switch (phase) {
    case 'intro':
      return 'Starting conversation…';
    case 'listening':
      return 'Listening…';
    case 'transcribing':
      return 'Understanding…';
    case 'thinking':
      return 'Thinking…';
    case 'speaking':
      return 'Speaking…';
    case 'error':
      return 'Something went wrong';
    default:
      return 'Connecting…';
  }
}

export function VoiceChatModal({
  visible,
  mode,
  modeColor,
  modeLabel,
  introText,
  onClose,
  onUserTranscript,
}: VoiceChatModalProps) {
  const colors = useColors();
  const voice = useVoiceConversation({
    mode,
    enabled: visible,
    introText,
    onUserTranscript,
  });

  const handleClose = useCallback(() => {
    void voice.endSession();
    voice.reset();
    onClose();
  }, [onClose, voice]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={handleClose}
    >
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} hitSlop={16} accessibilityLabel="End voice chat">
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Ionicons
              name={mode === 'inner_ally' ? 'heart' : 'briefcase'}
              size={18}
              color={modeColor}
            />
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Voice · {modeLabel}
            </Text>
          </View>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.body}>
          <View
            style={[styles.orbOuter, { borderColor: modeColor + '30' }]}
            accessibilityRole="text"
            accessibilityLabel={phaseLabel(voice.phase)}
          >
            <View style={[styles.orbInner, { backgroundColor: modeColor + '18' }]}>
              <Ionicons
                name={
                  voice.isListening
                    ? 'mic'
                    : voice.phase === 'speaking' || voice.phase === 'intro'
                      ? 'volume-high'
                      : voice.isBusy
                        ? 'ellipsis-horizontal'
                        : 'chatbubbles-outline'
                }
                size={48}
                color={modeColor}
              />
            </View>
          </View>

          <Text style={[styles.phaseText, { color: colors.textPrimary }]}>
            {phaseLabel(voice.phase)}
          </Text>
          {voice.isListening ? (
            <Text style={[styles.detailText, { color: colors.textMuted }]}>
              Just talk — when you pause for a moment, I will reply automatically.
            </Text>
          ) : null}
          {voice.statusDetail ? (
            <Text style={[styles.detailText, { color: colors.textMuted }]}>{voice.statusDetail}</Text>
          ) : null}
          {voice.lastTranscript ? (
            <View style={[styles.transcriptBox, { backgroundColor: colors.surfaceAccent }]}>
              <Text style={[styles.transcriptLabel, { color: colors.textMuted }]}>You said</Text>
              <Text style={[styles.transcriptText, { color: colors.textPrimary }]}>
                {voice.lastTranscript}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          {voice.phase === 'error' ? (
            <TouchableOpacity
              onPress={voice.retrySession}
              style={[styles.retryBtn, { backgroundColor: modeColor }]}
            >
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              Hands-free: speak, pause, listen to the reply, then speak again. Close when you are done.
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 12 : 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    gap: 16,
  },
  orbOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbInner: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseText: {
    fontSize: 20,
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
  },
  detailText: {
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
    lineHeight: 22,
  },
  transcriptBox: {
    marginTop: 8,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    maxWidth: '100%',
    width: '100%',
  },
  transcriptLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transcriptText: {
    fontSize: 15,
    lineHeight: 22,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
  },
  hint: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
