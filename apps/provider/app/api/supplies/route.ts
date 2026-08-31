import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { stripHtml } from "@asaplocal/core";

const schema = z.object({
  name: z.string().min(2, "Give the product a name").max(120),
  description: z.string().max(600).optional(),
  pricePence: z.coerce.number().int().min(0).nullable().optional(),
  unit: z.string().max(40).optional(),
  imageUrl: z.string().url().optional(),
  inStock: z.boolean().optional(),
});

// JSON counterpart to /supplies (a server component that queries Prisma
// directly) — needed for the mobile app's supplies screen, which has no
// server component to fetch this in.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "No business profile found" }, { status: 404 });

  const supplies = await prisma.supply.findMany({
    where: { businessId: business.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ supplies });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "No business profile found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });

  const count = await prisma.supply.count({ where: { businessId: business.id } });

  const supply = await prisma.supply.create({
    data: {
      businessId: business.id,
      name: stripHtml(parsed.data.name),
      description: parsed.data.description ? stripHtml(parsed.data.description) : undefined,
      pricePence: parsed.data.pricePence ?? undefined,
      unit: parsed.data.unit ? stripHtml(parsed.data.unit) : undefined,
      imageUrl: parsed.data.imageUrl,
      inStock: parsed.data.inStock ?? true,
      sortOrder: count,
    },
  });

  return NextResponse.json({ supply }, { status: 201 });
}
