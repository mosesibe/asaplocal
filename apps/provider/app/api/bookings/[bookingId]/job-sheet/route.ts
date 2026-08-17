import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { z } from "zod";

const schema = z.object({
  description: z.string().min(1).max(500),
  photos: z.array(z.string().url()).max(10).default([]),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "Complete onboarding first" }, { status: 400 });

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.businessId !== business.id) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (booking.status !== "IN_PROGRESS") {
    return NextResponse.json({ message: "You can only log actions while the job is in progress" }, { status: 400 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 422 });

  const entry = await prisma.jobSheetEntry.create({
    data: { bookingId, description: parsed.data.description, photos: parsed.data.photos },
  });

  return NextResponse.json({ id: entry.id }, { status: 201 });
}
