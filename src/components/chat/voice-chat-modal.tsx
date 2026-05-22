/**
 * Full-screen voice conversation for Inner Ally / Coach.
 * Hold mic to speak; AI replies with Orpheus TTS.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Pressable,
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
  onClose: () => void;
  onUserTranscript: (text: string) => Promise<string | null>;
};

function phaseLabel(phase: VoicePhase): string {
  switch (phase) {
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
      return 'Hold the mic to talk';
  }
}

export function VoiceChatModal({
  visible,
  mode,
  modeColor,
  modeLabel,
  onClose,
  onUserTranscript,
}: VoiceChatModalProps) {
  const colors = useColors();
  const voice = useVoiceConversation({
    mode,
    enabled: visible,
    onUserTranscript,
  });

  const handleMicPressIn = useCallback(() => {
    if (voice.isBusy) return;
    void voice.startListening();
  }, [voice]);

  const handleMicPressOut = useCallback(() => {
    if (!voice.isListening) return;
    void voice.stopListeningAndProcess();
  }, [voice]);

  const handleClose = useCallback(() => {
    void voice.cancelListening();
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
          <TouchableOpacity onPress={handleClose} hitSlop={16} accessibilityLabel="Close voice chat">
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
          <View style={[styles.orbOuter, { borderColor: modeColor + '30' }]}>
            <View style={[styles.orbInner, { backgroundColor: modeColor + '18' }]}>
              <Ionicons
                name={
                  voice.isListening
                    ? 'mic'
                    : voice.phase === 'speaking'
                      ? 'volume-high'
                      : voice.isBusy
                        ? 'ellipsis-horizontal'
                        : 'mic-outline'
                }
                size={48}
                color={modeColor}
              />
            </View>
          </View>

          <Text style={[styles.phaseText, { color: colors.textPrimary }]}>
            {phaseLabel(voice.phase)}
          </Text>
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
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Hold the button while you speak, then release. The assistant will reply aloud.
          </Text>

          <Pressable
            onPressIn={handleMicPressIn}
            onPressOut={handleMicPressOut}
            disabled={voice.isBusy}
            style={({ pressed }) => [
              styles.micBtn,
              {
                backgroundColor: voice.isListening ? modeColor : modeColor + 'CC',
                opacity: voice.isBusy ? 0.45 : pressed ? 0.9 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Hold to speak"
          >
            <Ionicons name="mic" size={32} color="#fff" />
          </Pressable>
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
    gap: 20,
  },
  hint: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  micBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
