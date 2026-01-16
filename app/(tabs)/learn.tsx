/**
 * Learn Screen
 * 
 * EQ skill learning with short lessons.
 * Educational, not evaluative.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useColors, Spacing, Typography, Radius, Shadows } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import type { EQDomain } from '@/types';

interface Lesson {
  id: string;
  title: string;
  description: string;
  time: string;
  category: EQDomain | 'Communication';
}

const LESSONS: Lesson[] = [
  {
    id: '1',
    title: 'Understanding Emotional Triggers',
    description: 'Learn to identify what activates your emotional responses',
    time: '3 min',
    category: 'self_awareness',
  },
  {
    id: '2',
    title: 'The Pause Practice',
    description: 'How to create space between feeling and reacting',
    time: '2 min',
    category: 'self_regulation',
  },
  {
    id: '3',
    title: 'Reading Emotional Cues',
    description: 'Develop awareness of others\' emotional states',
    time: '4 min',
    category: 'empathy',
  },
  {
    id: '4',
    title: 'Naming Emotions Accurately',
    description: 'Build emotional vocabulary for better self-awareness',
    time: '3 min',
    category: 'self_awareness',
  },
  {
    id: '5',
    title: 'Emotional Recovery Patterns',
    description: 'Understanding how you return to baseline after stress',
    time: '4 min',
    category: 'resilience',
  },
  {
    id: '6',
    title: 'Expressing Needs Clearly',
    description: 'Communicate emotions without blame or defensiveness',
    time: '3 min',
    category: 'Communication',
  },
  {
    id: '7',
    title: 'The Role of Body in Emotion',
    description: 'How physical sensations connect to emotional states',
    time: '3 min',
    category: 'self_awareness',
  },
  {
    id: '8',
    title: 'Reframing Difficult Emotions',
    description: 'Shift your relationship with challenging feelings',
    time: '4 min',
    category: 'self_regulation',
  },
];

const CATEGORIES = [
  'All',
  'Self-Awareness',
  'Self-Regulation',
  'Empathy',
  'Resilience',
  'Communication',
];

const categoryMap: Record<string, EQDomain | 'Communication' | 'All'> = {
  'All': 'All',
  'Self-Awareness': 'self_awareness',
  'Self-Regulation': 'self_regulation',
  'Empathy': 'empathy',
  'Resilience': 'resilience',
  'Communication': 'Communication',
};

export default function LearnScreen() {
  const colors = useColors();
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredLessons =
    selectedCategory === 'All'
      ? LESSONS
      : LESSONS.filter(
          (lesson) => lesson.category === categoryMap[selectedCategory]
        );

  const handleLessonPress = (lessonId: string) => {
    // TODO: Navigate to lesson detail screen
    console.log('Opening lesson:', lessonId);
  };

  const styles = createStyles(colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Learn</Text>
        <Text style={styles.subtitle}>
          Build emotional intelligence through short lessons
        </Text>
      </View>

      {/* Category filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryContainer}
      >
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category}
            onPress={() => setSelectedCategory(category)}
            style={[
              styles.categoryChip,
              selectedCategory === category && styles.categoryChipSelected,
            ]}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === category && styles.categoryChipTextSelected,
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Lessons list */}
      <View style={styles.lessonsContainer}>
        {filteredLessons.map((lesson) => (
          <TouchableOpacity
            key={lesson.id}
            onPress={() => handleLessonPress(lesson.id)}
            style={[styles.lessonCard, Shadows.sm]}
          >
            <View style={styles.lessonContent}>
              <View style={styles.lessonText}>
                <Text style={styles.lessonTitle}>{lesson.title}</Text>
                <Text style={styles.lessonDescription}>{lesson.description}</Text>
              </View>
              <View style={styles.lessonIcon}>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textSecondary}
                />
              </View>
            </View>
            <View style={styles.lessonMeta}>
              <View style={styles.lessonCategory}>
                <Text style={styles.lessonCategoryText}>
                  {CATEGORIES.find((c) => categoryMap[c] === lesson.category) || lesson.category}
                </Text>
              </View>
              <Text style={styles.lessonTime}>{lesson.time}</Text>
            </View>
          </TouchableOpacity>
        ))}
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
    paddingBottom: Spacing['5xl'],
  },
  header: {
    padding: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
    fontFamily: Typography.fontFamily.heading,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: colors.textSecondary,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
    fontFamily: Typography.fontFamily.primary,
  },
  categoryContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: colors.surface,
  },
  categoryChipSelected: {
    backgroundColor: colors.secondary,
  },
  categoryChipText: {
    fontSize: Typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.primary,
  },
  categoryChipTextSelected: {
    color: colors.secondaryForeground,
  },
  lessonsContainer: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  lessonCard: {
    backgroundColor: colors.floating,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  lessonContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  lessonText: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
    lineHeight: Typography.lineHeight.tight * Typography.fontSize.lg,
    fontFamily: Typography.fontFamily.heading,
  },
  lessonDescription: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.primary,
  },
  lessonIcon: {
    marginLeft: Spacing.md,
  },
  lessonMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  lessonCategory: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: colors.surface,
  },
  lessonCategoryText: {
    fontSize: Typography.fontSize.xs,
    color: colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.primary,
  },
  lessonTime: {
    fontSize: Typography.fontSize.xs,
    color: colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.primary,
  },
});
