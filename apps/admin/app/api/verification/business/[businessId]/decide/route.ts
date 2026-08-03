import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { writeAuditLog, notify, recomputeTrustTier } from "@asaplocal/core";
import { z } from "zod";

const schema = z.object({ decision: z.enum(["VERIFIED", "REJECTED", "MORE_INFO_REQUESTED"]), reviewNote: z.string().max(500).optional() });

/**
 * Decides Phase 4 (Business Verification) — covers both the Limited Company
 * auto-check path (packages/core/src/companies-house.ts) and the sole-trader
 * manual proof-of-trading-document path. Both drive the same
 * Business.verificationStatus field rather than a separate status column.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 422 });

  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) return NextResponse.json({ message: "Not found" }, { status: 404 });

  await prisma.business.update({
    where: { id: businessId },
    data: {
      verificationStatus: parsed.data.decision,
      verifiedAt: parsed.data.decision === "VERIFIED" ? new Date() : null,
    },
  });

  await writeAuditLog({
    actorId: session.user.id,
    actorRole: "ADMIN",
    action: `verification.business.${parsed.data.decision.toLowerCase()}`,
    targetType: "Business",
    targetId: businessId,
    metadata: parsed.data.reviewNote ? { reviewNote: parsed.data.reviewNote } : undefined,
  });
  await notify(business.ownerId, "VERIFICATION_UPDATE", "Business verification update", `Your business verification is now ${parsed.data.decision.toLowerCase().replace(/_/g, " ")}.`, "/verification/business");
  await recomputeTrustTier(businessId);

  return NextResponse.json({ ok: true });
}
