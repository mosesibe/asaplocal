import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { stripHtml } from "@asaplocal/core";

const schema = z.object({
  isActive: z.boolean().optional(),
  title: z.string().min(2).max(120).optional(),
  durationMins: z.coerce.number().int().min(5).max(1440).nullable().optional(),
  priceType: z.enum(["FIXED", "HOURLY", "QUOTE_ONLY"]).optional(),
  priceMinPence: z.coerce.number().int().min(0).nullable().optional(),
  priceMaxPence: z.coerce.number().int().min(0).nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "No business profile found" }, { status: 404 });

  const service = await prisma.service.findUnique({ where: { id } });
  if (!service || service.businessId !== business.id) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });

  const updated = await prisma.service.update({
    where: { id },
    data: { ...parsed.data, title: parsed.data.title ? stripHtml(parsed.data.title) : undefined },
  });

  return NextResponse.json({ service: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "No business profile found" }, { status: 404 });

  const service = await prisma.service.findUnique({ where: { id }, include: { bookings: { take: 1 } } });
  if (!service || service.businessId !== business.id) return NextResponse.json({ message: "Not found" }, { status: 404 });

  // A service attached to booking history can't be deleted without losing that
  // history (the FK is SetNull) — pause it instead, which has the same effect
  // on lead matching.
  if (service.bookings.length > 0) {
    return NextResponse.json({ message: "This service has bookings against it — pause it instead of removing it." }, { status: 409 });
  }

  await prisma.service.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
