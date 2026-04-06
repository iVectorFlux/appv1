/**
 * EQ Questions → Database row shape
 *
 * Builds rows for the eq_questions table from the in-code question bank.
 * Use to generate INSERT statements or tooling; the app loads questions via eq-questions-loader.
 *
 * Columns: id, type, domain, facet, difficulty, version, reverse_keyed,
 * negative_marking, scoring_config, payload
 */

import type { EQQuestion } from '@/types/eq-assessment';

function escapeSql(str: string): string {
  return str.replace(/'/g, "''");
}

function jsonToSql(obj: unknown): string {
  return "'" + escapeSql(JSON.stringify(obj)) + "'";
}

export interface EqQuestionRow {
  id: string;
  type: string;
  domain: string;
  facet: string | null;
  difficulty: string;
  version: number;
  reverse_keyed: boolean;
  negative_marking: boolean;
  scoring_config: Record<string, unknown>;
  payload: Record<string, unknown>;
}

/**
 * Build one DB row from an EQ question (any type).
 */
export function eqQuestionToRow(q: EQQuestion): EqQuestionRow {
  const base = {
    id: q.id,
    type: q.type,
    domain: q.dimension,
    facet: q.facet ?? null,
    difficulty: q.difficulty,
    version: q.version,
    reverse_keyed: false,
    negative_marking: false,
    scoring_config: {} as Record<string, unknown>,
    payload: { ...q } as Record<string, unknown>,
  };

  switch (q.type) {
    case 'likert':
      base.reverse_keyed = q.reverseKeyed;
      base.scoring_config = { scale: q.scale };
      break;
    case 'meta_eq':
      base.scoring_config = { scale: q.scale, ideal_delta: q.idealDelta };
      break;
    case 'consistency_probe':
      base.scoring_config = {
        scale: q.scale,
        paired_with_id: q.pairedWithId,
        expected_correlation: q.expectedCorrelation,
      };
      break;
    case 'ranking_allocation':
      base.scoring_config = {
        total_points: q.totalPoints,
        min_per_option: q.minPerOption,
        max_per_option: q.maxPerOption,
      };
      break;
    case 'sjt_decision':
      base.scoring_config = {
        options: q.options.map((o) => ({
          id: o.id,
          dimension: o.dimension,
          effectiveness: o.effectiveness,
        })),
      };
      break;
    case 'emotion_vocabulary':
      base.scoring_config = {
        options: q.options.map((o) => ({
          id: o.id,
          is_correct: o.isCorrect,
          partial_credit: o.partialCredit,
        })),
      };
      break;
    case 'emotion_perception':
      base.scoring_config = {
        format: q.format,
        options: q.options.map((o) => ({
          id: o.id,
          is_correct: o.isCorrect,
          partial_credit: o.partialCredit ?? (o.isCorrect ? 1 : 0),
        })),
      };
      break;
    case 'forced_choice':
      base.scoring_config = {
        select_most: q.selectMost,
        select_least: q.selectLeast ?? false,
        options: q.options.map((o) => ({ id: o.id, dimension: o.dimension, weight: o.weight })),
      };
      break;
    case 'physiological_proxy':
      base.scoring_config = {
        options: q.options.map((o) => ({
          id: o.id,
          awareness_level: o.awarenessLevel,
        })),
      };
      break;
    default:
      break;
  }

  return base as EqQuestionRow;
}

/**
 * Generate a single SQL INSERT ... ON CONFLICT DO UPDATE for one row.
 */
export function rowToSqlInsert(row: EqQuestionRow): string {
  const cols =
    'id, type, domain, facet, difficulty, version, reverse_keyed, negative_marking, scoring_config, payload, updated_at';
  const values = [
    `'${escapeSql(row.id)}'`,
    `'${escapeSql(row.type)}'`,
    `'${escapeSql(row.domain)}'`,
    row.facet == null ? 'NULL' : `'${escapeSql(row.facet)}'`,
    `'${escapeSql(row.difficulty)}'`,
    row.version,
    row.reverse_keyed,
    row.negative_marking,
    jsonToSql(row.scoring_config),
    jsonToSql(row.payload),
    'now()',
  ].join(', ');
  return `INSERT INTO public.eq_questions (${cols}) VALUES (${values})
ON CONFLICT (id) DO UPDATE SET
  type = EXCLUDED.type,
  domain = EXCLUDED.domain,
  facet = EXCLUDED.facet,
  difficulty = EXCLUDED.difficulty,
  version = EXCLUDED.version,
  reverse_keyed = EXCLUDED.reverse_keyed,
  negative_marking = EXCLUDED.negative_marking,
  scoring_config = EXCLUDED.scoring_config,
  payload = EXCLUDED.payload,
  updated_at = now();`;
}
