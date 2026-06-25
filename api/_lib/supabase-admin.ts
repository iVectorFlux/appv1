/**
 * Supabase service-role client for Vercel serverless routes only.
 * Never import from the Expo client bundle.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let admin: SupabaseClient | null | undefined;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (admin !== undefined) return admin;

  const url =
    process.env.SUPABASE_URL?.trim() || process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    admin = null;
    return null;
  }

  admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}
