/**
 * Profile Screen
 *
 * User profile and settings: display name, email. Dark mode toggle.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { useThemeStore } from '@/stores/theme-store';
import { Button } from '@/components/ui/Button';
import { Spacing, Typography, Radius, Shadows } from '@/constants/design-tokens';
import { useColors } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { colorMode, toggleColorMode } = useThemeStore();
  const colors = useColors();
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle();
        if (!cancelled && data?.display_name) setDisplayName(data.display_name);
      } catch {
        if (!cancelled) setDisplayName(null);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const nameToShow = (displayName?.trim() || user?.username || 'User').replace(/^\w/, (c) => c.toUpperCase());
  const styles = createStyles(colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color={colors.primary} />
        </View>
        <Text style={styles.username}>{nameToShow}</Text>
        {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
      </View>

      {/* Appearance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        
        {/* Dark Mode Toggle */}
        <View style={[styles.settingItem, Shadows.sm]}>
          <View style={styles.settingContent}>
            <Ionicons 
              name={colorMode === 'dark' ? 'moon' : 'sunny-outline'} 
              size={24} 
              color={colors.textPrimary} 
            />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingText}>Dark Mode</Text>
              <Text style={styles.settingDescription}>
                {colorMode === 'dark' ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>
          <Switch
            value={colorMode === 'dark'}
            onValueChange={toggleColorMode}
            trackColor={{ false: colors.surface, true: colors.primary }}
            thumbColor={colors.floating}
          />
        </View>
      </View>

      {/* EQ Assessment Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>EQ ASSESSMENT</Text>
        
        <TouchableOpacity 
          style={[styles.eqTestCard, Shadows.md]}
          onPress={() => router.push('/full-eq-test')}
        >
          <View style={styles.eqTestIconContainer}>
            <Ionicons name="analytics" size={32} color={colors.primary} />
          </View>
          <View style={styles.eqTestContent}>
            <Text style={styles.eqTestTitle}>Take Full EQ Test</Text>
            <Text style={styles.eqTestDescription}>
              Comprehensive assessment with 60+ questions across 7 dimensions
            </Text>
            <Text style={styles.eqTestTime}>~25 minutes</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        
        <TouchableOpacity style={[styles.settingItem, Shadows.sm]}>
          <View style={styles.settingContent}>
            <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
            <Text style={styles.settingText}>Notifications</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.settingItem, Shadows.sm]}>
          <View style={styles.settingContent}>
            <Ionicons name="lock-closed-outline" size={24} color={colors.textPrimary} />
            <Text style={styles.settingText}>Privacy & Security</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.settingItem, Shadows.sm]}>
          <View style={styles.settingContent}>
            <Ionicons name="help-circle-outline" size={24} color={colors.textPrimary} />
            <Text style={styles.settingText}>Help & Support</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.settingItem, Shadows.sm]}>
          <View style={styles.settingContent}>
            <Ionicons name="information-circle-outline" size={24} color={colors.textPrimary} />
            <Text style={styles.settingText}>About</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Privacy Notice */}
      <View style={styles.privacySection}>
        <View style={styles.privacyCard}>
          <Ionicons name="shield-checkmark-outline" size={32} color={colors.primary} />
          <Text style={styles.privacyTitle}>Your Privacy is Protected</Text>
          <Text style={styles.privacyText}>
            Journal entries are encrypted and stored locally only. We never analyze or sync your private writing.
          </Text>
        </View>
      </View>

      {/* Logout */}
      <View style={styles.logoutSection}>
        <Button
          title="Sign Out"
          onPress={handleLogout}
          variant="ghost"
          fullWidth
          size="lg"
        />
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: Spacing.xl,
    paddingBottom: Spacing['5xl'],
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: Radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  username: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
    fontFamily: Typography.fontFamily.heading,
    textTransform: 'capitalize',
  },
  email: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    fontFamily: Typography.fontFamily.primary,
  },
  section: {
    marginBottom: Spacing['2xl'],
  },
  sectionTitle: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.md,
    fontFamily: Typography.fontFamily.primary,
  },
  settingItem: {
    backgroundColor: colors.floating,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingText: {
    fontSize: Typography.fontSize.base,
    color: colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.primary,
  },
  settingDescription: {
    fontSize: Typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
    fontFamily: Typography.fontFamily.primary,
  },
  // EQ Test Card
  eqTestCard: {
    backgroundColor: colors.floating,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 2,
    borderColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  eqTestIconContainer: {
    width: 60,
    height: 60,
    borderRadius: Radius.lg,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eqTestContent: {
    flex: 1,
  },
  eqTestTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.textPrimary,
    fontFamily: Typography.fontFamily.heading,
    marginBottom: Spacing.xs,
  },
  eqTestDescription: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.primary,
    marginBottom: Spacing.xs,
  },
  eqTestTime: {
    fontSize: Typography.fontSize.xs,
    color: colors.primary,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.primary,
  },
  privacySection: {
    marginBottom: Spacing['2xl'],
  },
  privacyCard: {
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  privacyTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.heading,
  },
  privacyText: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.primary,
  },
  logoutSection: {
    marginTop: Spacing.lg,
  },
});
