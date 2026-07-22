import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { writeAuditLog } from "@asaplocal/core";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await prisma.user.update({ where: { id }, data: { status: "ACTIVE", suspendedAt: null, suspendedReason: null } });
  await writeAuditLog({ actorId: session.user.id, actorRole: "ADMIN", action: "user.reactivate", targetType: "User", targetId: id });
  return NextResponse.json({ ok: true });
}
