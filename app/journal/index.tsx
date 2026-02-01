/**
 * Journal — main screen
 *
 * Hub for private writing. New entry, History. Same storage as Reflect (Check in) journal step.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useColors, Spacing, Typography, Radius, Shadows } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth-store';

export default function JournalIndexScreen() {
  const router = useRouter();
  const colors = useColors();

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Journal</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroCard, Shadows.sm]}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="book-outline" size={40} color={colors.accentSoft} />
          </View>
          <Text style={styles.heroTitle}>Journal</Text>
          <View style={styles.privacyPillWrap}>
            <Ionicons name="lock-closed" size={14} color={colors.primary} />
            <Text style={styles.privacyPillText}>Private & encrypted</Text>
          </View>
          <Text style={styles.heroSub}>
            Your writing stays on your device. We never read it.
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/journal/new-entry')}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={24} color={colors.primaryForeground} />
            <Text style={styles.primaryBtnText}>New entry</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push('/journal/history')}
            activeOpacity={0.8}
          >
            <Ionicons name="time-outline" size={24} color={colors.primary} />
            <Text style={styles.secondaryBtnText}>History</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: {
      fontSize: Typography.fontSize.xl,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      fontFamily: Typography.fontFamily.heading,
    },
    scroll: { flex: 1 },
    content: { padding: Spacing.xl, paddingBottom: Spacing['3xl'] },
    heroCard: {
      backgroundColor: colors.floating,
      borderRadius: Radius.xl,
      padding: Spacing['2xl'],
      marginBottom: Spacing['2xl'],
      borderWidth: 1,
      borderColor: colors.borderLight,
      alignItems: 'center',
    },
    heroIconWrap: {
      width: 72,
      height: 72,
      borderRadius: Radius.xl,
      backgroundColor: colors.accentSoft + '22',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.lg,
    },
    heroTitle: {
      fontSize: Typography.fontSize['2xl'],
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      fontFamily: Typography.fontFamily.heading,
      marginBottom: Spacing.sm,
    },
    privacyPillWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.sm,
      borderRadius: Radius.full,
      backgroundColor: colors.primary + '14',
      marginBottom: Spacing.md,
    },
    privacyPillText: {
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.medium,
      color: colors.primary,
      fontFamily: Typography.fontFamily.primary,
    },
    heroSub: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      fontFamily: Typography.fontFamily.primary,
      lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
      textAlign: 'center',
    },
    actions: { gap: Spacing.md },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      backgroundColor: colors.primary,
      borderRadius: Radius.lg,
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing.xl,
    },
    primaryBtnText: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.primaryForeground,
      fontFamily: Typography.fontFamily.heading,
    },
    secondaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing.xl,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    secondaryBtnText: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      fontFamily: Typography.fontFamily.heading,
    },
  });
