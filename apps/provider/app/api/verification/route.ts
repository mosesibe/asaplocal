import { NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";

// Rolls up a list of individual VerificationStatus values into one status
// for the summary row: complete only once everything submitted has been
// verified, surfaced as rejected/more-info-needed if any one item is, and
// pending otherwise (covers a mix of UNVERIFIED/PENDING items).
// Mirrors apps/provider/app/verification/page.tsx's aggregateStatus().
function aggregateStatus(statuses: (string | null | undefined)[]): string | null {
  const present = statuses.filter((s): s is string => !!s);
  if (present.length === 0) return null;
  if (present.every((s) => s === "VERIFIED")) return "VERIFIED";
  if (present.some((s) => s === "REJECTED")) return "REJECTED";
  if (present.some((s) => s === "MORE_INFO_REQUESTED")) return "MORE_INFO_REQUESTED";
  return "PENDING";
}

// JSON counterpart to /verification (a server component that queries Prisma
// directly) — the mobile Verification centre hub reads this to render its
// trust-tier banner and 8 section rows.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({
    where: { ownerId: session.user.id },
    include: { identityVerification: true, insurancePolicies: true, qualifications: true, portfolioItems: true, references: true },
  });
  if (!business) return NextResponse.json({ message: "No business profile found" }, { status: 404 });

  const publicLiability = business.insurancePolicies.find((p) => p.type === "PUBLIC_LIABILITY");
  // References uses its own ReferenceStatus enum (REQUESTED/VERIFIED/EXPIRED)
  // rather than VerificationStatus — at least one verified referee is enough
  // to consider the section complete.
  const referencesStatus = business.references.length === 0 ? null : business.references.some((r) => r.status === "VERIFIED") ? "VERIFIED" : "PENDING";

  const sections = [
    { key: "identity", href: "/verification/identity", label: "Identity", status: business.identityVerification?.status ?? null },
    { key: "business", href: "/verification/business", label: "Business", status: business.verificationStatus },
    {
      key: "qualifications",
      href: "/verification/qualifications",
      label: "Qualifications",
      status: aggregateStatus(business.qualifications.map((q) => q.status)),
    },
    { key: "insurance", href: "/verification/insurance", label: "Insurance", status: publicLiability?.status ?? null },
    { key: "banking", href: "/verification/banking", label: "Banking", status: business.payoutsEnabled ? "VERIFIED" : null },
    { key: "profile", href: "/profile", label: "Profile", status: business.profileCompletedAt ? "VERIFIED" : null },
    { key: "portfolio", href: "/portfolio", label: "Portfolio", status: business.portfolioItems.length > 0 ? "VERIFIED" : null },
    { key: "references", href: "/references", label: "References", status: referencesStatus },
  ];

  return NextResponse.json({ trustTier: business.trustTier, sections });
}
