import React, { useEffect } from 'react';
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

export default function CompetencySprintScreen() {
  const colors = useColors();
  const { user } = useAuthStore();
  const {
    sprint,
    loading,
    error,
    loadOrCreateSprint,
    moveToStage,
    checkOffMicroSkill,
  } = useCompetencySprintStore();

  const skillId = 'difficult_conversations';

  useEffect(() => {
    if (user?.id) {
      void loadOrCreateSprint(user.id, skillId);
    }
  }, [user?.id]);

  const renderActiveStage = () => {
    if (!sprint) return null;

    switch (sprint.currentStage) {
      case 'primer':
        return <CompetencySprintPrimer onNext={() => moveToStage('learn')} />;
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
        return <CompetencySprintPrimer onNext={() => moveToStage('learn')} />;
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
