/**
 * Lightweight CSRF defence for state-changing API routes.
 *
 * We use JWT session cookies (SameSite=Lax via NextAuth defaults), which
 * already blocks cross-site form POSTs from sending cookies in most cases.
 * As defence in depth, mutating routes should also call verifyOrigin() to
 * reject requests whose Origin/Referer doesn't match our own app origin —
 * this catches edge cases (older browsers, SameSite=None misconfig) that
 * cookie policy alone doesn't cover. Webhook routes (Stripe) are exempt:
 * they're authenticated via HMAC signature instead, and intentionally
 * don't send cookies at all.
 */
export function verifyOrigin(req: Request, allowedOrigins: string[]): void {
  const origin = req.headers.get("origin") ?? req.headers.get("referer");
  if (!origin) return; // same-origin navigations and non-browser clients (server-to-server, curl) don't send Origin; rely on auth() session check instead
  const isAllowed = allowedOrigins.some((allowed) => origin.startsWith(allowed));
  if (!isAllowed) {
    const err = new Error("Cross-origin request blocked");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).statusCode = 403;
    throw err;
  }
}
