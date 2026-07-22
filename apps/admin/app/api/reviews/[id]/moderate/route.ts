import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { writeAuditLog } from "@asaplocal/core";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { decision } = await req.json();
  await prisma.review.update({ where: { id }, data: { status: decision === "PUBLISH" ? "PUBLISHED" : "HIDDEN" } });
  await writeAuditLog({ actorId: session.user.id, actorRole: "ADMIN", action: `review.${decision.toLowerCase()}`, targetType: "Review", targetId: id });
  return NextResponse.json({ ok: true });
}
