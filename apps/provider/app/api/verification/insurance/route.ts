import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { z } from "zod";

const schema = z.object({
  type: z.enum(["PUBLIC_LIABILITY", "PROFESSIONAL_INDEMNITY", "EMPLOYERS_LIABILITY"]),
  provider: z.string().min(1),
  policyNumber: z.string().min(1),
  expiryDate: z.string(),
  coverageAmountPence: z.coerce.number().int().min(0),
  documentUrl: z.string().url(),
});

/** Upserts by (businessId, type) — a renewal replaces the previous submission in place and goes back to PENDING for re-review. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "Complete onboarding first" }, { status: 400 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 422 });
  const data = parsed.data;

  const policy = await prisma.insurancePolicy.upsert({
    where: { businessId_type: { businessId: business.id, type: data.type } },
    update: {
      provider: data.provider,
      policyNumber: data.policyNumber,
      expiryDate: new Date(data.expiryDate),
      coverageAmountPence: data.coverageAmountPence,
      documentUrl: data.documentUrl,
      status: "PENDING",
      verifiedAt: null,
      reviewNote: null,
    },
    create: {
      businessId: business.id,
      type: data.type,
      provider: data.provider,
      policyNumber: data.policyNumber,
      expiryDate: new Date(data.expiryDate),
      coverageAmountPence: data.coverageAmountPence,
      documentUrl: data.documentUrl,
      status: "PENDING",
    },
  });

  return NextResponse.json({ id: policy.id }, { status: 201 });
}
