/**
 * New Journal Entry
 *
 * Saves to database with encryption (SQLite on native). No dummy data.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth-store';
import { createJournalEntry } from '@/services/journal-storage';

export default function NewJournalEntryScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuthStore();
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const trimmed = text.trim();
    if (!trimmed || !user?.id || saving) return;
    setSaving(true);
    setError(null);
    try {
      const SAVE_TIMEOUT_MS = 35000;
      const savePromise = createJournalEntry({
        userId: user.id,
        entrySource: 'journal_only',
        emotions: [],
        energyLevel: 1,
        journalTextEncrypted: trimmed,
        encryptionKeyId: undefined,
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Save timed out. Check your connection and try again.')), SAVE_TIMEOUT_MS)
      );
      await Promise.race([savePromise, timeoutPromise]);
      router.replace('/journal');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not save. Try again.';
      setError(message);
      console.error('[Journal new-entry] Save failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (text.trim()) {
      // Could add "Discard?" confirm
    }
    router.replace('/journal');
  };

  const styles = createStyles(colors);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.iconBtn}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New entry</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!text.trim() || saving}
          style={styles.saveBtn}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.saveBtnText, (!text.trim() || saving) && styles.saveBtnDisabled]}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="What's on your mind?"
          placeholderTextColor={colors.textMuted}
          multiline
          style={styles.input}
          textAlignVertical="top"
          autoFocus
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <View style={styles.privacy}>
          <Ionicons name="lock-closed" size={14} color={colors.textSecondary} />
          <Text style={styles.privacyText}>Encrypted and private. We never read what you write.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.md,
      paddingTop: Platform.OS === 'ios' ? Spacing.xl + 8 : Spacing.lg,
      paddingBottom: Spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
    },
    iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: {
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      fontFamily: Typography.fontFamily.heading,
    },
    saveBtn: { minWidth: 56, alignItems: 'flex-end' },
    saveBtnText: { fontSize: Typography.fontSize.base, fontWeight: '600', color: colors.primary },
    saveBtnDisabled: { color: colors.textMuted },
    scroll: { flex: 1 },
    scrollContent: { padding: Spacing.lg, paddingBottom: Spacing['3xl'] },
    input: {
      minHeight: 280,
      fontSize: Typography.fontSize.base,
      color: colors.textPrimary,
      lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base,
      fontFamily: Typography.fontFamily.primary,
      padding: Spacing.lg,
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.borderLight,
      marginBottom: Spacing.md,
    },
    errorText: {
      fontSize: Typography.fontSize.sm,
      color: colors.destructive,
      marginBottom: Spacing.sm,
      fontFamily: Typography.fontFamily.primary,
    },
    privacy: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    privacyText: {
      fontSize: Typography.fontSize.xs,
      color: colors.textSecondary,
      fontFamily: Typography.fontFamily.primary,
    },
  });
