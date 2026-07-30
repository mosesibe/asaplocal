import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@asaplocal/db";
import { checkRateLimit, createAndSendVerificationEmail, recordReferral } from "@asaplocal/core";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s()-]{7,20}$/, "Enter a valid phone number"),
  ref: z.string().nullish(),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  try {
    await checkRateLimit("register", ip, 8, 3600);
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input", issues: parsed.error.flatten() }, { status: 422 });

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return NextResponse.json({ message: "An account with this email already exists" }, { status: 409 });

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      phone: parsed.data.phone,
      passwordHash,
      role: "CUSTOMER",
      status: "PENDING_VERIFICATION",
      profile: { create: { firstName: parsed.data.firstName, lastName: parsed.data.lastName } },
    },
  });

  if (parsed.data.ref) await recordReferral(user.id, parsed.data.ref).catch(() => {});

  await createAndSendVerificationEmail(user, process.env.NEXT_PUBLIC_WEB_URL!, "Verify your AsapLocal account");

  return NextResponse.json({ id: user.id }, { status: 201 });
}
