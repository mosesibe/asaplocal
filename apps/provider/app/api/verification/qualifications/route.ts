import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  categoryId: z.string().optional(),
  issuingBody: z.string().optional(),
  certificateNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  documentUrl: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "Complete onboarding first" }, { status: 400 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 422 });

  const qualification = await prisma.qualification.create({
    data: {
      businessId: business.id,
      name: parsed.data.name,
      categoryId: parsed.data.categoryId,
      issuingBody: parsed.data.issuingBody,
      certificateNumber: parsed.data.certificateNumber,
      expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : undefined,
      documentUrl: parsed.data.documentUrl,
      status: "PENDING",
    },
  });

  return NextResponse.json({ id: qualification.id }, { status: 201 });
}
