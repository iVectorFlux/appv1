/**
 * EQ Check-In Screen
 * 
 * This is the EQ measurement layer.
 * One question per day, trait/slider/binary types.
 * No scores shown to users.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';
import { useColors, Spacing, Typography, Radius, Shadows } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import type { EQQuestionType, EQResponse } from '@/types';

interface EQQuestion {
  id: string;
  statement: string;
  type: EQQuestionType;
  domain: string;
}

const EQ_QUESTIONS: EQQuestion[] = [
  { id: '1', statement: "I usually notice my emotions before they affect my actions.", type: 'slider', domain: 'self_awareness' },
  { id: '2', statement: "When emotions rise, I pause before reacting.", type: 'binary', domain: 'self_regulation' },
  { id: '3', statement: "I recover emotionally faster than I used to.", type: 'slider', domain: 'resilience' },
  { id: '4', statement: "I notice emotional changes in others.", type: 'binary', domain: 'empathy' },
  { id: '5', statement: "I can name my emotions clearly when they arise.", type: 'slider', domain: 'self_awareness' },
];

export default function EQScreen() {
  const router = useRouter();
  const colors = useColors();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, EQResponse>>({});
  const [sliderValue, setSliderValue] = useState(50);

  const question = EQ_QUESTIONS[currentQuestion];
  const progress = ((currentQuestion + 1) / EQ_QUESTIONS.length) * 100;
  const isComplete = currentQuestion >= EQ_QUESTIONS.length;

  const handleChoice = (choice: boolean) => {
    const response: EQResponse = { type: 'binary', value: choice };
    setAnswers({ ...answers, [question.id]: response });
    setTimeout(() => {
      if (currentQuestion < EQ_QUESTIONS.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSliderValue(50);
      } else {
        setCurrentQuestion(EQ_QUESTIONS.length);
      }
    }, 300);
  };

  const handleSliderSubmit = () => {
    const response: EQResponse = { type: 'slider', value: sliderValue };
    setAnswers({ ...answers, [question.id]: response });
    if (currentQuestion < EQ_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSliderValue(50);
    } else {
      setCurrentQuestion(EQ_QUESTIONS.length);
    }
  };

  const handleSkip = () => {
    if (currentQuestion < EQ_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSliderValue(50);
    } else {
      setCurrentQuestion(EQ_QUESTIONS.length);
    }
  };

  const handleComplete = () => {
    // TODO: Save EQ check-in to database
    router.replace('/(tabs)/home');
  };

  const styles = createStyles(colors);

  if (isComplete) {
    return (
      <View style={styles.container}>
        <View style={styles.completeContainer}>
          <View style={styles.completeIcon}>
            <Ionicons name="checkmark-circle" size={64} color={colors.primary} />
          </View>
          <Text style={styles.completeTitle}>EQ Check-In Complete</Text>
          <Text style={styles.completeDescription}>
            Your responses help track your emotional skill development over time.
          </Text>
          <Button
            title="Done"
            onPress={handleComplete}
            size="lg"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>
          Question {currentQuestion + 1} of {EQ_QUESTIONS.length}
        </Text>
        <Text style={styles.headerSubtext}>
          This is a quick self-check. Skip anytime.
        </Text>
      </View>

      {/* Question */}
      <ScrollView
        contentContainerStyle={styles.questionContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.questionText}>{question.statement}</Text>

        {question.type === 'binary' ? (
          <View style={styles.choiceContainer}>
            <TouchableOpacity
              onPress={() => handleChoice(true)}
              style={[styles.choiceButton, Shadows.sm]}
            >
              <Text style={styles.choiceText}>Often</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleChoice(false)}
              style={[styles.choiceButton, Shadows.sm]}
            >
              <Text style={styles.choiceText}>Sometimes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleChoice(false)}
              style={[styles.choiceButton, Shadows.sm]}
            >
              <Text style={styles.choiceText}>Rarely</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.sliderContainer}>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={100}
              value={sliderValue}
              onValueChange={setSliderValue}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.surface}
              thumbTintColor={colors.primary}
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>Not really</Text>
              <Text style={styles.sliderLabel}>Very much</Text>
            </View>
            <Button
              title="Next"
              onPress={handleSliderSubmit}
              fullWidth
              size="lg"
            />
          </View>
        )}
      </ScrollView>

      {/* Skip button */}
      <View style={styles.skipContainer}>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  progressBar: {
    height: 2,
    backgroundColor: colors.surface,
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  header: {
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerText: {
    fontSize: Typography.fontSize.xs,
    color: colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.primary,
  },
  headerSubtext: {
    fontSize: Typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: Spacing.xs,
    fontFamily: Typography.fontFamily.primary,
  },
  questionContainer: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  questionText: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.textPrimary,
    lineHeight: Typography.lineHeight.tight * Typography.fontSize.xl,
    textAlign: 'center',
    marginBottom: Spacing['3xl'],
    fontFamily: Typography.fontFamily.heading,
  },
  choiceContainer: {
    gap: Spacing.md,
  },
  choiceButton: {
    backgroundColor: colors.floating,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  choiceText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: colors.textPrimary,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.primary,
  },
  sliderContainer: {
    gap: Spacing.lg,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    fontFamily: Typography.fontFamily.primary,
  },
  skipContainer: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
  },
  skipText: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.primary,
  },
  completeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  completeIcon: {
    marginBottom: Spacing.xl,
  },
  completeTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: Spacing.md,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.heading,
  },
  completeDescription: {
    fontSize: Typography.fontSize.base,
    color: colors.textSecondary,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
    textAlign: 'center',
    marginBottom: Spacing['3xl'],
    fontFamily: Typography.fontFamily.primary,
  },
});
