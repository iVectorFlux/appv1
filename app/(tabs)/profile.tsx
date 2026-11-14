/**
 * Profile - identity, appearance, sign out.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { useThemeStore } from '@/stores/theme-store';
import { Button } from '@/components/ui/button';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { GlassBackground } from '@/components/ui/glass-background';
import { GlassCard } from '@/components/ui/glass-card';
import { ScreenHeader } from '@/components/ui/screen-header';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { colorMode, toggleColorMode } = useThemeStore();
  const colors = useColors();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle();
      if (data?.display_name) setDisplayName(data.display_name as string);
    } catch {
      setDisplayName(null);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleLogout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logout();
    } catch (e) {
      console.error('[Profile] Logout error:', e);
    } finally {
      setSigningOut(false);
      router.replace('/(auth)/sign-in');
    }
  };

  const nameToShow = (displayName?.trim() || user?.username || 'User').replace(/^\w/, (c) => c.toUpperCase());
  const st = createStyles(colors);

  return (
    <GlassBackground>
      <ScrollView style={st.container} contentContainerStyle={st.content}>
        <ScreenHeader title="Profile" backFallbackHref="/(tabs)/home" showHomeButton />
        <View style={st.avatarBlock}>
          <View style={[st.avatar, { borderColor: colors.primary }]}>
            <Ionicons name="person" size={40} color={colors.primary} />
          </View>
          <Text style={st.username}>{nameToShow}</Text>
          {user?.email ? <Text style={st.email}>{user.email}</Text> : null}
        </View>

        <View style={st.section}>
          <Text style={st.sectionTitle}>Assessments</Text>
          <GlassCard>
            {(
              [
                { route: '/full-eq-test' as const, icon: 'analytics-outline' as const, title: 'Full EQ test', subtitle: 'Emotional intelligence · full battery' },
                { route: '/big5-test' as const, icon: 'color-wand-outline' as const, title: 'Big Five', subtitle: 'Personality OCEAN · IPIP 50' },
              ] as const
            ).map((row, i, arr) => (
              <View key={row.route}>
                <TouchableOpacity
                  style={st.assessRow}
                  onPress={() => router.push(row.route)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                >
                  <View style={[st.assessIcon, { backgroundColor: colors.primary + '14' }]}>
                    <Ionicons name={row.icon} size={22} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.assessTitle}>{row.title}</Text>
                    <Text style={st.assessSubtitle}>{row.subtitle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </TouchableOpacity>
                {i < arr.length - 1 ? <View style={[st.assessDivider, { backgroundColor: colors.borderLight }]} /> : null}
              </View>
            ))}
          </GlassCard>
        </View>

        <View style={st.section}>
          <Text style={st.sectionTitle}>Appearance</Text>
          <GlassCard>
            <View style={st.settingRow}>
              <Ionicons name={colorMode === 'dark' ? 'moon' : 'sunny-outline'} size={22} color={colors.textPrimary} />
              <View style={{ flex: 1 }}>
                <Text style={st.settingText}>Dark Mode</Text>
                <Text style={st.settingDesc}>{colorMode === 'dark' ? 'Enabled' : 'Disabled'}</Text>
              </View>
              <Switch
                value={colorMode === 'dark'}
                onValueChange={toggleColorMode}
                trackColor={{ false: colors.surface, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          </GlassCard>
        </View>

        <View style={st.section}>
          <Text style={st.sectionTitle}>Settings</Text>
          <View style={st.settingsList}>
            {[
              { icon: 'notifications-outline' as const, label: 'Notifications' },
              { icon: 'lock-closed-outline' as const, label: 'Privacy & Security' },
              { icon: 'help-circle-outline' as const, label: 'Help & Support' },
              { icon: 'information-circle-outline' as const, label: 'About' },
            ].map((item) => (
              <GlassCard key={item.label}>
                <View style={st.settingRow}>
                  <Ionicons name={item.icon} size={22} color={colors.textPrimary} />
                  <Text style={[st.settingText, { flex: 1 }]}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </View>
              </GlassCard>
            ))}
          </View>
        </View>

        <GlassCard>
          <View style={st.privacyContent}>
            <Ionicons name="shield-checkmark-outline" size={28} color={colors.primary} />
            <Text style={st.privacyTitle}>Your privacy</Text>
            <Text style={st.privacyText}>Your wellbeing data stays yours. We do not sell your data.</Text>
          </View>
        </GlassCard>

        <View style={st.logoutSection}>
          <Button title="Sign Out" onPress={handleLogout} variant="ghost" fullWidth size="lg" loading={signingOut} />
        </View>
      </ScrollView>
    </GlassBackground>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1 },
    content: { paddingHorizontal: Spacing.md, paddingTop: 4, paddingBottom: 120 },
    avatarBlock: { alignItems: 'center', marginBottom: Spacing.xl },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: Radius.full,
      backgroundColor: colors.glass,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.md,
      borderWidth: 2,
    },
    username: {
      fontSize: Typography.fontSize.xl,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      marginBottom: Spacing.xs,
      textTransform: 'capitalize',
    },
    email: { fontSize: Typography.fontSize.sm, color: colors.textSecondary },
    section: { marginBottom: Spacing.xl },
    sectionTitle: { fontSize: Typography.fontSize.xs, color: colors.textMuted, fontWeight: Typography.fontWeight.semibold, marginBottom: Spacing.xs, letterSpacing: 0.3 },
    settingsList: { gap: Spacing.sm },
    settingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    settingText: { fontSize: Typography.fontSize.base, color: colors.textPrimary, fontWeight: Typography.fontWeight.medium },
    settingDesc: { fontSize: Typography.fontSize.xs, color: colors.textSecondary, marginTop: 2 },
    privacyContent: { alignItems: 'center', gap: Spacing.sm },
    privacyTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.semibold, color: colors.textPrimary, textAlign: 'center' },
    privacyText: { fontSize: Typography.fontSize.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm },
    logoutSection: { marginTop: Spacing.xl },
    assessRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm },
    assessIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    assessTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: colors.textPrimary },
    assessSubtitle: { fontSize: Typography.fontSize.xs, color: colors.textSecondary, marginTop: 2 },
    assessDivider: { height: StyleSheet.hairlineWidth, marginLeft: 60 },
  });
