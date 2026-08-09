import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@asaplocal/db";
import { checkRateLimit, createAndSendVerificationEmail, sendPhoneVerificationCode, recordReferral } from "@asaplocal/core";

// Bumping this string re-prompts every provider to accept terms again next
// time they hit a flow that checks termsVersion (none does yet — reserved).
const TERMS_VERSION = "2026-08-04";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s()-]{7,20}$/, "Enter a valid phone number"),
  termsAccepted: z.literal(true, { message: "You must agree to the Terms & Privacy Policy" }),
  // Only sent on the second submission, once we've told the client this
  // email already belongs to a customer account — proves they own it
  // instead of silently taking over an existing account.
  confirmPassword: z.string().min(1).optional(),
  ref: z.string().nullish(),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  try {
    await checkRateLimit("provider-register", ip, 8, 3600);
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  const { email, phone } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email }, include: { business: { select: { id: true } } } });

  if (existing) {
    const alreadyProvider = existing.role !== "CUSTOMER" || !!existing.business || !!existing.providerSince;
    if (alreadyProvider) {
      return NextResponse.json({ message: "An account with this email already exists — log in instead." }, { status: 409 });
    }

    if (!parsed.data.confirmPassword) {
      return NextResponse.json(
        { code: "EXISTING_CUSTOMER", message: "You already have a customer account with this email. Confirm your password to add provider access to it." },
        { status: 409 }
      );
    }
    if (!existing.passwordHash) {
      return NextResponse.json(
        { message: "That account signs in with Google. Log in with Google on the customer site first, then come back here." },
        { status: 409 }
      );
    }
    const valid = await bcrypt.compare(parsed.data.confirmPassword, existing.passwordHash);
    if (!valid) return NextResponse.json({ message: "Incorrect password" }, { status: 401 });

    const phoneOwner = await prisma.user.findUnique({ where: { phone } });
    if (phoneOwner && phoneOwner.id !== existing.id) {
      return NextResponse.json({ message: "That phone number is already registered to another account." }, { status: 409 });
    }

    await prisma.user.update({
      where: { id: existing.id },
      data: {
        providerSince: new Date(),
        ...(existing.termsAcceptedAt ? {} : { termsAcceptedAt: new Date(), termsVersion: TERMS_VERSION }),
      },
    });

    const phoneAlreadyVerified = existing.phone === phone && !!existing.phoneVerifiedAt;
    if (!phoneAlreadyVerified) {
      await prisma.user.update({ where: { id: existing.id }, data: { phoneVerifiedAt: null } });
      await sendPhoneVerificationCode(existing.id, phone);
    }
    if (!existing.emailVerified) {
      await createAndSendVerificationEmail(existing, process.env.NEXT_PUBLIC_PROVIDER_URL!, "Verify your AsapLocal Business account");
    }

    return NextResponse.json({ id: existing.id, merged: true }, { status: 200 });
  }

  const phoneOwner = await prisma.user.findUnique({ where: { phone } });
  if (phoneOwner) return NextResponse.json({ message: "That phone number is already registered to another account." }, { status: 409 });

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: "PROVIDER",
      status: "PENDING_VERIFICATION",
      providerSince: new Date(),
      termsAcceptedAt: new Date(),
      termsVersion: TERMS_VERSION,
      profile: { create: { firstName: parsed.data.firstName, lastName: parsed.data.lastName } },
    },
  });

  if (parsed.data.ref) await recordReferral(user.id, parsed.data.ref).catch(() => {});

  await createAndSendVerificationEmail(user, process.env.NEXT_PUBLIC_PROVIDER_URL!, "Verify your AsapLocal Business account");
  await sendPhoneVerificationCode(user.id, phone);

  return NextResponse.json({ id: user.id }, { status: 201 });
}
