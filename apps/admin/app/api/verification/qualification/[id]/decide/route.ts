import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { writeAuditLog, notify, recomputeTrustTier } from "@asaplocal/core";
import { z } from "zod";

const schema = z.object({ decision: z.enum(["VERIFIED", "REJECTED", "MORE_INFO_REQUESTED"]), reviewNote: z.string().max(500).optional() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 422 });

  const qualification = await prisma.qualification.findUnique({ where: { id }, include: { business: true } });
  if (!qualification) return NextResponse.json({ message: "Not found" }, { status: 404 });

  await prisma.qualification.update({
    where: { id },
    data: {
      status: parsed.data.decision,
      reviewNote: parsed.data.reviewNote,
      verifiedAt: parsed.data.decision === "VERIFIED" ? new Date() : null,
    },
  });

  await writeAuditLog({ actorId: session.user.id, actorRole: "ADMIN", action: `verification.qualification.${parsed.data.decision.toLowerCase()}`, targetType: "Qualification", targetId: id });
  await notify(qualification.business.ownerId, "VERIFICATION_UPDATE", "Qualification verification update", `Your "${qualification.name}" qualification is now ${parsed.data.decision.toLowerCase().replace(/_/g, " ")}.`, "/verification/qualifications");
  await recomputeTrustTier(qualification.businessId);

  return NextResponse.json({ ok: true });
}
