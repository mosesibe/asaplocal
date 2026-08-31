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

// JSON counterpart to /verification/qualifications (a server component that
// queries Prisma directly). regulatedCategories mirrors the page's own
// derivation: categories this business actually offers services in that are
// flagged isRegulatedTrade, used for the category picker and the suggested-
// qualifications hint (Category.suggestedQualifications) — not all regulated
// categories platform-wide.
export async function GET() {
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({
    where: { ownerId: session.user.id },
    include: { qualifications: true, services: { include: { category: true } } },
  });
  if (!business) return NextResponse.json({ message: "No business profile found" }, { status: 404 });

  const regulatedCategoriesMap = new Map(
    business.services.map((s) => s.category).filter((c) => c.isRegulatedTrade).map((c) => [c.id, c]),
  );
  const regulatedCategories = Array.from(regulatedCategoriesMap.values());

  return NextResponse.json({
    qualifications: business.qualifications.map((q) => ({ id: q.id, name: q.name, status: q.status, issuingBody: q.issuingBody, documentUrl: q.documentUrl })),
    regulatedCategories: regulatedCategories.map((c) => ({ id: c.id, name: c.name, suggestedQualifications: c.suggestedQualifications })),
  });
}
