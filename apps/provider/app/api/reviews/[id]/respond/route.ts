import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { stripHtml } from "@asaplocal/core";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { response } = await req.json();
  const review = await prisma.review.findUnique({ where: { id }, include: { business: true } });
  if (!review || review.business.ownerId !== session.user.id) return NextResponse.json({ message: "Not found" }, { status: 404 });

  await prisma.review.update({ where: { id }, data: { providerResponse: stripHtml(response ?? ""), respondedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
