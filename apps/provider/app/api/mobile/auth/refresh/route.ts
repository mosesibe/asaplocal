import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rotateMobileSession } from "@asaplocal/auth";
import { checkRateLimit } from "@asaplocal/core";

// Called when a mobile access token (15 min lifetime) has expired. Rotates
// the refresh token on every use — the old one is revoked immediately, so
// a stolen-and-replayed refresh token only works once before both the
// attacker and the legitimate device get a "session expired, please log
// back in" the next time either tries to use it.
const schema = z.object({ refreshToken: z.string().min(1) });

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  try {
    await checkRateLimit("mobile-refresh", ip, 30, 300);
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Missing refresh token." }, { status: 422 });

  const tokens = await rotateMobileSession(parsed.data.refreshToken);
  if (!tokens) return NextResponse.json({ message: "Session expired, please sign in again." }, { status: 401 });

  return NextResponse.json(tokens);
}
