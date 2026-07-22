import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { stripHtml } from "@asaplocal/core";
import { z } from "zod";

const schema = z.object({
  description: z.string().min(20).optional(),
  logoUrl: z.string().url().optional(),
  coverImageUrl: z.string().url().optional(),
  phone: z.string().max(30).optional(),
  website: z.string().url().optional(),
  baseRadiusMiles: z.coerce.number().int().min(1).max(100).optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PROVIDER") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 422 });

  const updated = await prisma.business.update({
    where: { id: business.id },
    data: { ...parsed.data, description: parsed.data.description ? stripHtml(parsed.data.description) : undefined },
  });

  return NextResponse.json({ business: updated });
}
