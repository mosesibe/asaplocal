import { NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { computeBadges } from "@asaplocal/core";

// JSON counterpart to /profile/preview (a server component that queries
// Prisma directly) — needed for the mobile app's read-only listing preview,
// which has no server component to fetch this in. Mirrors the same reads
// and derived badges as the web page.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({
    where: { ownerId: session.user.id },
    include: {
      services: { where: { isActive: true }, include: { category: true } },
      identityVerification: true,
      insurancePolicies: true,
      qualifications: true,
    },
  });
  if (!business) return NextResponse.json({ message: "No business profile found" }, { status: 404 });

  const badges = computeBadges(business);

  return NextResponse.json({
    name: business.name,
    slug: business.slug,
    city: business.city,
    baseRadiusMiles: business.baseRadiusMiles,
    logoUrl: business.logoUrl,
    coverImageUrl: business.coverImageUrl,
    isFeatured: business.isFeatured,
    description: business.description ?? "",
    avgRating: Number(business.avgRating),
    reviewCount: business.reviewCount,
    completedJobsCount: business.completedJobsCount,
    avgResponseMins: business.avgResponseMins,
    responseRatePct: Number(business.responseRatePct),
    yearsInBusiness: business.yearsInBusiness,
    badges,
    services: business.services.map((s) => ({
      id: s.id,
      title: s.title,
      categoryName: s.category.name,
      priceType: s.priceType,
      priceMinPence: s.priceMinPence,
      priceMaxPence: s.priceMaxPence,
    })),
  });
}
