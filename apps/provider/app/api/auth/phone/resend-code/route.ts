import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { checkRateLimit, sendPhoneVerificationCode } from "@asaplocal/core";

// Same shape as registration's own phone validation (apps/provider/app/api/auth/register/route.ts).
const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s()-]{7,20}$/, "Enter a valid phone number");

// Also doubles as "change my phone number" — if the caller passes a `phone`
// that differs from what's on file (e.g. they mistyped it at registration),
// sendPhoneVerificationCode() updates User.phone to it before texting the
// code, same as it does for a first-time send.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    await checkRateLimit("phone-verify-send", session.user.id, 5, 3600);
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  let phone: string;
  if (body?.phone !== undefined) {
    const parsed = phoneSchema.safeParse(body.phone);
    if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Enter a valid phone number" }, { status: 422 });
    phone = parsed.data;
  } else {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { phone: true } });
    if (!user?.phone) return NextResponse.json({ message: "No phone number on file" }, { status: 400 });
    phone = user.phone;
  }

  try {
    await sendPhoneVerificationCode(session.user.id, phone);
  } catch (e) {
    const status = (e as Error & { statusCode?: number }).statusCode ?? 500;
    return NextResponse.json({ message: (e as Error).message ?? "Something went wrong" }, { status });
  }
  return NextResponse.json({ sent: true, phone });
}
