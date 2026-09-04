import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { verifyLimitedCompany, recomputeTrustTier } from "@asaplocal/core";
import { z } from "zod";

const schema = z.object({ companyNumber: z.string().min(1), directorName: z.string().min(1) });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "Complete onboarding first" }, { status: 400 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 422 });

  const result = await verifyLimitedCompany(parsed.data.companyNumber, parsed.data.directorName).catch((err) => {
    console.error("[companies-house] lookup failed", err);
    return null;
  });
  if (!result) return NextResponse.json({ message: "Couldn't find that company number — check it and try again." }, { status: 400 });

  // Auto-verify only when every check passes; otherwise leave it PENDING for
  // a human admin — never auto-reject a real company over e.g. a name-format
  // mismatch (Companies House returns "SURNAME, Forename"). A possible
  // disqualification match always forces PENDING, even if everything else
  // passes — name-only matching has false positives, so it must always get
  // a human look rather than being an auto-block.
  const passed = result.isActive && result.notDissolved && result.directorMatch && !result.possibleDirectorDisqualification;

  await prisma.business.update({
    where: { id: business.id },
    data: {
      companyRegistrationNumber: parsed.data.companyNumber,
      companyDirectorName: parsed.data.directorName,
      companiesHouseSnapshot: result.snapshot as any,
      companiesHouseCheckedAt: new Date(),
      companiesHouseDirectorMatch: result.directorMatch,
      companyIncorporatedAt: result.companyIncorporatedAt ? new Date(result.companyIncorporatedAt) : null,
      possibleDirectorDisqualification: result.possibleDirectorDisqualification,
      verificationStatus: passed ? "VERIFIED" : "PENDING",
      verifiedAt: passed ? new Date() : null,
    },
  });
  await recomputeTrustTier(business.id);

  return NextResponse.json({
    isActive: result.isActive,
    notDissolved: result.notDissolved,
    directorMatch: result.directorMatch,
    possibleDirectorDisqualification: result.possibleDirectorDisqualification,
    companyStatus: result.companyStatus,
    verified: passed,
  });
}
