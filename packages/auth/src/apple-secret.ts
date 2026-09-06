import { createSign } from "crypto";

/**
 * Auth.js's Apple provider wants `clientSecret` to already be a signed ES256
 * JWT (Apple's REST API rejects the raw private key). Rather than
 * hand-rotating that JWT every <=6 months the way Apple's own docs describe,
 * this builds and memoizes it at runtime from the long-lived team/key
 * credentials, using Node's built-in `crypto` (synchronous — no async
 * factory needed to slot this into the static NextAuth config object).
 *
 * Node-only (createSign isn't available in the Edge runtime), which is why
 * this is wired up in auth.ts rather than the edge-safe auth.config.ts — see
 * the comment on the Apple provider there.
 */
const MAX_AGE_SECONDS = 175 * 24 * 60 * 60; // Apple's cap is 6 months; stay under it
const REGEN_MARGIN_SECONDS = 24 * 60 * 60;

let cached: { secret: string; expiresAt: number } | null = null;

function base64url(input: Buffer): string {
  return input.toString("base64url");
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export function getAppleClientSecret(): string {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.expiresAt - now > REGEN_MARGIN_SECONDS) return cached.secret;

  const teamId = requiredEnv("APPLE_TEAM_ID");
  const keyId = requiredEnv("APPLE_KEY_ID");
  const clientId = requiredEnv("APPLE_CLIENT_ID");
  // .p8 contents — stored in env with literal "\n" escapes, unescaped here.
  const privateKey = requiredEnv("APPLE_PRIVATE_KEY").replace(/\\n/g, "\n");

  const iat = now;
  const exp = now + MAX_AGE_SECONDS;

  const header = { alg: "ES256", kid: keyId };
  const payload = {
    iss: teamId,
    iat,
    exp,
    aud: "https://appleid.apple.com",
    sub: clientId,
  };

  const signingInput = `${base64url(Buffer.from(JSON.stringify(header)))}.${base64url(Buffer.from(JSON.stringify(payload)))}`;
  // JWS requires the raw (r||s) signature format, not DER — dsaEncoding: "ieee-p1363" gives that directly.
  const signature = createSign("sha256").update(signingInput).sign({ key: privateKey, dsaEncoding: "ieee-p1363" });

  const secret = `${signingInput}.${base64url(signature)}`;
  cached = { secret, expiresAt: exp };
  return secret;
}
