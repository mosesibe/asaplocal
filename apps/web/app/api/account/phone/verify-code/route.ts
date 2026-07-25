import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";

const schema = z.object({ code: z.string().length(6) });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 422 });

  const entry = await prisma.phoneVerificationCode.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  if (!entry || entry.expiresAt < new Date()) {
    return NextResponse.json({ message: "Code expired — request a new one" }, { status: 410 });
  }
  if (entry.attempts >= 5) {
    return NextResponse.json({ message: "Too many attempts — request a new code" }, { status: 429 });
  }
  if (entry.code !== parsed.data.code) {
    await prisma.phoneVerificationCode.update({ where: { id: entry.id }, data: { attempts: { increment: 1 } } });
    return NextResponse.json({ message: "Incorrect code" }, { status: 422 });
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: session.user.id }, data: { phoneVerifiedAt: new Date() } }),
    prisma.phoneVerificationCode.deleteMany({ where: { userId: session.user.id } }),
  ]);

  return NextResponse.json({ verified: true });
}
