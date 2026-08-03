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

  const record = await prisma.identityVerification.findUnique({ where: { id }, include: { business: true } });
  if (!record) return NextResponse.json({ message: "Not found" }, { status: 404 });

  await prisma.identityVerification.update({
    where: { id },
    data: {
      status: parsed.data.decision,
      reviewNote: parsed.data.reviewNote,
      verifiedAt: parsed.data.decision === "VERIFIED" ? new Date() : null,
    },
  });

  await writeAuditLog({ actorId: session.user.id, actorRole: "ADMIN", action: `verification.identity.${parsed.data.decision.toLowerCase()}`, targetType: "IdentityVerification", targetId: id });
  await notify(record.business.ownerId, "VERIFICATION_UPDATE", "Identity verification update", `Your identity verification is now ${parsed.data.decision.toLowerCase().replace(/_/g, " ")}.`, "/verification/identity");
  await recomputeTrustTier(record.businessId);

  return NextResponse.json({ ok: true });
}
