import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await prisma.favourite.upsert({
    where: { customerId_businessId: { customerId: session.user.id, businessId } },
    update: {},
    create: { customerId: session.user.id, businessId },
  });
  return NextResponse.json({ favourited: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await prisma.favourite.deleteMany({ where: { customerId: session.user.id, businessId } });
  return NextResponse.json({ favourited: false });
}
