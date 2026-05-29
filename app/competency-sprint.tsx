import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth-store';
import { useCompetencySprintStore } from '@/stores/competency-sprint-store';
import { useColors, Spacing } from '@/constants/design-tokens';
import { GlassBackground } from '@/components/ui/glass-background';
import { ScreenHeader } from '@/components/ui/screen-header';
import { CompetencySprintStepper } from '@/components/competency-sprint-stepper';
import { CompetencySprintPrimer } from '@/components/competency-sprint-primer';
import { CompetencySprintLearn } from '@/components/competency-sprint-learn';
import { CompetencySprintDrills } from '@/components/competency-sprint-drills';
import { CompetencySprintSimulation } from '@/components/competency-sprint-simulation';
import { CompetencySprintReport } from '@/components/competency-sprint-report';
import { getUserProfileContext, type UserProfileContext } from '@/services/profile-context';

export default function CompetencySprintScreen() {
  const [mounted, setMounted] = useState(false);
  const [profileContext, setProfileContext] = useState<UserProfileContext | null>(null);
  const colors = useColors();
  const { user } = useAuthStore();
  const {
    sprint,
    loading,
    error,
    loadOrCreateSprint,
    startNewSprintWithContext,
    moveToStage,
    checkOffMicroSkill,
  } = useCompetencySprintStore();

  const skillId = 'difficult_conversations';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && user?.id) {
      void loadOrCreateSprint(user.id, skillId);
      void getUserProfileContext(user.id).then((ctx) => {
        setProfileContext(ctx);
      });
    }
  }, [user?.id, mounted]);

  if (!mounted) {
    return (
      <GlassBackground>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      </GlassBackground>
    );
  }

  const renderActiveStage = () => {
    if (!sprint) {
      return (
        <CompetencySprintPrimer
          initialIndustry={profileContext?.industry ?? null}
          initialRole={profileContext?.professionalRole ?? null}
          initialFunction={profileContext?.orgContext ?? null}
          loading={loading}
          onStartSprint={async (ctx) => {
            if (user?.id) {
              await startNewSprintWithContext(user.id, skillId, ctx);
              await moveToStage('learn');
            }
          }}
        />
      );
    }

    switch (sprint.currentStage) {
      case 'primer':
        return (
          <CompetencySprintPrimer
            initialIndustry={profileContext?.industry ?? null}
            initialRole={profileContext?.professionalRole ?? null}
            initialFunction={profileContext?.orgContext ?? null}
            loading={loading}
            onStartSprint={async (ctx) => {
              if (user?.id) {
                await startNewSprintWithContext(user.id, skillId, ctx);
                await moveToStage('learn');
              }
            }}
          />
        );
      case 'learn':
        return (
          <CompetencySprintLearn
            microSkills={sprint.microSkills || []}
            onCheckSkill={checkOffMicroSkill}
            onNext={() => moveToStage('drills')}
          />
        );
      case 'drills':
        return <CompetencySprintDrills />;
      case 'guided':
      case 'independent':
      case 'escalated':
        return <CompetencySprintSimulation />;
      case 'report':
        return <CompetencySprintReport />;
      default:
        return (
          <CompetencySprintPrimer
            initialIndustry={profileContext?.industry ?? null}
            initialRole={profileContext?.professionalRole ?? null}
            initialFunction={profileContext?.orgContext ?? null}
            loading={loading}
            onStartSprint={async (ctx) => {
              if (user?.id) {
                await startNewSprintWithContext(user.id, skillId, ctx);
                await moveToStage('learn');
              }
            }}
          />
        );
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.xl,
    },
    errorText: {
      color: colors.accentTerracotta,
      fontSize: 14,
      textAlign: 'center',
      marginTop: Spacing.sm,
    },
  });

  return (
    <GlassBackground>
      <View style={styles.container}>
        <ScreenHeader
          title="Competency Sprint"
          backFallbackHref="/(tabs)/home"
          showHomeButton
        />

        {sprint && <CompetencySprintStepper currentStage={sprint.currentStage} />}

        {loading && !sprint ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Ionicons name="alert-circle-outline" size={32} color={colors.accentTerracotta} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          renderActiveStage()
        )}
      </View>
    </GlassBackground>
  );
}

