import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, consumePasswordResetToken } from "@asaplocal/core";

const schema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  try {
    await checkRateLimit("reset-password", ip, 10, 3600);
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });

  const result = await consumePasswordResetToken(parsed.data.email, parsed.data.token, parsed.data.password);
  if (!result.ok) {
    const message = result.reason === "expired" ? "This reset link has expired — request a new one." : "This reset link is invalid.";
    return NextResponse.json({ message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
