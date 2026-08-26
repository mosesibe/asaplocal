import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyCredentials, createMobileSession } from "@asaplocal/auth";
import { checkRateLimit } from "@asaplocal/core";

// Mobile-only counterpart to the web Credentials sign-in flow: same
// email/password check (verifyCredentials), but returns a Bearer access +
// refresh token pair instead of a Set-Cookie session, since the native app
// has no cookie jar shared with a browser. See packages/auth/src/bearer.ts
// for how existing API routes accept the resulting access token.
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  deviceInfo: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  try {
    await checkRateLimit("mobile-login", ip, 10, 300); // 10 attempts per 5 minutes per IP
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Enter a valid email and password." }, { status: 422 });

  const user = await verifyCredentials(parsed.data.email, parsed.data.password);
  if (!user) return NextResponse.json({ message: "Incorrect email or password." }, { status: 401 });

  const tokens = await createMobileSession(user, parsed.data.deviceInfo);
  return NextResponse.json({ ...tokens, user });
}
