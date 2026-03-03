/**
 * Journal History
 *
 * Loads entries from the database. Decrypts text for display.
 * Each card shows date, emotions, decrypted preview, and edit/delete actions.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useColors, Spacing, Typography, Radius, Shadows } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth-store';
import { getJournalEntries, deleteJournalEntry } from '@/services/journal-storage';
import type { JournalEntry, EmotionTag } from '@/types';

type ListEntry = {
  id: string;
  createdAt: number;
  preview: string;
  emotions: EmotionTag[];
  entrySource: JournalEntry['entrySource'];
};

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

const PREVIEW_LENGTH = 180;

export default function JournalHistoryScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuthStore();
  const [entries, setEntries] = useState<ListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const loadFromDb = useCallback(async () => {
    if (!user?.id) {
      setEntries([]);
      setLoadError(null);
      setLoading(false);
      return;
    }
    setLoadError(null);
    try {
      const rows = await getJournalEntries(user.id, 100);
      const decrypted: ListEntry[] = [];
      for (const row of rows) {
        const raw = (row.journalTextEncrypted ?? '').trim();
        const preview = raw ? (raw.slice(0, PREVIEW_LENGTH) + (raw.length > PREVIEW_LENGTH ? '…' : '')) : 'No text';
        decrypted.push({
          id: row.id,
          createdAt: row.createdAt,
          preview: preview || 'No text',
          emotions: (row.emotions ?? []) as EmotionTag[],
          entrySource: row.entrySource,
        });
      }
      setEntries(decrypted);
    } catch (e) {
      console.error('[Journal history] Load failed:', e);
      setEntries([]);
      const message = e instanceof Error ? e.message : 'Could not load entries.';
      setLoadError(message.length > 80 ? message.slice(0, 80) + '…' : message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadFromDb();
    }, [loadFromDb])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadFromDb();
  };

  const confirmDelete = (entryId: string) => {
    if (Platform.OS === 'web') {
      // Web doesn't support Alert.alert — use modal instead
      setDeleteTarget(entryId);
    } else {
      Alert.alert('Delete entry', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => performDelete(entryId),
        },
      ]);
    }
  };

  const performDelete = async (entryId: string) => {
    setDeleteTarget(null);
    try {
      await deleteJournalEntry(entryId);
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
    } catch (e) {
      console.error('[Journal history] Delete failed:', e);
    }
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Journal history</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.mutedText}>Loading entries…</Text>
        </View>
      ) : loadError ? (
        <ScrollView
          contentContainerStyle={styles.centered}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          <Ionicons name="warning-outline" size={48} color={colors.textMuted} style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>Couldn't load entries</Text>
          <Text style={styles.mutedText}>{loadError}</Text>
          <Text style={[styles.mutedText, { marginTop: Spacing.sm, fontSize: 12 }]}>
            On web, check .env has EXPO_PUBLIC_SUPABASE_URL and KEY, then restart (expo start --web).
          </Text>
          <TouchableOpacity onPress={onRefresh} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Try again</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : entries.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="journal-outline" size={48} color={colors.textMuted} style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>No entries yet</Text>
          <Text style={styles.mutedText}>New entries you write will appear here.</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {entries.map((entry) => (
            <View key={entry.id} style={styles.card}>
              {/* Top row: date + actions */}
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardDate}>{formatDate(entry.createdAt)}</Text>
                  <Text style={styles.cardTime}>{formatTime(entry.createdAt)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => router.push(`/journal/entry/${entry.id}`)}
                  hitSlop={8}
                >
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => confirmDelete(entry.id)}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                </TouchableOpacity>
              </View>

              {/* Emotions */}
              {entry.emotions.length > 0 && (
                <View style={styles.emotionsRow}>
                  {entry.emotions.map((emotion) => (
                    <View key={emotion} style={styles.emotionBadge}>
                      <Text style={styles.emotionBadgeText}>{emotion}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Decrypted preview */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push(`/journal/entry/${entry.id}`)}
              >
                <Text style={styles.cardPreview}>{entry.preview}</Text>
              </TouchableOpacity>

              {/* Source badge */}
              {entry.entrySource === 'reflect' && (
                <View style={styles.sourceBadge}>
                  <Ionicons name="journal-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.sourceBadgeText}>From reflect</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Web-compatible delete confirmation modal */}
      {deleteTarget && (
        <Modal transparent animationType="fade" visible>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Delete entry</Text>
              <Text style={styles.modalBody}>This cannot be undone.</Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setDeleteTarget(null)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalDeleteBtn}
                  onPress={() => performDelete(deleteTarget)}
                >
                  <Text style={styles.modalDeleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingTop: Platform.OS === 'ios' ? Spacing.xl + 8 : Spacing.lg,
      paddingBottom: Spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: {
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      fontFamily: Typography.fontFamily.heading,
    },
    scroll: { flex: 1 },
    scrollContent: { padding: Spacing.lg, paddingBottom: Spacing['3xl'] },

    /* ── Entry card ─────────────────────────────────── */
    card: {
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    cardTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: Spacing.sm,
    },
    cardDate: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      fontFamily: Typography.fontFamily.primary,
    },
    cardTime: {
      fontSize: Typography.fontSize.xs,
      color: colors.textMuted,
      fontFamily: Typography.fontFamily.primary,
      marginTop: 1,
    },
    actionBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.sm,
      marginLeft: Spacing.xs,
    },
    cardPreview: {
      fontSize: Typography.fontSize.base,
      color: colors.textPrimary,
      lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base,
      fontFamily: Typography.fontFamily.primary,
    },

    /* ── Emotions ────────────────────────────────────── */
    emotionsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
      marginBottom: Spacing.sm,
    },
    emotionBadge: {
      backgroundColor: colors.primary + '15',
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: Radius.full,
    },
    emotionBadgeText: {
      fontSize: Typography.fontSize.xs,
      color: colors.primary,
      fontWeight: Typography.fontWeight.medium,
      fontFamily: Typography.fontFamily.primary,
    },

    /* ── Source badge ─────────────────────────────────── */
    sourceBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: Spacing.sm,
    },
    sourceBadgeText: {
      fontSize: Typography.fontSize.xs,
      color: colors.textMuted,
      fontFamily: Typography.fontFamily.primary,
    },

    /* ── States ──────────────────────────────────────── */
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.xl,
    },
    emptyIcon: { marginBottom: Spacing.md },
    emptyTitle: {
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      marginBottom: Spacing.sm,
      fontFamily: Typography.fontFamily.heading,
      textAlign: 'center',
    },
    mutedText: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      textAlign: 'center',
      fontFamily: Typography.fontFamily.primary,
    },
    retryBtn: {
      marginTop: Spacing.lg,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.xl,
      backgroundColor: colors.primary,
      borderRadius: Radius.lg,
      alignSelf: 'center',
    },
    retryBtnText: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.primaryForeground,
      fontFamily: Typography.fontFamily.primary,
    },

    /* ── Delete modal (web) ──────────────────────────── */
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.xl,
    },
    modalCard: {
      backgroundColor: colors.floating,
      borderRadius: Radius.xl,
      padding: Spacing.xl,
      width: '100%',
      maxWidth: 340,
      ...Shadows.lg,
    },
    modalTitle: {
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      fontFamily: Typography.fontFamily.heading,
      marginBottom: Spacing.sm,
    },
    modalBody: {
      fontSize: Typography.fontSize.base,
      color: colors.textSecondary,
      fontFamily: Typography.fontFamily.primary,
      marginBottom: Spacing.xl,
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: Spacing.md,
    },
    modalCancelBtn: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.md,
    },
    modalCancelText: {
      fontSize: Typography.fontSize.base,
      color: colors.textSecondary,
      fontWeight: Typography.fontWeight.medium,
      fontFamily: Typography.fontFamily.primary,
    },
    modalDeleteBtn: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.md,
      backgroundColor: colors.destructive,
    },
    modalDeleteText: {
      fontSize: Typography.fontSize.base,
      color: colors.destructiveForeground,
      fontWeight: Typography.fontWeight.semibold,
      fontFamily: Typography.fontFamily.primary,
    },
  });
