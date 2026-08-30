import { NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";

// JSON counterpart to /favourites (a server component that queries Prisma
// directly) — the mobile app has no server components, so this mirrors the
// exact same query/shape as plain JSON (same field set as /api/search's
// ProviderCard-shaped businesses).
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const favourites = await prisma.favourite.findMany({
    where: { customerId: session.user.id },
    include: { business: { include: { services: { include: { category: true }, take: 1 } } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    businesses: favourites.map(({ business: biz }) => ({
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
