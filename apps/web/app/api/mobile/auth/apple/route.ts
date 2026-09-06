import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAppleIdentityToken, findOrCreateOAuthUser, loadMobileTokenUser, createMobileSession } from "@asaplocal/auth";
import { checkRateLimit } from "@asaplocal/core";

// Mobile counterpart to next-auth's Apple provider: expo-apple-authentication
// hands the app an identityToken directly (no browser redirect), so this
// verifies it server-side and mints the same Bearer token pair
// login/route.ts does. See packages/auth/src/oauth-mobile.ts.
//
// The expected `aud` is this app's *mobile* bundle id (pro.asaplocal.customer)
// — distinct from AUTH_APPLE_ID, the web Services ID used for the browser
// OAuth flow's callback.
const APPLE_BUNDLE_ID = "pro.asaplocal.customer";

const schema = z.object({
  identityToken: z.string().min(1),
  fullName: z.object({ givenName: z.string().nullish(), familyName: z.string().nullish() }).nullish(),
  deviceInfo: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  try {
    await checkRateLimit("mobile-oauth", ip, 10, 300);
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Missing identityToken." }, { status: 422 });

  let identity;
  try {
    identity = await verifyAppleIdentityToken(parsed.data.identityToken, APPLE_BUNDLE_ID, parsed.data.fullName);
  } catch {
    return NextResponse.json({ message: "Invalid Apple sign-in." }, { status: 401 });
  }

  const account = await findOrCreateOAuthUser("apple", identity);
  const user = await loadMobileTokenUser(account.id);
  if (!user) return NextResponse.json({ message: "Account is suspended." }, { status: 403 });

  const tokens = await createMobileSession(user, parsed.data.deviceInfo);
  return NextResponse.json({ ...tokens, user });
}
