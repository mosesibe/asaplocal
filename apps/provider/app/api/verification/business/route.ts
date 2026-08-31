import { NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";

// JSON counterpart to /verification/business (a server component that
// queries Prisma directly) — full page state for the mobile business
// verification screen (Companies House auto-check form or manual document
// uploads, depending on businessType).
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({
    where: { ownerId: session.user.id },
    include: { verificationDocuments: true },
  });
  if (!business) return NextResponse.json({ message: "No business profile found" }, { status: 404 });

  return NextResponse.json({
    businessType: business.businessType,
    verificationStatus: business.verificationStatus,
    companyRegistrationNumber: business.companyRegistrationNumber,
    companyDirectorName: business.companyDirectorName,
    companiesHouseDirectorMatch: business.companiesHouseDirectorMatch,
    verificationDocuments: business.verificationDocuments.map((d) => ({ id: d.id, docType: d.docType, fileUrl: d.fileUrl })),
  });
}
