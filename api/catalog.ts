/**
 * GET /api/catalog?language=en
 *
 * Edge-cacheable read endpoint serving the public EQ learning catalog
 * (`learning_content`) and competency study guides (`eq_competency_guides`).
 *
 * Vercel CDN caches responses (`s-maxage=600, stale-while-revalidate=3600`)
 * so hundreds of concurrent users across devices load curriculum content
 * in ~30ms without hitting Supabase Postgres on every visit.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { applyCors, handleCorsPreflight } from './_lib/cors';
import { getSupabaseAdmin } from './_lib/supabase-admin';

function getCatalogSupabaseClient() {
  const admin = getSupabaseAdmin();
  if (admin) return admin;

  const url =
    process.env.SUPABASE_URL?.trim() || process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const anon =
    process.env.SUPABASE_ANON_KEY?.trim() || process.env.EXPO_PUBLIC_SUPABASE_KEY?.trim();

  if (!url || !anon) return null;
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  applyCors(res);
  if (handleCorsPreflight(req, res)) return;

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const langRaw = Array.isArray(req.query.language) ? req.query.language[0] : req.query.language;
  const language = (langRaw || 'en').trim() || 'en';

  const client = getCatalogSupabaseClient();
  if (!client) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(503).json({ error: 'Supabase not configured on server' });
    return;
  }

  try {
    const [contentRes, guidesRes] = await Promise.all([
      client
        .from('learning_content')
        .select('*')
        .eq('language', language)
        .eq('content_for', 'EQ')
        .order('sort_order', { ascending: true })
        .order('episode_title', { ascending: true }),
      client
        .from('eq_competency_guides')
        .select(
          'competency_key, sequence_order, domain_key, domain_label, title, short_content, what_it_is, why_it_matters, how_to_measure, long_content, practice_prompt, estimated_read_minutes'
        )
        .order('sequence_order', { ascending: true }),
    ]);

    if (contentRes.error) {
      res.setHeader('Cache-Control', 'no-store');
      res.status(502).json({ error: contentRes.error.message });
      return;
    }

    const rows = contentRes.data ?? [];
    const guides = guidesRes.error ? [] : (guidesRes.data ?? []);

    if (rows.length > 0) {
      res.setHeader(
        'Cache-Control',
        'public, max-age=120, s-maxage=600, stale-while-revalidate=3600'
      );
    } else {
      res.setHeader('Cache-Control', 'no-store');
    }

    res.status(200).json({
      language,
      rows,
      guides,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({
      error: err instanceof Error ? err.message : 'Failed to load catalog',
    });
  }
}
