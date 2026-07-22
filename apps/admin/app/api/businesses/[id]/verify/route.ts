import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { writeAuditLog, notify } from "@asaplocal/core";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.update({ where: { id }, data: { verificationStatus: "VERIFIED", verifiedAt: new Date() } });
  await writeAuditLog({ actorId: session.user.id, actorRole: "ADMIN", action: "business.verify", targetType: "Business", targetId: id });
  await notify(business.ownerId, "VERIFICATION_UPDATE", "Your business is now verified", "You'll now show the verified badge on your listing.");
  return NextResponse.json({ ok: true });
}
