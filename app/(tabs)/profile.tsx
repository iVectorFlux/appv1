/**
 * Profile — name, optional learner context (Skill Lab), appearance, sign out.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { useThemeStore } from '@/stores/theme-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { GlassBackground } from '@/components/ui/glass-background';
import { GlassCard } from '@/components/ui/glass-card';
import { ScreenHeader } from '@/components/ui/screen-header';
import {
  getUserProfileContext,
  updateUserProfileContext,
  LIFE_SITUATION_OPTIONS,
  INDUSTRY_OPTIONS,
  WORK_SETTING_OPTIONS,
  type UserProfileContext,
  type LifeSituationId,
  type IndustryId,
  type WorkSettingId,
} from '@/services/profile-context';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { colorMode, toggleColorMode } = useThemeStore();
  const colors = useColors();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [interests, setInterests] = useState('');
  const [industry, setIndustry] = useState<IndustryId | null>(null);
  const [professionalRole, setProfessionalRole] = useState('');
  const [workSetting, setWorkSetting] = useState<WorkSettingId | null>(null);
  const [lifeSituation, setLifeSituation] = useState<LifeSituationId | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoadError(null);
    try {
      const { data } = await supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle();
      if (data?.display_name) setDisplayName(data.display_name as string);
    } catch {
      setDisplayName(null);
    }
    try {
      const ctx = await getUserProfileContext(user.id);
      setInterests(ctx.profileInterests ?? '');
      setIndustry(ctx.industry);
      setProfessionalRole(ctx.professionalRole ?? '');
      setWorkSetting(ctx.orgContext);
      setLifeSituation(ctx.lifeSituation);
    } catch {
      setLoadError('Could not load your profile context.');
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const saveContext = async () => {
    if (!user?.id || !isSupabaseConfigured()) {
      setLoadError('Connect Supabase in .env to save your profile.');
      return;
    }
    setSaving(true);
    setLoadError(null);
    const res = await updateUserProfileContext(user.id, {
      profileInterests: interests,
      lifeSituation,
      industry,
      professionalRole,
      orgContext: workSetting,
    } satisfies Partial<UserProfileContext>);
    setSaving(false);
    if (!res.ok) setLoadError(res.error ?? 'Could not save.');
  };

  const handleLogout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logout();
    } catch (e) {
      console.error('[Profile] Logout error:', e);
    } finally {
      setSigningOut(false);
      // Reset stack to sign-in; avoids index redirect races with Supabase session cleanup.
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
          <Text style={st.sectionTitle}>About you</Text>
          <Text style={st.sectionHint}>
            We use this to tailor Skill Lab scenarios. You can change it anytime. Multiple assessments keep your latest EQ and Big Five on Progress.
          </Text>
          {loadError ? <Text style={st.errorText}>{loadError}</Text> : null}
          <GlassCard>
            <Text style={st.fieldLabel}>Life situation</Text>
            <View style={st.chipWrap}>
              {LIFE_SITUATION_OPTIONS.map((o) => {
                const on = lifeSituation === o.id;
                return (
                  <Pressable
                    key={o.id}
                    onPress={() => setLifeSituation((prev) => (prev === o.id ? null : o.id))}
                    style={[st.chip, { borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primary + '14' : colors.surface }]}
                  >
                    <Text style={[st.chipText, { color: on ? colors.primary : colors.textSecondary }]}>{o.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Input label="Interests (optional)" value={interests} onChangeText={setInterests} placeholder="Short note — e.g. leadership, exams" autoCapitalize="sentences" autoCorrect />
            <Text style={st.fieldLabel}>Industry</Text>
            <View style={st.chipWrap}>
              {INDUSTRY_OPTIONS.map((o) => {
                const on = industry === o.id;
                return (
                  <Pressable
                    key={o.id}
                    onPress={() => setIndustry((prev) => (prev === o.id ? null : o.id))}
                    style={[st.chip, { borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primary + '14' : colors.surface }]}
                  >
                    <Text style={[st.chipText, { color: on ? colors.primary : colors.textSecondary }]} numberOfLines={1}>
                      {o.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={st.fieldLabel}>Work or study context</Text>
            <View style={st.chipWrap}>
              {WORK_SETTING_OPTIONS.map((o) => {
                const on = workSetting === o.id;
                return (
                  <Pressable
                    key={o.id}
                    onPress={() => setWorkSetting((prev) => (prev === o.id ? null : o.id))}
                    style={[st.chip, { borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primary + '14' : colors.surface }]}
                  >
                    <Text style={[st.chipText, { color: on ? colors.primary : colors.textSecondary }]} numberOfLines={2}>
                      {o.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Input label="Role or title (optional)" value={professionalRole} onChangeText={setProfessionalRole} placeholder="e.g. Product manager" autoCapitalize="words" />
            <View style={st.saveRow}>
              <Button title="Save profile context" onPress={saveContext} loading={saving} disabled={!isSupabaseConfigured() || !user?.id} />
            </View>
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
            <Text style={st.privacyText}>We use profile context only to personalize practice; we do not sell your data.</Text>
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
    sectionHint: { fontSize: Typography.fontSize.xs, color: colors.textSecondary, marginBottom: Spacing.md, lineHeight: Typography.fontSize.xs * 1.5 },
    fieldLabel: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, color: colors.textPrimary, marginBottom: Spacing.sm },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
    chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: Radius.full, borderWidth: 1 },
    chipText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
    saveRow: { marginTop: Spacing.md, alignItems: 'stretch' },
    errorText: { fontSize: 12, color: colors.destructive, marginBottom: Spacing.sm },
    settingsList: { gap: Spacing.sm },
    settingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    settingText: { fontSize: Typography.fontSize.base, color: colors.textPrimary, fontWeight: Typography.fontWeight.medium },
    settingDesc: { fontSize: Typography.fontSize.xs, color: colors.textSecondary, marginTop: 2 },
    privacyContent: { alignItems: 'center', gap: Spacing.sm },
    privacyTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.semibold, color: colors.textPrimary, textAlign: 'center' },
    privacyText: { fontSize: Typography.fontSize.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm },
    logoutSection: { marginTop: Spacing.xl },
  });
