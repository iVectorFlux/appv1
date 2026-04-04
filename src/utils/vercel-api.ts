/**
 * Base URL for Vercel-hosted `/api/*` routes from native apps and web.
 * Web: relative '' (same origin). Native: requires EXPO_PUBLIC_APP_URL at build time.
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

export function getVercelApiBase(): string {
  const raw = Constants.expoConfig?.extra?.appUrl ?? '';
  const appUrl = typeof raw === 'string' ? raw.trim().replace(/\/$/, '') : '';
  if (appUrl) return appUrl;
  if (Platform.OS === 'web') return '';
  const host = (Constants.expoConfig as { hostUri?: string })?.hostUri ?? 'localhost:8081';
  return `http://${host}`;
}

function apiUrl(path: string): string {
  const base = getVercelApiBase();
  const p = path.startsWith('/') ? path : `/${path}`;
  if (!base) return p;
  return `${base}${p}`;
}

export type ChatApiSuccess = {
  reply: string;
  emotions?: string[];
  groundingOptions?: string[];
  learningPathway?: string | null;
  suggestSaveAsReflection?: boolean;
  skillId?: string | null;
};

/**
 * POST /api/chat — throws Error with a user-visible message on failure.
 */
export async function requestChatCompletion(body: object): Promise<ChatApiSuccess> {
  const url = apiUrl('/api/chat');
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      'Could not reach the chat server. If you are on the Expo app on a device or simulator, set EXPO_PUBLIC_APP_URL in .env to your live site (https://….vercel.app), then rebuild — otherwise requests go to the dev server, which has no /api/chat.'
    );
  }

  const text = await res.text();
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text) as Record<string, unknown>;
  } catch {
    const needsAppUrl =
      Platform.OS !== 'web' && !(Constants.expoConfig?.extra?.appUrl as string | undefined)?.trim();
    throw new Error(
      needsAppUrl
        ? `Chat server returned non-JSON (${res.status}). Set EXPO_PUBLIC_APP_URL to your Vercel URL in .env and rebuild the app.`
        : res.status === 404
          ? `Chat API returned 404. Open your-site.vercel.app/api/health in a browser — if that 404s too, the Vercel project Root Directory must be the repo root (not "dist"), then redeploy.`
          : `Chat server returned an unexpected response (${res.status}). Try again or check the deployment.`
    );
  }

  if (!res.ok) {
    const msg = typeof parsed.error === 'string' ? parsed.error : `Request failed (${res.status})`;
    throw new Error(msg);
  }

  if (typeof parsed.reply !== 'string' || !parsed.reply.trim()) {
    throw new Error('The assistant returned an empty reply. Please try again.');
  }

  return parsed as unknown as ChatApiSuccess;
}
