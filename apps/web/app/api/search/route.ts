import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@asaplocal/db";
import { milesBetween } from "@asaplocal/core";

// JSON counterpart to /search (a server component that queries Prisma
// directly) — the mobile app has no server components, so this mirrors the
// exact same query/filters as plain JSON. No auth() call: search/page.tsx
// itself is public (usable signed-out on web), so this stays public too.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const category = sp.get("category") ?? undefined;
  const city = sp.get("city") ?? undefined;
  const minRating = sp.get("minRating") ? Number(sp.get("minRating")) : undefined;
  const minPrice = sp.get("minPrice") ? Number(sp.get("minPrice")) * 100 : undefined;
  const maxPrice = sp.get("maxPrice") ? Number(sp.get("maxPrice")) * 100 : undefined;
  const radius = sp.get("radius") ? Number(sp.get("radius")) : 25;
  const lat = sp.get("lat") ? Number(sp.get("lat")) : undefined;
  const lng = sp.get("lng") ? Number(sp.get("lng")) : undefined;

  let businesses = await prisma.business.findMany({
    where: {
      ...(city ? { city: { equals: city, mode: "insensitive" } } : {}),
      ...(minRating ? { avgRating: { gte: minRating } } : {}),
      verificationStatus: { in: ["VERIFIED", "PENDING"] },
      services: {
        some: {
          isActive: true,
          ...(category ? { category: { slug: category } } : {}),
          ...(minPrice ? { priceMinPence: { gte: minPrice } } : {}),
          ...(maxPrice ? { priceMaxPence: { lte: maxPrice } } : {}),
        },
      },
    },
    include: { services: { include: { category: true }, take: 1 } },
    orderBy: [{ isFeatured: "desc" }, { avgRating: "desc" }],
    take: 40,
  });

  if (lat !== undefined && lng !== undefined) {
    businesses = businesses.filter((b) => milesBetween(lat, lng, Number(b.lat), Number(b.lng)) <= radius);
  }

  return NextResponse.json({
    businesses: businesses.map((biz) => ({
      slug: biz.slug,
      name: biz.name,
      logoUrl: biz.logoUrl,
      city: biz.city,
      avgRating: Number(biz.avgRating),
      reviewCount: biz.reviewCount,
      completedJobsCount: biz.completedJobsCount,
      isFeatured: biz.isFeatured,
      verificationStatus: biz.verificationStatus,
      categoryName: biz.services[0]?.category.name,
      fromPricePence: biz.services[0]?.priceMinPence,
    })),
  });
}
