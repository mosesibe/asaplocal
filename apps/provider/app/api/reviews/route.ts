import { NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";

// JSON counterpart to /reviews (a server component that queries Prisma
// directly) — no such route existed for mobile before. Mirrors the same
// query/shape as the page: PUBLISHED + FLAGGED reviews, newest first.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "No business profile found" }, { status: 404 });

  const reviews = await prisma.review.findMany({
    where: { businessId: business.id, status: { in: ["PUBLISHED", "FLAGGED"] } },
    orderBy: { createdAt: "desc" },
    include: { author: { include: { profile: true } } },
  });

  return NextResponse.json({
    reviewCount: business.reviewCount,
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      authorName: `${r.author.profile?.firstName ?? ""} ${r.author.profile?.lastName?.[0] ?? ""}.`.trim(),
      createdAt: r.createdAt.toISOString(),
      providerResponse: r.providerResponse,
    })),
  });
}
