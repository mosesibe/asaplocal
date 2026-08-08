import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { geocodeAddress, stripHtml } from "@asaplocal/core";
import { z } from "zod";

const schema = z.object({
  businessType: z.enum(["SOLE_TRADER", "LIMITED_COMPANY", "PARTNERSHIP", "SELF_EMPLOYED", "CHARITY"]),
  categorySlugs: z.array(z.string()).min(1, "Choose at least one service you offer"),
  name: z.string().min(2),
  tradingName: z.string().optional(),
  companyRegistrationNumber: z.string().optional(),
  yearsInBusiness: z.coerce.number().int().min(0).max(150).optional(),
  description: z.string().min(20),
  website: z.string().optional(),
  addressLine: z.string().min(1, "Add your business address"),
  city: z.string().min(2),
  postcode: z.string().optional(),
  baseRadiusMiles: z.coerce.number().int().min(1).max(100).default(15),
  utrNumber: z.string().optional(),
  vatNumber: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const existing = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (existing) return NextResponse.json({ message: "Business already exists" }, { status: 409 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true, phone: true } });
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Invalid input", issues: parsed.error.flatten() }, { status: 422 });
  const data = parsed.data;

  const categories = await prisma.category.findMany({ where: { slug: { in: data.categorySlugs } } });
  if (categories.length !== data.categorySlugs.length) return NextResponse.json({ message: "Unknown category" }, { status: 400 });

  const geo = await geocodeAddress(`${data.addressLine ?? ""} ${data.postcode ?? ""} ${data.city}, UK`).catch(() => null);
  if (!geo) return NextResponse.json({ message: "Couldn't locate that address" }, { status: 400 });

  const slug = `${data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Math.random().toString(36).slice(2, 6)}`;

  const business = await prisma.business.create({
    data: {
      ownerId: session.user.id,
      name: stripHtml(data.name),
      slug,
      description: stripHtml(data.description),
      businessType: data.businessType,
      tradingName: data.tradingName ? stripHtml(data.tradingName) : undefined,
      companyRegistrationNumber: data.companyRegistrationNumber,
      yearsInBusiness: data.yearsInBusiness,
      website: data.website,
      phone: user.phone,
      email: user.email,
      utrNumber: data.utrNumber,
      vatNumber: data.vatNumber,
      businessInfoCompletedAt: new Date(),
      city: data.city,
      postcode: data.postcode,
      addressLine: data.addressLine,
      lat: geo.lat,
      lng: geo.lng,
      baseRadiusMiles: data.baseRadiusMiles,
      serviceAreas: { create: [{ city: data.city, lat: geo.lat, lng: geo.lng, radiusMiles: data.baseRadiusMiles }] },
      services: { create: categories.map((c) => ({ categoryId: c.id, title: `${c.name} services`, priceType: "QUOTE_ONLY" as const })) },
      subscription: { create: { plan: "FREE", status: "ACTIVE", monthlyLeadAllowance: 0 } },
      leadCreditWallet: { create: { balance: 2 } }, // welcome credits
    },
  });

  await prisma.user.update({ where: { id: session.user.id }, data: { status: "ACTIVE" } });

  return NextResponse.json({ id: business.id, slug: business.slug }, { status: 201 });
}
