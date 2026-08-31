import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { suggestServiceDuration } from "@asaplocal/core";

const schema = z.object({
  categorySlugs: z.array(z.string().min(1)).min(1, "Choose at least one service"),
});

// JSON counterpart to /services (a server component that queries Prisma
// directly) — needed for the mobile app's services manager, which has no
// server component to fetch this in. Categories are fetched separately via
// the existing GET /api/categories, so they're not duplicated here.
export async function GET() {
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "No business profile found" }, { status: 404 });

  const services = await prisma.service.findMany({
    where: { businessId: business.id },
    include: { category: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    services: services.map((s) => ({
      id: s.id,
      title: s.title,
      categoryId: s.categoryId,
      categoryName: s.category.name,
      isActive: s.isActive,
      durationMins: s.durationMins,
      aiSuggestedDurationMins: s.aiSuggestedDurationMins,
      priceType: s.priceType,
      priceMinPence: s.priceMinPence,
      priceMaxPence: s.priceMaxPence,
    })),
  });
}

/** Adds categories to the business's listing. Re-activates any it previously paused. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "No business profile found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });

  const categories = await prisma.category.findMany({ where: { slug: { in: parsed.data.categorySlugs }, isActive: true } });
  if (categories.length !== parsed.data.categorySlugs.length) {
    return NextResponse.json({ message: "Unknown category" }, { status: 400 });
  }

  const existing = await prisma.service.findMany({
    where: { businessId: business.id, categoryId: { in: categories.map((c) => c.id) } },
  });
  const existingByCategory = new Map(existing.map((s) => [s.categoryId, s]));

  const created = [];
  for (const category of categories) {
    const already = existingByCategory.get(category.id);
    if (already) {
      // Re-adding a category they'd paused simply un-pauses it.
      if (!already.isActive) {
        await prisma.service.update({ where: { id: already.id }, data: { isActive: true } });
      }
      continue;
    }
    const title = `${category.name} services`;
    const { durationMins } = await suggestServiceDuration(title, category.name).catch(() => ({ durationMins: null }));
    created.push(
      await prisma.service.create({
        data: {
          businessId: business.id,
          categoryId: category.id,
          title,
          priceType: "QUOTE_ONLY",
          aiSuggestedDurationMins: durationMins,
        },
      })
    );
  }

  return NextResponse.json({ added: created.length }, { status: 201 });
}
