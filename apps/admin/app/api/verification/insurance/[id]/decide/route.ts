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

  const policy = await prisma.insurancePolicy.findUnique({ where: { id }, include: { business: true } });
  if (!policy) return NextResponse.json({ message: "Not found" }, { status: 404 });

  await prisma.insurancePolicy.update({
    where: { id },
    data: {
      status: parsed.data.decision,
      reviewNote: parsed.data.reviewNote,
      verifiedAt: parsed.data.decision === "VERIFIED" ? new Date() : null,
    },
  });

  const stillInsured = await prisma.insurancePolicy.findFirst({
    where: { businessId: policy.businessId, type: "PUBLIC_LIABILITY", status: "VERIFIED", expiryDate: { gt: new Date() } },
  });
  await prisma.business.update({ where: { id: policy.businessId }, data: { insured: !!stillInsured } });

  await writeAuditLog({ actorId: session.user.id, actorRole: "ADMIN", action: `verification.insurance.${parsed.data.decision.toLowerCase()}`, targetType: "InsurancePolicy", targetId: id });
  await notify(policy.business.ownerId, "VERIFICATION_UPDATE", "Insurance verification update", `Your ${policy.type.toLowerCase().replace(/_/g, " ")} policy is now ${parsed.data.decision.toLowerCase().replace(/_/g, " ")}.`, "/verification/insurance");
  await recomputeTrustTier(policy.businessId);

  return NextResponse.json({ ok: true });
}
