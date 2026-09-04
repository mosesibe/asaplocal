import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { writeAuditLog, notify, recomputeTrustTier, BACKGROUND_CHECK_LABEL } from "@asaplocal/core";
import { z } from "zod";

const schema = z.object({ decision: z.enum(["VERIFIED", "REJECTED", "MORE_INFO_REQUESTED"]), reviewNote: z.string().max(500).optional() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 422 });

  const check = await prisma.backgroundCheck.findUnique({ where: { id }, include: { business: true } });
  if (!check) return NextResponse.json({ message: "Not found" }, { status: 404 });

  await prisma.backgroundCheck.update({
    where: { id },
    data: {
      status: parsed.data.decision,
      reviewNote: parsed.data.reviewNote,
      completedAt: parsed.data.decision === "VERIFIED" ? new Date() : null,
    },
  });

  const label = BACKGROUND_CHECK_LABEL[check.type];
  await writeAuditLog({ actorId: session.user.id, actorRole: "ADMIN", action: `verification.background.${parsed.data.decision.toLowerCase()}`, targetType: "BackgroundCheck", targetId: id, metadata: { type: check.type } });
  await notify(check.business.ownerId, "VERIFICATION_UPDATE", "Verification update", `Your ${label.toLowerCase()} is now ${parsed.data.decision.toLowerCase().replace(/_/g, " ")}.`, "/verification");
  await recomputeTrustTier(check.businessId);

  return NextResponse.json({ ok: true });
}
