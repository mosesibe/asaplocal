import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomInt } from "crypto";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { checkRateLimit, sendSms } from "@asaplocal/core";

const schema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s()-]{7,20}$/, "Enter a valid phone number"),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    await checkRateLimit("phone-verify-send", session.user.id, 5, 3600);
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input", issues: parsed.error.flatten() }, { status: 422 });

  const code = randomInt(100000, 1000000).toString();
  await prisma.$transaction([
    prisma.phoneVerificationCode.deleteMany({ where: { userId: session.user.id } }),
    prisma.phoneVerificationCode.create({
      data: { userId: session.user.id, phone: parsed.data.phone, code, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
    }),
    prisma.user.update({ where: { id: session.user.id }, data: { phone: parsed.data.phone } }),
  ]);

  await sendSms({ to: parsed.data.phone, body: `Your AsapLocal verification code is ${code}. It expires in 10 minutes.` });

  return NextResponse.json({ sent: true });
}
