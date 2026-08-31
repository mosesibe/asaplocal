import { useRouter } from 'expo-router';

import { useSession } from './session';

/**
 * Home, Search, and provider profiles are public (matching web — those
 * pages work signed-out too); only specific actions require an account
 * (posting a job, Studio, Activity, Account, favouriting, messaging). This
 * hook lets each of those call sites gate on demand: if signed in, runs
 * `whenAuthed` immediately; if not, sends the customer to log in first and
 * back to `loginCallbackPath` on success (see login.tsx's callbackUrl
 * handling) — mirroring web's `redirect(\`/login?callbackUrl=...\`)` pattern.
 * Rich prefill params (AI-suggested category, studio concept, etc.) aren't
 * preserved through the login detour — an accepted simplification, since
 * mobile requiring login before those specific actions is itself already a
 * deliberate deviation from web's anonymous-draft-then-signup flow.
 */
export function useRequireAuth() {
  const { user } = useSession();
  const router = useRouter();

  return function requireAuth(loginCallbackPath: string, whenAuthed: () => void) {
    if (user) {
      whenAuthed();
      return;
    }
    router.push({ pathname: '/login', params: { callbackUrl: loginCallbackPath } });
  };
}
