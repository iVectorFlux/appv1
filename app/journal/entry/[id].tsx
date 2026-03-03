/**
 * Edit Journal Entry
 *
 * Loads from database, decrypts for editing. Save re-encrypts and updates. Delete removes from DB.
 */

import React, { useState, useEffect, useCallback } from 'react';
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
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth-store';
import { getJournalEntry, updateJournalEntry, deleteJournalEntry } from '@/services/journal-storage';

export default function EditJournalEntryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { user } = useAuthStore();
  const [text, setText] = useState('');
  const [originalText, setOriginalText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEntry = useCallback(async () => {
    if (!params.id || !user?.id) {
      setLoading(false);
      return;
    }
    try {
      const entry = await getJournalEntry(params.id);
      if (!entry || entry.userId !== user.id) {
        setError('Entry not found.');
        setLoading(false);
        return;
      }
      setText(entry.journalTextEncrypted ?? '');
      setOriginalText(entry.journalTextEncrypted ?? '');
    } catch (e) {
      setError('Could not load entry.');
    } finally {
      setLoading(false);
    }
  }, [params.id, user?.id]);

  useEffect(() => {
    loadEntry();
  }, [loadEntry]);

  const hasChanges = text !== originalText;

  const handleSave = async () => {
    if (!params.id || !user?.id || !text.trim() || !hasChanges || saving) return;
    setSaving(true);
    try {
      await updateJournalEntry(params.id, {
        journalTextEncrypted: text.trim(),
        updatedAt: Date.now(),
      });
      setOriginalText(text.trim());
      router.back();
    } catch {
      setError('Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete entry',
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!params.id) return;
            try {
              await deleteJournalEntry(params.id);
              router.back();
            } catch {
              setError('Could not delete.');
            }
          },
        },
      ]
    );
  };

  const styles = createStyles(colors);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.muted}>Loading…</Text>
        </View>
      </View>
    );
  }

  if (error && !text) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Text style={styles.muted}>{error}</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit entry</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
            <Ionicons name="trash-outline" size={22} color={colors.destructive} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            disabled={!hasChanges || !text.trim() || saving}
            style={styles.saveBtn}
          >
            <Text style={[styles.saveBtnText, (!hasChanges || !text.trim() || saving) && styles.saveBtnDisabled]}>
              {saving ? 'Saving…' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
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
        />
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
      paddingHorizontal: Spacing.md,
      paddingTop: Platform.OS === 'ios' ? Spacing.xl + 8 : Spacing.lg,
      paddingBottom: Spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
    },
    iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: {
      flex: 1,
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      fontFamily: Typography.fontFamily.heading,
      textAlign: 'center',
    },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    saveBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
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
      marginBottom: Spacing.lg,
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
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
    muted: { fontSize: Typography.fontSize.sm, color: colors.textSecondary },
  });
