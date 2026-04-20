import { describe, it, expect } from 'vitest';
import {
  latestByType,
  latestOverall,
  assessmentTypeLabel,
  formatShortDate,
  type EqScoreSnapshot,
} from './home-assessment-summary';

const samples: EqScoreSnapshot[] = [
  { completedAt: '2026-01-10T12:00:00.000Z', overallScore: 60, assessmentType: 'check_in' },
  { completedAt: '2026-01-15T12:00:00.000Z', overallScore: 72, assessmentType: 'check_in' },
  { completedAt: '2026-01-05T12:00:00.000Z', overallScore: 68, assessmentType: 'full_test' },
];

describe('home-assessment-summary', () => {
  it('latestByType picks most recent check_in', () => {
    const row = latestByType(samples, 'check_in');
    expect(row?.overallScore).toBe(72);
    expect(row?.completedAt).toBe('2026-01-15T12:00:00.000Z');
  });

  it('latestByType picks most recent full_test', () => {
    const row = latestByType(samples, 'full_test');
    expect(row?.overallScore).toBe(68);
  });

  it('latestOverall picks newest across types', () => {
    const row = latestOverall(samples);
    expect(row?.assessmentType).toBe('check_in');
    expect(row?.overallScore).toBe(72);
  });

  it('assessmentTypeLabel', () => {
    expect(assessmentTypeLabel('check_in')).toBe('Check-in');
    expect(assessmentTypeLabel('full_test')).toBe('Full test');
  });

  it('formatShortDate returns null for bad input', () => {
    expect(formatShortDate(null)).toBeNull();
    expect(formatShortDate('')).toBeNull();
  });
});
