import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { writeAuditLog, notify } from "@asaplocal/core";
import { z } from "zod";

const schema = z.object({ decision: z.enum(["VERIFIED", "REJECTED", "MORE_INFO_REQUESTED"]), reviewNote: z.string().max(500).optional() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ staffId: string }> }) {
  const { staffId } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 422 });

  const staffMember = await prisma.staffMember.findUnique({ where: { id: staffId }, include: { business: true } });
  if (!staffMember) return NextResponse.json({ message: "Not found" }, { status: 404 });

  await prisma.staffMember.update({
    where: { id: staffId },
    data: {
      approvalStatus: parsed.data.decision,
      reviewedAt: new Date(),
      reviewedById: session.user.id,
      reviewNote: parsed.data.reviewNote ?? null,
    },
  });

  await writeAuditLog({
    actorId: session.user.id,
    actorRole: "ADMIN",
    action: `staff.${parsed.data.decision.toLowerCase()}`,
    targetType: "StaffMember",
    targetId: staffId,
    metadata: parsed.data.reviewNote ? { reviewNote: parsed.data.reviewNote } : undefined,
  });
  await notify(
    staffMember.business.ownerId,
    "STAFF_STATUS_UPDATE",
    "Staff approval update",
    `${staffMember.fullName}'s status is now ${parsed.data.decision.toLowerCase().replace(/_/g, " ")}.`,
    `/staff/${staffId}`
  );

  return NextResponse.json({ ok: true });
}
