import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { acquireLeadWithAllowanceOrCredits, checkRateLimit } from "@asaplocal/core";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "PROVIDER") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    await checkRateLimit("lead-acquire", session.user.id, 20, 60);
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 429 });
  }

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "No business profile found" }, { status: 404 });

  try {
    const access = await acquireLeadWithAllowanceOrCredits(id, business.id);
    return NextResponse.json({ leadAccessId: access.id }, { status: 201 });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    return NextResponse.json({ message: err.message }, { status: err.statusCode ?? 400 });
  }
}
