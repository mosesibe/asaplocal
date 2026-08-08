import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, createAndSendPasswordResetEmail } from "@asaplocal/core";

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  try {
    await checkRateLimit("forgot-password", ip, 5, 3600);
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Enter a valid email address" }, { status: 422 });

  await createAndSendPasswordResetEmail(parsed.data.email, process.env.NEXT_PUBLIC_PROVIDER_URL!);

  // Always report success — never reveal whether an account exists for this email.
  return NextResponse.json({ ok: true });
}
