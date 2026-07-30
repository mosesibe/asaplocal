import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@asaplocal/db";
import { checkRateLimit, createAndSendVerificationEmail } from "@asaplocal/core";

const schema = z.object({ email: z.string().email(), password: z.string().min(8), firstName: z.string().min(1), lastName: z.string().min(1) });

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  try {
    await checkRateLimit("provider-register", ip, 8, 3600);
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 422 });

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return NextResponse.json({ message: "An account with this email already exists" }, { status: 409 });

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      passwordHash,
      role: "PROVIDER",
      status: "PENDING_VERIFICATION",
      profile: { create: { firstName: parsed.data.firstName, lastName: parsed.data.lastName } },
    },
  });

  await createAndSendVerificationEmail(user, process.env.NEXT_PUBLIC_PROVIDER_URL!, "Verify your AsapLocal Business account");

  return NextResponse.json({ id: user.id }, { status: 201 });
}
