/**
 * Base URL for Vercel-hosted `/api/*` routes.
 *
 * - Deployed web (e.g. *.vercel.app): uses same origin automatically.
 * - Local Expo web (localhost): Metro has NO /api — set EXPO_PUBLIC_APP_URL to your Vercel URL.
 * - Native: set EXPO_PUBLIC_APP_URL and rebuild, or dev points at Metro (no API).
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

function readConfiguredAppUrl(): string {
  const extra = Constants.expoConfig?.extra?.appUrl;
  if (typeof extra === 'string' && extra.trim()) {
    return extra.trim().replace(/\/$/, '');
  }
  try {
    const fromEnv = typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_APP_URL : undefined;
    if (typeof fromEnv === 'string' && fromEnv.trim()) {
      return fromEnv.trim().replace(/\/$/, '');
    }
  } catch {
    /* ignore */
  }
  return '';
}

/**
 * Origin for API calls (no trailing slash). Empty string means "same origin" (relative URLs).
 */
export function getVercelApiBase(): string {
  const configured = readConfiguredAppUrl();
  if (configured) return configured;

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const h = window.location.hostname;
    const isLocal = h === 'localhost' || h === '127.0.0.1';
    if (!isLocal) {
      return `${window.location.protocol}//${window.location.host}`.replace(/\/$/, '');
    }
  }

  if (Platform.OS === 'web') return '';

  const host = (Constants.expoConfig as { hostUri?: string })?.hostUri ?? 'localhost:8081';
  return `http://${host}`;
}

/** Local Expo web cannot hit /api on Metro — fail fast with setup instructions. */
function assertLocalWebCanReachApi(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const h = window.location.hostname;
  if (h !== 'localhost' && h !== '127.0.0.1') return;
  if (readConfiguredAppUrl()) return;
  throw new Error(
    'You are on Expo web at localhost — Metro does not serve /api/chat. Add this to your .env file (use your real Vercel URL):\n\nEXPO_PUBLIC_APP_URL=https://YOUR_PROJECT.vercel.app\n\nThen restart Expo with a clean cache: npx expo start -c\n\nOr test chat on the deployed site in the browser (same-origin /api works there).'
  );
}

function joinApiUrl(path: string): string {
  const base = getVercelApiBase();
  const p = path.startsWith('/') ? path : `/${path}`;
  if (!base) return p;
  return `${base}${p}`;
}

/** Full URL for a Vercel API path; throws on localhost web without EXPO_PUBLIC_APP_URL. */
export function buildVercelApiUrl(path: string): string {
  assertLocalWebCanReachApi();
  return joinApiUrl(path);
}

export type ChatApiSuccess = {
  reply: string;
  emotions?: string[];
  /** Life areas inferred from the user message (matches Reflect reason labels). */
  lifeContexts?: string[];
  groundingOptions?: string[];
  learningPathway?: string | null;
  suggestSaveAsReflection?: boolean;
  skillId?: string | null;
  /** Inner Ally: gentle alternative perspective when the user expressed something difficult (shown in its own card). */
  reframe?: string | null;
};

/**
 * POST /api/chat — throws Error with a user-visible message on failure.
 */
const CHAT_FETCH_TIMEOUT_MS = 55_000;

export async function requestChatCompletion(body: object): Promise<ChatApiSuccess> {
  assertLocalWebCanReachApi();
  const url = joinApiUrl('/api/chat');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CHAT_FETCH_TIMEOUT_MS);
  try {
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (fetchErr: unknown) {
      if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
        throw fetchErr;
      }
      throw new Error(
        'Could not reach the chat server. If you use the app on a phone or simulator, set EXPO_PUBLIC_APP_URL in .env to your live site (https://….vercel.app), then rebuild.'
      );
    }

    // Keep the same AbortSignal active until the body is read. Clearing the timeout right after
    // `fetch` resolves leaves `res.text()` with no deadline — hung streams keep Assist stuck on “thinking”.
    const text = await res.text();
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      const needsAppUrl =
        Platform.OS !== 'web' && !readConfiguredAppUrl();
      throw new Error(
        needsAppUrl
          ? `Chat server returned non-JSON (${res.status}). Set EXPO_PUBLIC_APP_URL to your Vercel URL in .env and rebuild the app.`
          : res.status === 404
            ? `Chat API returned 404 at ${url}. If you are on the deployed site, check Vercel: Root Directory = repo root (not "dist"), then redeploy. If you are on localhost, set EXPO_PUBLIC_APP_URL in .env.`
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
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('The assistant took too long to respond. Please try again.');
    }
    if (e instanceof Error) {
      throw e;
    }
    throw new Error(
      'Could not reach the chat server. If you use the app on a phone or simulator, set EXPO_PUBLIC_APP_URL in .env to your live site (https://….vercel.app), then rebuild.'
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
