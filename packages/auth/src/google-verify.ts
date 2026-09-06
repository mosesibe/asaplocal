import { OAuth2Client } from "google-auth-library";
import type { VerifiedOAuthIdentity } from "./oauth-mobile";

/**
 * Split out of oauth-mobile.ts and deliberately NOT re-exported from
 * ./index.ts: google-auth-library pulls in gcp-metadata -> google-logging-utils,
 * which imports Node's `node:process` via the explicit "node:" URI scheme.
 * That's fine in the Node runtime the mobile Google route handler runs in,
 * but if it were reachable through the package's main barrel it would also
 * get pulled into the Edge-runtime bundle for middleware.ts (which imports
 * `authMiddleware` from the same barrel) — and Next's Edge webpack config
 * only special-cases "data:"/"file:" schemes, so an explicit "node:" import
 * fails the build outright rather than merely being unavailable at runtime.
 * Import this file directly (not via "@asaplocal/auth") to keep it out of
 * any bundle that also needs to stay Edge-safe.
 */
let googleClient: OAuth2Client | null = null;

/**
 * `audience` is the app's existing web OAuth client id (GOOGLE_CLIENT_ID) —
 * the native Google Sign-In SDKs are configured with that same id as their
 * `webClientId`, which is what ends up as the idToken's `aud` claim on both
 * iOS and Android, not a mobile-specific client id.
 */
export async function verifyGoogleIdToken(idToken: string, audience: string): Promise<VerifiedOAuthIdentity> {
  googleClient ??= new OAuth2Client();
  const ticket = await googleClient.verifyIdToken({ idToken, audience });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) throw new Error("Invalid Google token");
  if (!payload.email_verified) throw new Error("Google account email is not verified");
  return { providerAccountId: payload.sub, email: payload.email, name: payload.name, image: payload.picture };
}
