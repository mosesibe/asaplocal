import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "No business profile found" }, { status: 404 });

  const address = await prisma.businessAddress.findUnique({ where: { id } });
  if (!address || address.businessId !== business.id) return NextResponse.json({ message: "Not found" }, { status: 404 });

  await prisma.businessAddress.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
