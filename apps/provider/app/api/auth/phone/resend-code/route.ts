import { NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { checkRateLimit, sendPhoneVerificationCode } from "@asaplocal/core";

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    await checkRateLimit("phone-verify-send", session.user.id, 5, 3600);
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { phone: true } });
  if (!user?.phone) return NextResponse.json({ message: "No phone number on file" }, { status: 400 });

  await sendPhoneVerificationCode(session.user.id, user.phone);
  return NextResponse.json({ sent: true });
}
