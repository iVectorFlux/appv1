/**
 * Pure helpers for Home “Assessments & progress” snapshot (testable, no React).
 */

export type EqScoreSnapshot = {
  completedAt: string;
  overallScore: number;
  assessmentType: 'check_in' | 'full_test';
};

export function formatShortDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function latestByType(
  scores: EqScoreSnapshot[],
  type: 'check_in' | 'full_test'
): EqScoreSnapshot | null {
  const filtered = scores.filter((s) => s.assessmentType === type);
  if (filtered.length === 0) return null;
  return filtered.reduce((a, b) =>
    new Date(a.completedAt).getTime() >= new Date(b.completedAt).getTime() ? a : b
  );
}

export function latestOverall(scores: EqScoreSnapshot[]): EqScoreSnapshot | null {
  if (scores.length === 0) return null;
  return scores.reduce((a, b) =>
    new Date(a.completedAt).getTime() >= new Date(b.completedAt).getTime() ? a : b
  );
}

export function assessmentTypeLabel(t: 'check_in' | 'full_test'): string {
  return t === 'check_in' ? 'Check-in' : 'Full test';
}
