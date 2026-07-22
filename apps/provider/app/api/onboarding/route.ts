import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { geocodeAddress, stripHtml } from "@asaplocal/core";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  description: z.string().min(20),
  city: z.string().min(2),
  postcode: z.string().optional(),
  addressLine: z.string().optional(),
  categorySlug: z.string(),
  baseRadiusMiles: z.coerce.number().int().min(1).max(100).default(15),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PROVIDER") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const existing = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (existing) return NextResponse.json({ message: "Business already exists" }, { status: 409 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input", issues: parsed.error.flatten() }, { status: 422 });

  const category = await prisma.category.findUnique({ where: { slug: parsed.data.categorySlug } });
  if (!category) return NextResponse.json({ message: "Unknown category" }, { status: 400 });

  const geo = await geocodeAddress(`${parsed.data.addressLine ?? ""} ${parsed.data.postcode ?? ""} ${parsed.data.city}, UK`).catch(() => null);
  if (!geo) return NextResponse.json({ message: "Couldn't locate that address" }, { status: 400 });

  const slug = `${parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Math.random().toString(36).slice(2, 6)}`;

  const business = await prisma.business.create({
    data: {
      ownerId: session.user.id,
      name: stripHtml(parsed.data.name),
      slug,
      description: stripHtml(parsed.data.description),
      city: parsed.data.city,
      postcode: parsed.data.postcode,
      addressLine: parsed.data.addressLine,
      lat: geo.lat,
      lng: geo.lng,
      baseRadiusMiles: parsed.data.baseRadiusMiles,
      serviceAreas: { create: [{ city: parsed.data.city, lat: geo.lat, lng: geo.lng, radiusMiles: parsed.data.baseRadiusMiles }] },
      services: { create: [{ categoryId: category.id, title: `${category.name.slice(0, -1)} services`, priceType: "QUOTE_ONLY" }] },
      subscription: { create: { plan: "FREE", status: "ACTIVE", monthlyLeadAllowance: 0 } },
      leadCreditWallet: { create: { balance: 2 } }, // welcome credits
    },
  });

  await prisma.user.update({ where: { id: session.user.id }, data: { status: "ACTIVE" } });

  return NextResponse.json({ id: business.id, slug: business.slug }, { status: 201 });
}
