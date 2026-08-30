import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@asaplocal/db";
import { auth } from "@asaplocal/auth";
import { computeBadges, milesBetween, businessTypeLabel } from "@asaplocal/core";

const NEARBY_RADIUS_MILES = 25;

// JSON counterpart to /providers/[slug] (a server component that queries
// Prisma directly) — no such route existed for mobile before. Mirrors the
// same Prisma query/derived fields (badges, similar businesses) as plain
// JSON. Public — the web page itself works signed-out; `isFavourited` is
// just false when there's no session.
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const preview = req.nextUrl.searchParams.get("preview");

  const biz = await prisma.business.findUnique({
    where: { slug },
    include: {
      services: { where: { isActive: true }, include: { category: true } },
      reviews: { where: { status: "PUBLISHED" }, orderBy: { createdAt: "desc" }, take: 20, include: { author: { include: { profile: true } } } },
      identityVerification: true,
      insurancePolicies: true,
      qualifications: true,
    },
  });
  if (!biz) return NextResponse.json({ message: "Not found" }, { status: 404 });

  if (preview !== "1") {
    await prisma.business.update({ where: { id: biz.id }, data: { profileViews: { increment: 1 } } }).catch(() => {});
  }

  const session = await auth();
  const isFavourited = session?.user
    ? !!(await prisma.favourite.findUnique({ where: { customerId_businessId: { customerId: session.user.id, businessId: biz.id } } }))
    : false;

  const primaryCategorySlug = biz.services[0]?.category.slug;
  const similarBusinessesRaw = await prisma.business.findMany({
    where: {
      id: { not: biz.id },
      verificationStatus: { in: ["VERIFIED", "PENDING"] },
      ...(primaryCategorySlug ? { services: { some: { isActive: true, category: { slug: primaryCategorySlug } } } } : { city: biz.city }),
    },
    include: { services: { where: { isActive: true }, include: { category: true }, take: 1 } },
    orderBy: [{ isFeatured: "desc" }, { avgRating: "desc" }],
    take: 20,
  });
  const similarBusinesses = similarBusinessesRaw
    .filter((b) => milesBetween(Number(biz.lat), Number(biz.lng), Number(b.lat), Number(b.lng)) <= NEARBY_RADIUS_MILES)
    .slice(0, 6)
    .map((b) => ({
      slug: b.slug,
      name: b.name,
      logoUrl: b.logoUrl,
      city: b.city,
      avgRating: Number(b.avgRating),
      reviewCount: b.reviewCount,
      completedJobsCount: b.completedJobsCount,
      isFeatured: b.isFeatured,
      verificationStatus: b.verificationStatus,
      categoryName: b.services[0]?.category.name,
      fromPricePence: b.services[0]?.priceMinPence,
    }));

  const badges = computeBadges(biz);
  const workingHours = (biz.workingHours as Record<string, { open: string; close: string } | null> | null) ?? null;

  return NextResponse.json({
    id: biz.id,
    slug: biz.slug,
    name: biz.name,
    logoUrl: biz.logoUrl,
    coverImageUrl: biz.coverImageUrl,
    city: biz.city,
    baseRadiusMiles: biz.baseRadiusMiles,
    avgRating: Number(biz.avgRating),
    reviewCount: biz.reviewCount,
    isFeatured: biz.isFeatured,
    isFavourited,
    badges,
    stats: {
      completedJobsCount: biz.completedJobsCount,
      avgResponseMins: biz.avgResponseMins,
      responseRatePct: biz.responseRatePct,
      yearsInBusiness: biz.yearsInBusiness,
    },
    description: biz.description,
    workingHours,
    languagesSpoken: biz.languagesSpoken,
    emergencyCalloutsAvailable: biz.emergencyCalloutsAvailable,
    services: biz.services.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      categoryName: s.category.name,
      priceType: s.priceType,
      priceMinPence: s.priceMinPence,
      priceMaxPence: s.priceMaxPence,
    })),
    qualifications: biz.qualifications.map((q) => ({ id: q.id, name: q.name, status: q.status })),
    reviews: biz.reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      photos: r.photos,
      authorName: r.author.profile ? `${r.author.profile.firstName} ${r.author.profile.lastName[0] ?? ""}.` : "Customer",
      createdAt: r.createdAt,
      providerResponse: r.providerResponse,
    })),
    companyInfo: {
      companyDirectorName: biz.companyDirectorName,
      businessTypeLabel: businessTypeLabel(biz.businessType),
      tradingName: biz.tradingName !== biz.name ? biz.tradingName : null,
      companyRegistrationNumber: biz.companyRegistrationNumber,
      vatNumber: biz.vatNumber,
      employeeCount: biz.employeeCount,
    },
    insurancePolicies: biz.insurancePolicies.map((p) => ({
      id: p.id,
      type: p.type,
      status: p.status,
      provider: p.provider,
      coverageAmountPence: p.coverageAmountPence,
    })),
    photoUrls: biz.photoUrls,
    similarBusinesses,
  });
}
