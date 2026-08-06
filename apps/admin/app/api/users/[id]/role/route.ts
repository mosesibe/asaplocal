import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { writeAuditLog } from "@asaplocal/core";
import { z } from "zod";

const schema = z.object({ role: z.enum(["ADMIN", "DISPATCHER"]) });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (id === session.user.id) return NextResponse.json({ message: "You can't change your own role" }, { status: 400 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 422 });

  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!target || (target.role !== "ADMIN" && target.role !== "DISPATCHER")) {
    return NextResponse.json({ message: "Not a staff account" }, { status: 400 });
  }

  await prisma.user.update({ where: { id }, data: { role: parsed.data.role } });
  await writeAuditLog({
    actorId: session.user.id,
    actorRole: "ADMIN",
    action: "user.role_change",
    targetType: "User",
    targetId: id,
    metadata: { from: target.role, to: parsed.data.role },
  });
  return NextResponse.json({ ok: true });
}
