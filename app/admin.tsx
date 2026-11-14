/**
 * Enterprise Multi-Admin Analytics & Team Workspace Screen
 *
 * Allows company admins to view complete user progress across their company:
 * - Multi-admin company workspace support (multiple admins per company)
 * - Videos & audio lessons viewed, in-progress %, and completed counts
 * - Latest EQ score and adaptive learning pathway status
 * - User management (promote/demote user <-> admin within same company)
 * - Per-user lesson drill-down modal and per-course completion breakdown
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import { useAuthStore } from '@/stores/auth-store';
import { useWebLaptopLayout } from '@/hooks/useWebLaptopLayout';
import { EnterpriseShell } from '@/components/layout/desktop-sidebar';
import { formatCatalogLabel } from '@/data/eq-curriculum';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import {
  Badge,
  ProgressBar,
  StatCard,
  SectionHeading,
  Separator,
} from '@/components/ui/shadcn-primitives';
import {
  createCompanyWorkspace,
  joinCompanyByInviteCode,
  setCompanyMemberRole,
  fetchEnterpriseDashboardData,
  type EnterpriseDashboardData,
  type CompanyMemberAnalytics,
} from '@/services/enterprise-admin';
import { GOOD_EQ_SCORE_THRESHOLD } from '@/services/learning-sequence';
import type { UserRole } from '@/types';

type RoleFilter = 'all' | 'admin' | 'user';

function formatShortDate(iso: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function EnterpriseAdminScreen() {
  const colors = useColors();
  const isDesktop = useWebLaptopLayout();
  const { user, isAuthenticated, refreshDisplayName } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EnterpriseDashboardData | null>(null);

  // Workspace setup forms when user has no company yet
  const [companyNameInput, setCompanyNameInput] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [submittingWorkspace, setSubmittingWorkspace] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Table filters & drill-down state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<CompanyMemberAnalytics | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'courses'>('users');

  const isCompanyAdmin = Boolean(isAuthenticated && user?.role === 'admin' && user?.companyId);

  const loadDashboard = useCallback(async () => {
    if (!user?.companyId || user.role !== 'admin') return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchEnterpriseDashboardData(user.companyId);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load company analytics.');
    } finally {
      setLoading(false);
    }
  }, [user?.companyId, user?.role]);

  useEffect(() => {
    if (isCompanyAdmin) {
      void loadDashboard();
    }
  }, [isCompanyAdmin, loadDashboard]);

  const handleCreateCompany = async () => {
    const trimmed = companyNameInput.trim();
    if (!trimmed) {
      setError('Enter your company or team name.');
      return;
    }
    setSubmittingWorkspace(true);
    setError(null);
    try {
      await createCompanyWorkspace(trimmed);
      await refreshDisplayName();
      setCompanyNameInput('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create company workspace.');
    } finally {
      setSubmittingWorkspace(false);
    }
  };

  const handleJoinCompany = async () => {
    const trimmed = inviteCodeInput.trim();
    if (!trimmed) {
      setError('Enter an invite code from your company admin.');
      return;
    }
    setSubmittingWorkspace(true);
    setError(null);
    try {
      await joinCompanyByInviteCode(trimmed);
      await refreshDisplayName();
      setInviteCodeInput('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid invite code or migration missing.');
    } finally {
      setSubmittingWorkspace(false);
    }
  };

  const handleCopyInviteCode = async (code: string) => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(code);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        Alert.alert('Invite Code', `Share code: ${code}`);
      }
    } catch {
      Alert.alert('Invite Code', `Share code: ${code}`);
    }
  };

  const executeRoleChange = async (member: CompanyMemberAnalytics, nextRole: UserRole) => {
    setUpdatingRoleId(member.userId);
    setError(null);
    try {
      await setCompanyMemberRole(member.userId, nextRole);
      if (member.userId === user?.id) {
        await refreshDisplayName();
      }
      await loadDashboard();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update member role.');
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const handleToggleRole = (member: CompanyMemberAnalytics) => {
    const nextRole: UserRole = member.role === 'admin' ? 'user' : 'admin';
    const actionLabel = nextRole === 'admin' ? 'Promote to Admin' : 'Set as User';
    const message = `${actionLabel} for ${member.displayName || member.email}?`;
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(message)) {
        void executeRoleChange(member, nextRole);
      }
      return;
    }
    Alert.alert(actionLabel, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => void executeRoleChange(member, nextRole) },
    ]);
  };

  const filteredMembers = useMemo(() => {
    const list = data?.members ?? [];
    const q = searchQuery.trim().toLowerCase();
    return list.filter((m) => {
      if (roleFilter !== 'all' && m.role !== roleFilter) return false;
      if (!q) return true;
      return (
        m.displayName.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
      );
    });
  }, [data?.members, roleFilter, searchQuery]);

  if (!isAuthenticated) {
    return (
      <EnterpriseShell>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <ScreenHeader title="Enterprise Admin" showHomeButton backFallbackHref="/(tabs)/home" />
          <View style={styles.centerBox}>
            <GlassCard style={styles.setupCard}>
              <Ionicons name="shield-checkmark-outline" size={32} color={colors.primary} />
              <Text style={[styles.setupTitle, { color: colors.textPrimary }]}>Sign in required</Text>
              <Text style={[styles.setupBody, { color: colors.textSecondary }]}>
                Sign in with your enterprise account to access company analytics or manage workspace roles.
              </Text>
              <Button
                title="Sign In"
                onPress={() => router.push('/(auth)/sign-in')}
                fullWidth
              />
            </GlassCard>
          </View>
        </View>
      </EnterpriseShell>
    );
  }

  // Non-admin or unlinked workspace view
  if (!isCompanyAdmin) {
    return (
      <EnterpriseShell>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <ScreenHeader title="Enterprise Workspace" showHomeButton backFallbackHref="/(tabs)/home" />
          <ScrollView contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]}>
            {error ? (
              <GlassCard style={[styles.errorBanner, { borderColor: colors.destructive }]}>
                <Ionicons name="alert-circle-outline" size={18} color={colors.destructive} />
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              </GlassCard>
            ) : null}

            {user?.companyId && user.role !== 'admin' ? (
              <GlassCard style={styles.setupCardWide}>
                <Badge label="Role: Standard User" variant="secondary" icon="person-outline" />
                <Text style={[styles.setupTitle, { color: colors.textPrimary, marginTop: Spacing.sm }]}>
                  Admin Access Required
                </Text>
                <Text style={[styles.setupBody, { color: colors.textSecondary, textAlign: 'left' }]}>
                  You are currently a member of{' '}
                  <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
                    {user.companyName || 'your company workspace'}
                  </Text>{' '}
                  with the <Text style={{ fontWeight: '700' }}>User</Text> role. Companies support multiple admins — ask any existing Company Admin in your organization to promote your account from the Team Directory.
                </Text>
                <View style={{ marginTop: Spacing.md, flexDirection: 'row', gap: Spacing.sm }}>
                  <Button title="Back to Learn EQ" onPress={() => router.replace('/(tabs)/learn')} />
                  <Button
                    title="Refresh Permissions"
                    variant="outline"
                    onPress={() => void refreshDisplayName()}
                  />
                </View>
              </GlassCard>
            ) : (
              <View style={[styles.setupGrid, isDesktop && styles.setupGridDesktop]}>
                <GlassCard style={styles.setupCardWide}>
                  <Badge label="Become Company Admin" variant="default" icon="business-outline" />
                  <Text style={[styles.setupTitle, { color: colors.textPrimary, marginTop: Spacing.sm }]}>
                    Create Company Workspace
                  </Text>
                  <Text style={[styles.setupBody, { color: colors.textSecondary, textAlign: 'left' }]}>
                    Launch a new enterprise workspace for your organization. As the creator you start as a Company Admin and can invite employees and promote additional admins.
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: colors.textPrimary,
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                      },
                    ]}
                    placeholder="e.g., Acme Leadership Labs"
                    placeholderTextColor={colors.textMuted}
                    value={companyNameInput}
                    onChangeText={setCompanyNameInput}
                  />
                  <Button
                    title={submittingWorkspace ? 'Creating...' : 'Create Workspace as Admin'}
                    onPress={handleCreateCompany}
                    loading={submittingWorkspace}
                    fullWidth
                  />
                </GlassCard>

                <GlassCard style={styles.setupCardWide}>
                  <Badge label="Join Existing Team" variant="secondary" icon="key-outline" />
                  <Text style={[styles.setupTitle, { color: colors.textPrimary, marginTop: Spacing.sm }]}>
                    Join via Company Invite Code
                  </Text>
                  <Text style={[styles.setupBody, { color: colors.textSecondary, textAlign: 'left' }]}>
                    Already have a company workspace? Enter your company invite code below to join as a User. Any company admin can later grant you Admin privileges.
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: colors.textPrimary,
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                      },
                    ]}
                    placeholder="Invite code (e.g., A1B2C3D4)"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="characters"
                    value={inviteCodeInput}
                    onChangeText={setInviteCodeInput}
                  />
                  <Button
                    title={submittingWorkspace ? 'Joining...' : 'Join Company Workspace'}
                    variant="outline"
                    onPress={handleJoinCompany}
                    loading={submittingWorkspace}
                    fullWidth
                  />
                </GlassCard>
              </View>
            )}
          </ScrollView>
        </View>
      </EnterpriseShell>
    );
  }

  return (
    <EnterpriseShell>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader
          title="Enterprise Analytics"
          showHomeButton
          backFallbackHref="/(tabs)/home"
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]}
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <GlassCard style={[styles.errorBanner, { borderColor: colors.destructive }]}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </GlassCard>
          ) : null}

          {/* Company Header Card */}
          <GlassCard style={styles.companyHeaderCard}>
            <View style={styles.companyHeaderRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.companyBadges}>
                  <Badge label="Enterprise Admin Console" variant="default" icon="shield-checkmark-outline" />
                  <Badge
                    label={`${data?.summary.adminCount ?? 1} Company ${(data?.summary.adminCount ?? 1) === 1 ? 'Admin' : 'Admins'}`}
                    variant="secondary"
                    icon="people-outline"
                  />
                  <Pressable
                    onPress={() => void loadDashboard()}
                    style={[styles.refreshBtn, { borderColor: colors.border, backgroundColor: colors.floating }]}
                    accessibilityLabel="Refresh company analytics"
                  >
                    <Ionicons name="refresh" size={14} color={colors.textPrimary} />
                  </Pressable>
                </View>
                <Text style={[styles.companyName, { color: colors.textPrimary }]}>
                  {data?.company?.name || user?.companyName || 'Company Workspace'}
                </Text>
                <Text style={[styles.companySubtitle, { color: colors.textSecondary }]}>
                  Monitor team video views, audio progress, lesson completion, and adaptive EQ proficiency across your company.
                </Text>
              </View>

              {data?.company?.inviteCode ? (
                <View style={[styles.inviteBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.inviteLabel, { color: colors.textMuted }]}>TEAM INVITE CODE</Text>
                  <Text style={[styles.inviteCode, { color: colors.textPrimary }]}>
                    {data.company.inviteCode}
                  </Text>
                  <Button
                    title={copiedCode ? 'Copied!' : 'Copy Code'}
                    size="sm"
                    variant="outline"
                    icon={copiedCode ? 'checkmark' : 'copy-outline'}
                    onPress={() => void handleCopyInviteCode(data.company!.inviteCode)}
                  />
                </View>
              ) : null}
            </View>
          </GlassCard>

          {loading && !data ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Loading company users and completion analytics...
              </Text>
            </View>
          ) : data ? (
            <>
              {/* KPI Grid */}
              <View style={[styles.kpiGrid, isDesktop && styles.kpiGridDesktop]}>
                <StatCard
                  label="Total Company Users"
                  value={data.summary.totalUsers}
                  hint={`${data.summary.activeLearners} active learners • ${data.summary.adminCount} admins`}
                  icon="people-outline"
                  style={isDesktop ? styles.kpiDesktopItem : styles.kpiMobileItem}
                />
                <StatCard
                  label="Videos Completed"
                  value={data.summary.totalVideosCompleted}
                  hint={`${data.summary.totalAudiosCompleted} audio tracks completed`}
                  icon="videocam-outline"
                  accent={colors.success}
                  style={isDesktop ? styles.kpiDesktopItem : styles.kpiMobileItem}
                />
                <StatCard
                  label="Avg Course Completion"
                  value={`${data.summary.avgCourseCompletionPct}%`}
                  hint={`${data.summary.totalCurriculumLessons} lessons per learner`}
                  icon="checkmark-done-circle-outline"
                  style={isDesktop ? styles.kpiDesktopItem : styles.kpiMobileItem}
                />
                <StatCard
                  label="Avg EQ Score"
                  value={data.summary.avgEqScore ?? '—'}
                  hint={`Free-browse benchmark: ${GOOD_EQ_SCORE_THRESHOLD}+`}
                  icon="analytics-outline"
                  accent={colors.warning}
                  style={isDesktop ? styles.kpiDesktopItem : styles.kpiMobileItem}
                />
              </View>

              {/* Section Tabs */}
              <View style={styles.tabRow}>
                  <Pressable
                  onPress={() => setActiveTab('users')}
                  style={[
                    styles.tabBtn,
                    {
                      borderColor: activeTab === 'users' ? colors.primary : colors.border,
                      backgroundColor: activeTab === 'users' ? colors.primary : colors.floating,
                    },
                  ]}
                >
                  <Ionicons
                    name="people"
                    size={16}
                    color={activeTab === 'users' ? colors.primaryForeground : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.tabBtnText,
                      { color: activeTab === 'users' ? colors.primaryForeground : colors.textSecondary },
                    ]}
                  >
                    Team Progress ({data.members.length})
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setActiveTab('courses')}
                  style={[
                    styles.tabBtn,
                    {
                      borderColor: activeTab === 'courses' ? colors.primary : colors.border,
                      backgroundColor: activeTab === 'courses' ? colors.primary : colors.floating,
                    },
                  ]}
                >
                  <Ionicons
                    name="library"
                    size={16}
                    color={activeTab === 'courses' ? colors.primaryForeground : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.tabBtnText,
                      { color: activeTab === 'courses' ? colors.primaryForeground : colors.textSecondary },
                    ]}
                  >
                    Lesson Completion ({data.courseStats.length})
                  </Text>
                </Pressable>
              </View>

              {activeTab === 'users' ? (
                <GlassCard style={styles.panelCard}>
                  <SectionHeading
                    title="Employee & Admin Learning Analytics"
                    description="Track every member's EQ baseline, video/audio completion, overall progress, and manage multiple company admins."
                  />

                  {/* Search & Role Filters */}
                  <View style={[styles.filterBar, isDesktop && styles.filterBarDesktop]}>
                    <View style={[styles.searchWrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                      <Ionicons name="search" size={16} color={colors.textMuted} />
                      <TextInput
                        style={[styles.searchInput, { color: colors.textPrimary }]}
                        placeholder="Search by employee name or email..."
                        placeholderTextColor={colors.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                      />
                    </View>
                    <View style={styles.roleFilterPills}>
                      {(['all', 'admin', 'user'] as RoleFilter[]).map((rf) => {
                        const active = roleFilter === rf;
                        return (
                          <Pressable
                            key={rf}
                            onPress={() => setRoleFilter(rf)}
                            style={[
                              styles.filterPill,
                              {
                                borderColor: active ? colors.primary : colors.border,
                                backgroundColor: active ? colors.primary + '16' : colors.surface,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.filterPillText,
                                { color: active ? colors.primary : colors.textSecondary },
                              ]}
                            >
                              {rf === 'all' ? 'All Roles' : rf === 'admin' ? 'Admins' : 'Users'}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  {filteredMembers.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Ionicons name="people-outline" size={28} color={colors.textMuted} />
                      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                        No matching team members found. Share your invite code above to onboard colleagues.
                      </Text>
                    </View>
                  ) : isDesktop ? (
                    <View style={styles.tableWrap}>
                      {/* Desktop Table Header */}
                      <View style={[styles.tableHeader, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                        <Text style={[styles.thCell, { flex: 2.2, color: colors.textSecondary }]}>Member</Text>
                        <Text style={[styles.thCell, { flex: 1.0, color: colors.textSecondary }]}>Role</Text>
                        <Text style={[styles.thCell, { flex: 1.1, color: colors.textSecondary }]}>Latest EQ</Text>
                        <Text style={[styles.thCell, { flex: 1.3, color: colors.textSecondary }]}>Videos Watched</Text>
                        <Text style={[styles.thCell, { flex: 1.0, color: colors.textSecondary }]}>Audios</Text>
                        <Text style={[styles.thCell, { flex: 1.6, color: colors.textSecondary }]}>Overall Progress</Text>
                        <Text style={[styles.thCell, { flex: 1.8, textAlign: 'right', color: colors.textSecondary }]}>Actions</Text>
                      </View>

                      {filteredMembers.map((member, idx) => (
                        <View key={member.userId}>
                          <View style={styles.tableRow}>
                            <View style={{ flex: 2.2, paddingRight: Spacing.sm }}>
                              <Text style={[styles.memberName, { color: colors.textPrimary }]} numberOfLines={1}>
                                {member.displayName}
                                {member.userId === user?.id ? ' (You)' : ''}
                              </Text>
                              <Text style={[styles.memberEmail, { color: colors.textMuted }]} numberOfLines={1}>
                                {member.email || 'No email'} • Active {formatShortDate(member.lastLearningActivityAt ?? member.lastLoginAt)}
                              </Text>
                            </View>

                            <View style={{ flex: 1.0, alignItems: 'flex-start' }}>
                              <Badge
                                label={member.role === 'admin' ? 'Admin' : 'User'}
                                variant={member.role === 'admin' ? 'default' : 'secondary'}
                              />
                            </View>

                            <View style={{ flex: 1.1 }}>
                              {member.latestEqScore !== null ? (
                                <View style={styles.eqCell}>
                                  <Text style={[styles.cellStrong, { color: colors.textPrimary }]}>
                                    {member.latestEqScore}/100
                                  </Text>
                                  <Text
                                    style={[
                                      styles.cellSub,
                                      {
                                        color:
                                          member.latestEqScore >= GOOD_EQ_SCORE_THRESHOLD
                                            ? colors.success
                                            : colors.warning,
                                      },
                                    ]}
                                  >
                                    {member.latestEqScore >= GOOD_EQ_SCORE_THRESHOLD ? 'Free Browse' : 'Guided'}
                                  </Text>
                                </View>
                              ) : (
                                <Text style={[styles.cellSub, { color: colors.textMuted }]}>Not tested</Text>
                              )}
                            </View>

                            <View style={{ flex: 1.3 }}>
                              <Text style={[styles.cellStrong, { color: colors.textPrimary }]}>
                                {member.videosCompleted} / {member.totalCatalogLessons}
                              </Text>
                              <Text style={[styles.cellSub, { color: colors.textMuted }]}>
                                Avg view: {member.avgVideoProgressPct}%
                              </Text>
                            </View>

                            <View style={{ flex: 1.0 }}>
                              <Text style={[styles.cellStrong, { color: colors.textPrimary }]}>
                                {member.audiosCompleted} / {member.totalCatalogLessons}
                              </Text>
                            </View>

                            <View style={{ flex: 1.6, paddingRight: Spacing.md }}>
                              <View style={styles.progressLabelRow}>
                                <Text style={[styles.cellStrong, { color: colors.textPrimary }]}>
                                  {member.overallCompletionPct}%
                                </Text>
                                <Text style={[styles.cellSub, { color: colors.textMuted }]}>
                                  {member.lessonsCompleted}/{member.totalCatalogLessons}
                                </Text>
                              </View>
                              <ProgressBar
                                value={member.overallCompletionPct}
                                height={7}
                                color={member.overallCompletionPct >= 75 ? colors.success : colors.primary}
                              />
                            </View>

                            <View style={[styles.actionCell, { flex: 1.8 }]}>
                              <Button
                                title="Lessons"
                                size="sm"
                                variant="outline"
                                onPress={() => setSelectedMember(member)}
                              />
                              <Button
                                title={member.role === 'admin' ? 'Set User' : 'Make Admin'}
                                size="sm"
                                variant={member.role === 'admin' ? 'secondary' : 'outline'}
                                loading={updatingRoleId === member.userId}
                                onPress={() => handleToggleRole(member)}
                              />
                            </View>
                          </View>
                          {idx < filteredMembers.length - 1 ? <Separator /> : null}
                        </View>
                      ))}
                    </View>
                  ) : (
                    /* Mobile Responsive Cards */
                    <View style={{ gap: Spacing.md }}>
                      {filteredMembers.map((member) => (
                        <View
                          key={member.userId}
                          style={[styles.mobileMemberCard, { borderColor: colors.border, backgroundColor: colors.surface }]}
                        >
                          <View style={styles.mobileMemberTop}>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.memberName, { color: colors.textPrimary }]}>
                                {member.displayName}
                                {member.userId === user?.id ? ' (You)' : ''}
                              </Text>
                              <Text style={[styles.memberEmail, { color: colors.textMuted }]}>
                                {member.email || 'No email'}
                              </Text>
                            </View>
                            <Badge
                              label={member.role === 'admin' ? 'Admin' : 'User'}
                              variant={member.role === 'admin' ? 'default' : 'secondary'}
                            />
                          </View>

                          <View style={styles.mobileStatsRow}>
                            <View style={styles.mobileStat}>
                              <Text style={[styles.cellSub, { color: colors.textMuted }]}>EQ Score</Text>
                              <Text style={[styles.cellStrong, { color: colors.textPrimary }]}>
                                {member.latestEqScore ?? '—'}
                              </Text>
                            </View>
                            <View style={styles.mobileStat}>
                              <Text style={[styles.cellSub, { color: colors.textMuted }]}>Videos</Text>
                              <Text style={[styles.cellStrong, { color: colors.textPrimary }]}>
                                {member.videosCompleted}/{member.totalCatalogLessons}
                              </Text>
                            </View>
                            <View style={styles.mobileStat}>
                              <Text style={[styles.cellSub, { color: colors.textMuted }]}>Audios</Text>
                              <Text style={[styles.cellStrong, { color: colors.textPrimary }]}>
                                {member.audiosCompleted}/{member.totalCatalogLessons}
                              </Text>
                            </View>
                            <View style={styles.mobileStat}>
                              <Text style={[styles.cellSub, { color: colors.textMuted }]}>Overall</Text>
                              <Text style={[styles.cellStrong, { color: colors.textPrimary }]}>
                                {member.overallCompletionPct}%
                              </Text>
                            </View>
                          </View>

                          <ProgressBar value={member.overallCompletionPct} height={7} />

                          <View style={styles.mobileActionsRow}>
                            <Button
                              title="View Lessons"
                              size="sm"
                              variant="outline"
                              onPress={() => setSelectedMember(member)}
                            />
                            <Button
                              title={member.role === 'admin' ? 'Set User' : 'Make Admin'}
                              size="sm"
                              variant="secondary"
                              loading={updatingRoleId === member.userId}
                              onPress={() => handleToggleRole(member)}
                            />
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </GlassCard>
              ) : (
                <GlassCard style={styles.panelCard}>
                  <SectionHeading
                    title="Curriculum Completion Across Company"
                    description="Ordered sequentially across Self-Awareness, Self-Management, Social Awareness, and Relationship Management."
                  />
                  <View style={{ gap: Spacing.md }}>
                    {data.courseStats.map((course, idx) => (
                      <View
                        key={course.episodeKey}
                        style={[styles.courseRow, { borderColor: colors.border, backgroundColor: colors.surface }]}
                      >
                        <View style={styles.courseRowTop}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.courseDomain, { color: colors.primary }]}>
                              #{idx + 1} · {formatCatalogLabel(course.domain)} · {formatCatalogLabel(course.competency)}
                            </Text>
                            <Text style={[styles.courseTitle, { color: colors.textPrimary }]}>
                              {course.title}
                            </Text>
                          </View>
                          <View style={styles.courseCounts}>
                            <Badge label={`${course.videosCompletedCount} videos`} variant="secondary" icon="videocam-outline" />
                            <Badge label={`${course.audiosCompletedCount} audios`} variant="outline" icon="headset-outline" />
                          </View>
                        </View>
                        <View style={styles.progressLabelRow}>
                          <Text style={[styles.cellSub, { color: colors.textSecondary }]}>
                            Company completion rate
                          </Text>
                          <Text style={[styles.cellStrong, { color: colors.textPrimary }]}>
                            {course.completionRatePct}%
                          </Text>
                        </View>
                        <ProgressBar value={course.completionRatePct} height={7} />
                      </View>
                    ))}
                  </View>
                </GlassCard>
              )}
            </>
          ) : null}
        </ScrollView>

        {/* Per-User Lesson Breakdown Modal */}
        <Modal
          visible={selectedMember !== null}
          animationType="fade"
          transparent
          onRequestClose={() => setSelectedMember(null)}
        >
          <View style={styles.modalBackdrop}>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: colors.floating,
                  borderColor: colors.border,
                },
              ]}
            >
              {selectedMember ? (
                <>
                  <View style={styles.modalHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                        {selectedMember.displayName}
                      </Text>
                      <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                        {selectedMember.email} • EQ Score: {selectedMember.latestEqScore ?? 'Not taken'} •{' '}
                        {selectedMember.videosCompleted} videos & {selectedMember.audiosCompleted} audios completed
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => setSelectedMember(null)}
                      style={[styles.closeBtn, { backgroundColor: colors.surface }]}
                    >
                      <Ionicons name="close" size={20} color={colors.textPrimary} />
                    </Pressable>
                  </View>
                  <Separator style={{ marginVertical: Spacing.md }} />
                  <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                    {selectedMember.lessonDetails.length === 0 ? (
                      <Text style={[styles.emptyText, { color: colors.textSecondary, paddingVertical: Spacing.xl }]}>
                        This user has not opened any video or audio lessons yet.
                      </Text>
                    ) : (
                      <View style={{ gap: Spacing.sm }}>
                        {selectedMember.lessonDetails.map((lesson) => (
                          <View
                            key={lesson.episodeKey}
                            style={[styles.lessonDetailRow, { borderColor: colors.border, backgroundColor: colors.surface }]}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.lessonCompetency, { color: colors.primary }]}>
                                {formatCatalogLabel(lesson.competency)}
                              </Text>
                              <Text style={[styles.lessonTitle, { color: colors.textPrimary }]}>
                                {lesson.title}
                              </Text>
                              <Text style={[styles.cellSub, { color: colors.textMuted }]}>
                                Last opened: {formatShortDate(lesson.lastAccessedAt)}
                              </Text>
                            </View>
                            <View style={styles.lessonBadges}>
                              <Badge
                                label={lesson.videoCompleted ? 'Video 100%' : `Video ${lesson.videoProgressPct}%`}
                                variant={lesson.videoCompleted ? 'success' : 'secondary'}
                                icon="videocam-outline"
                              />
                              <Badge
                                label={lesson.audioCompleted ? 'Audio 100%' : `Audio ${lesson.audioProgressPct}%`}
                                variant={lesson.audioCompleted ? 'success' : 'outline'}
                                icon="headset-outline"
                              />
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </ScrollView>
                </>
              ) : null}
            </View>
          </View>
        </Modal>
      </View>
    </EnterpriseShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing['5xl'],
    gap: Spacing.lg,
  },
  scrollContentDesktop: {
    maxWidth: 1220,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.xl,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  setupCard: {
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
    gap: Spacing.md,
  },
  setupGrid: {
    gap: Spacing.lg,
  },
  setupGridDesktop: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  setupCardWide: {
    flex: 1,
    gap: Spacing.sm,
  },
  setupTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
  },
  setupBody: {
    fontSize: Typography.fontSize.sm,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.fontSize.sm,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
  },
  errorText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  refreshBtn: {
    width: 26,
    height: 26,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyHeaderCard: {
    padding: Spacing.lg,
  },
  companyHeaderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  companyBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  companyName: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
  },
  companySubtitle: {
    fontSize: Typography.fontSize.sm,
    marginTop: 4,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
  },
  inviteBox: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'flex-start',
    gap: 6,
    minWidth: 190,
  },
  inviteLabel: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 0.7,
  },
  inviteCode: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 1.5,
  },
  loadingWrap: {
    paddingVertical: Spacing['3xl'],
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: Typography.fontSize.sm,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  kpiGridDesktop: {
    flexWrap: 'nowrap',
  },
  kpiDesktopItem: {
    flex: 1,
  },
  kpiMobileItem: {
    width: '48%',
  },
  tabRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  tabBtnText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  panelCard: {
    padding: Spacing.lg,
  },
  filterBar: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  filterBarDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchWrap: {
    flex: 1,
    maxWidth: 380,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
  },
  roleFilterPills: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  filterPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  tableWrap: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.md,
    marginBottom: Spacing.xs,
  },
  thCell: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 0.2,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  memberName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  memberEmail: {
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  eqCell: {
    gap: 2,
  },
  cellStrong: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  cellSub: {
    fontSize: Typography.fontSize.xs,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  actionCell: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.xs,
  },
  mobileMemberCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  mobileMemberTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  mobileStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  mobileStat: {
    gap: 2,
  },
  mobileActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  courseRow: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  courseRowTop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  courseDomain: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  courseTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginTop: 2,
  },
  courseCounts: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(9, 9, 11, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 720,
    maxHeight: '85%',
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  modalTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
  },
  modalSub: {
    fontSize: Typography.fontSize.xs,
    marginTop: 4,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    flexGrow: 0,
  },
  lessonDetailRow: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  lessonCompetency: {
    fontSize: 11,
    fontWeight: Typography.fontWeight.bold,
  },
  lessonTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    marginTop: 2,
  },
  lessonBadges: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
});
