#!/usr/bin/env node
/**
 * Reads big-five-data `big_five_scores.csv` (0–1 trait scores from IPIP-NEO-300–derived sample),
 * computes μ and σ per trait, maps to the in-app 1–5 scale via: score_1_5 = 1 + 4 * x.
 *
 * Usage:
 *   node scripts/compute-big5-norms.mjs --input path/to/big_five_scores.csv [--country India] [--out src/data/big5-population-norms.json]
 *
 * Omit --country for global norms (all rows). Country match is case-insensitive trimmed substring or exact — we use exact case-insensitive equality on the CSV `country` field.
 */

import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TRAITS = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
/** CSV header → engine key (order of numeric columns after sex). */
const HEADER_MAP = {
  agreeable_score: 'agreeableness',
  extraversion_score: 'extraversion',
  openness_score: 'openness',
  conscientiousness_score: 'conscientiousness',
  neuroticism_score: 'neuroticism',
};

function parseArgs(argv) {
  const out = { input: null, country: null, outPath: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--input' && argv[i + 1]) {
      out.input = argv[++i];
    } else if (a === '--country' && argv[i + 1]) {
      out.country = argv[++i];
    } else if (a === '--out' && argv[i + 1]) {
      out.outPath = argv[++i];
    }
  }
  return out;
}

function createWelford() {
  return { n: 0, mean: 0, M2: 0 };
}

function updateWelford(w, x) {
  if (!Number.isFinite(x)) return;
  w.n += 1;
  const delta = x - w.mean;
  w.mean += delta / w.n;
  const delta2 = x - w.mean;
  w.M2 += delta * delta2;
}

function populationStd(w) {
  if (w.n < 2) return 0;
  return Math.sqrt(w.M2 / w.n);
}

function scale01To15(mean01, std01) {
  return {
    mean: 1 + 4 * mean01,
    std: 4 * std01,
  };
}

function parseLine(line, indexByHeader) {
  const parts = line.split(',');
  if (parts.length < 9) return null;
  const country = (parts[1] ?? '').trim();
  const nums = {};
  for (const [csvName, trait] of Object.entries(HEADER_MAP)) {
    const idx = indexByHeader[csvName.toLowerCase()];
    if (idx === undefined) continue;
    const v = parseFloat(parts[idx]);
    nums[trait] = v;
  }
  return { country, nums };
}

async function main() {
  const args = parseArgs(process.argv);
  const inputPath = args.input || path.join(__dirname, '../big-five-data-master/big_five_scores.csv');
  const outPath =
    args.outPath || path.join(__dirname, '../src/data/big5-population-norms.json');
  const countryFilter = args.country ? args.country.trim().toLowerCase() : null;

  if (!fs.existsSync(inputPath)) {
    console.error(
      `Input CSV not found: ${inputPath}\n` +
        'Unzip big-five-data-master and pass --input path/to/big_five_scores.csv'
    );
    process.exit(1);
  }

  const welfords = Object.fromEntries(TRAITS.map((t) => [t, createWelford()]));

  const rl = readline.createInterface({
    input: fs.createReadStream(inputPath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  let colIndex = {};
  let lineNo = 0;

  for await (const line of rl) {
    lineNo++;
    if (lineNo === 1) {
      const headers = line.split(',').map((h) => h.trim().toLowerCase());
      headers.forEach((h, i) => {
        colIndex[h] = i;
      });
      for (const csvName of Object.keys(HEADER_MAP)) {
        if (colIndex[csvName.toLowerCase()] === undefined) {
          console.error(`Missing column: ${csvName}`);
          process.exit(1);
        }
      }
      continue;
    }

    const row = parseLine(line, colIndex);
    if (!row) continue;

    if (countryFilter && row.country.trim().toLowerCase() !== countryFilter) {
      continue;
    }

    if (!TRAITS.every((t) => typeof row.nums[t] === 'number' && Number.isFinite(row.nums[t]))) {
      continue;
    }

    for (const t of TRAITS) {
      updateWelford(welfords[t], row.nums[t]);
    }
  }

  const totalN = welfords.openness.n;
  if (totalN === 0) {
    console.error('No rows matched. Check --country or CSV path.');
    process.exit(1);
  }

  const population_mean = {};
  const population_std = {};

  for (const t of TRAITS) {
    const w = welfords[t];
    const { mean, std } = scale01To15(w.mean, populationStd(w));
    population_mean[t] = Math.round(mean * 1e6) / 1e6;
    population_std[t] = Math.round(std * 1e6) / 1e6;
  }

  const payload = {
    meta: {
      source:
        'big-five-data (github.com/automoto/big-five-data): IPIP-NEO-300–derived public sample; trait scores 0–1.',
      n: totalN,
      country_filter: countryFilter,
      scale_mapping: 'In-app 1–5 norms: mean_15 = 1 + 4 * mean_01, std_15 = 4 * std_01 (linear stretch from dataset scale).',
      instrument_note:
        'Sample used full IPIP-NEO-300; app uses IPIP 50-item markers — interpret percentiles as approximate.',
    },
    population_mean,
    population_std,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.error(`Wrote ${outPath} (n=${totalN})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
