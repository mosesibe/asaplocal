import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { z } from "zod";

const schema = z.object({
  docType: z.enum(["UTILITY_BILL", "BUSINESS_BANK_STATEMENT", "HMRC_CORRESPONDENCE", "PUBLIC_LIABILITY_INSURANCE", "OTHER"]),
  fileUrl: z.string().url(),
});

/** Sole-trader Phase-4 proof-of-trading upload — confirms a file already presigned-uploaded via /api/uploads. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "Complete onboarding first" }, { status: 400 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 422 });

  const doc = await prisma.businessVerificationDocument.create({
    data: { businessId: business.id, docType: parsed.data.docType, fileUrl: parsed.data.fileUrl },
  });

  // At least one document submitted — put the business up for manual review
  // if it isn't already verified/under review.
  if (business.verificationStatus === "UNVERIFIED" || business.verificationStatus === "REJECTED") {
    await prisma.business.update({ where: { id: business.id }, data: { verificationStatus: "PENDING" } });
  }

  return NextResponse.json({ id: doc.id }, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ documents: [] });

  const documents = await prisma.businessVerificationDocument.findMany({ where: { businessId: business.id }, orderBy: { uploadedAt: "desc" } });
  return NextResponse.json({ documents });
}
