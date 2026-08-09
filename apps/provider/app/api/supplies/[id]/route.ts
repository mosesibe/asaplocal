import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { stripHtml } from "@asaplocal/core";

const schema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(600).nullable().optional(),
  pricePence: z.coerce.number().int().min(0).nullable().optional(),
  unit: z.string().max(40).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  inStock: z.boolean().optional(),
});

async function ownedSupply(userId: string, id: string) {
  const business = await prisma.business.findUnique({ where: { ownerId: userId } });
  if (!business) return null;
  const supply = await prisma.supply.findUnique({ where: { id } });
  if (!supply || supply.businessId !== business.id) return null;
  return supply;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const supply = await ownedSupply(session.user.id, id);
  if (!supply) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });

  const updated = await prisma.supply.update({
    where: { id },
    data: {
      ...parsed.data,
      name: parsed.data.name ? stripHtml(parsed.data.name) : undefined,
      description: parsed.data.description ? stripHtml(parsed.data.description) : parsed.data.description,
      unit: parsed.data.unit ? stripHtml(parsed.data.unit) : parsed.data.unit,
    },
  });

  return NextResponse.json({ supply: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const supply = await ownedSupply(session.user.id, id);
  if (!supply) return NextResponse.json({ message: "Not found" }, { status: 404 });

  await prisma.supply.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
