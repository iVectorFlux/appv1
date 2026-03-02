/**
 * Seed eq_questions table from the in-code question bank.
 *
 * Run from project root after applying migration 00005_eq_questions.sql:
 *   npx tsx scripts/seed-eq-questions.ts
 *
 * Or with ts-node:
 *   npx ts-node --project tsconfig.json -r tsconfig-paths/register scripts/seed-eq-questions.ts
 *
 * Output: SQL statements. Redirect to a file and run in Supabase SQL Editor if needed:
 *   npx tsx scripts/seed-eq-questions.ts > eq_questions_seed.sql
 */

import { ALL_QUESTIONS } from '../src/data/eq-questions';
import { eqQuestionToRow, rowToSqlInsert } from '../src/data/eq-questions-db';

function main() {
  const rows = ALL_QUESTIONS.map(eqQuestionToRow);
  console.log('-- Seed eq_questions (run after 00005_eq_questions.sql)');
  console.log('-- Generated from in-code question bank. Total:', rows.length);
  console.log('');
  for (const row of rows) {
    console.log(rowToSqlInsert(row));
    console.log('');
  }
}

main();
