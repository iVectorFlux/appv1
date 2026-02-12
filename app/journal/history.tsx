/**
 * Journal History
 *
 * Loads entries from the database (SQLite on native). No dummy data.
 * Decrypts preview text for display. Tappable to edit.
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
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth-store';
import { getJournalEntries } from '@/services/journal-storage';
import { decryptJournalText } from '@/services/encryption';
import type { JournalEntry } from '@/types';

type ListEntry = {
  id: string;
  createdAt: number;
  preview: string;
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

const PREVIEW_LENGTH = 100;

export default function JournalHistoryScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuthStore();
  const [entries, setEntries] = useState<ListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

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
        let preview = '';
        try {
          const text = await decryptJournalText(row.journalTextEncrypted, row.userId);
          preview = text.trim().slice(0, PREVIEW_LENGTH);
          if (text.length > PREVIEW_LENGTH) preview += '…';
        } catch {
          preview = '…';
        }
        decrypted.push({
          id: row.id,
          createdAt: row.createdAt,
          preview: preview || 'No text',
        });
      }
      setEntries(decrypted);
    } catch (e) {
      console.error('[Journal history] Load failed:', e);
      setEntries([]);
      setLoadError('Could not load entries. Pull to try again.');
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
        <View style={styles.centered}>
          <Ionicons name="warning-outline" size={48} color={colors.textMuted} style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>Couldn't load entries</Text>
          <Text style={styles.mutedText}>{loadError}</Text>
        </View>
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
            <TouchableOpacity
              key={entry.id}
              style={styles.card}
              onPress={() => router.push(`/journal/entry/${entry.id}`)}
              activeOpacity={0.7}
            >
              <Text style={styles.cardDate}>{formatDate(entry.createdAt)}</Text>
              <Text style={styles.cardPreview} numberOfLines={3}>{entry.preview}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={styles.chevron} />
            </TouchableOpacity>
          ))}
        </ScrollView>
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
    card: {
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    cardDate: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textSecondary,
      marginBottom: Spacing.xs,
      fontFamily: Typography.fontFamily.primary,
    },
    cardPreview: {
      fontSize: Typography.fontSize.base,
      color: colors.textPrimary,
      lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base,
      fontFamily: Typography.fontFamily.primary,
    },
    chevron: { position: 'absolute', right: Spacing.md, top: Spacing.lg },
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
  });
