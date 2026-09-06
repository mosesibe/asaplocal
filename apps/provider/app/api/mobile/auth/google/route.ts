import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { findOrCreateOAuthUser, loadMobileTokenUser, createMobileSession } from "@asaplocal/auth";
import { verifyGoogleIdToken } from "@asaplocal/auth/src/google-verify";
import { checkRateLimit } from "@asaplocal/core";

// Mobile counterpart to next-auth's Google provider: the native Google
// Sign-In SDK hands the app a Google idToken directly (no browser redirect),
// so this verifies it server-side and mints the same Bearer token pair
// login/route.ts does. See packages/auth/src/oauth-mobile.ts.
const schema = z.object({
  idToken: z.string().min(1),
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
  if (!parsed.success) return NextResponse.json({ message: "Missing idToken." }, { status: 422 });

  let identity;
  try {
    identity = await verifyGoogleIdToken(parsed.data.idToken, process.env.GOOGLE_CLIENT_ID!);
  } catch {
    return NextResponse.json({ message: "Invalid Google sign-in." }, { status: 401 });
  }

  const account = await findOrCreateOAuthUser("google", identity);
  const user = await loadMobileTokenUser(account.id);
  if (!user) return NextResponse.json({ message: "Account is suspended." }, { status: 403 });

  const tokens = await createMobileSession(user, parsed.data.deviceInfo);
  return NextResponse.json({ ...tokens, user });
}
