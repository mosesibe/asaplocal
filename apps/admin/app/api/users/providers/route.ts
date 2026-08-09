import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { writeAuditLog, createAndSendProviderAccountInviteEmail } from "@asaplocal/core";

const schema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s()-]{7,20}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  const { email, firstName, lastName } = parsed.data;
  const phone = parsed.data.phone || undefined;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ message: "An account with this email already exists" }, { status: 409 });

  if (phone) {
    const phoneOwner = await prisma.user.findUnique({ where: { phone } });
    if (phoneOwner) return NextResponse.json({ message: "That phone number is already registered to another account" }, { status: 409 });
  }

  // Unguessable placeholder — never revealed to anyone. The account is only
  // usable once the invite email's link is used to set a real password.
  const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
  const user = await prisma.user.create({
    data: {
      email,
      phone,
      passwordHash,
      role: "PROVIDER",
      status: "PENDING_VERIFICATION",
      providerSince: new Date(),
      // Admin manually entered/vetted this email — skip the self-serve
      // verify-email step so the invite link drops them straight into
      // password setup, then onboarding.
      emailVerified: new Date(),
      profile: { create: { firstName, lastName } },
    },
  });

  await createAndSendProviderAccountInviteEmail(user.id, email, process.env.NEXT_PUBLIC_PROVIDER_URL!);
  await writeAuditLog({
    actorId: session.user.id,
    actorRole: "ADMIN",
    action: "user.create_provider",
    targetType: "User",
    targetId: user.id,
    metadata: { email },
  });

  return NextResponse.json({ id: user.id }, { status: 201 });
}
