import { NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { checkRateLimit, createAndSendVerificationEmail } from "@asaplocal/core";

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    await checkRateLimit("email-verify-resend", session.user.id, 5, 3600);
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true, emailVerified: true } });
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (user.emailVerified) return NextResponse.json({ sent: false, alreadyVerified: true });

  await createAndSendVerificationEmail(user, process.env.NEXT_PUBLIC_PROVIDER_URL!, "Verify your AsapLocal Business account");
  return NextResponse.json({ sent: true });
}
