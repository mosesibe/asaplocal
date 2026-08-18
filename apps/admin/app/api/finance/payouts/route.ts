import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { writeAuditLog } from "@asaplocal/core";
import { z } from "zod";

const schema = z.object({
  businessId: z.string().uuid(),
  amountPence: z.number().int().positive(),
  /** Free text from the form ("Bank transfer", "Faster Payments") — Payout.method
   *  is now an enum, and this route is by definition the MANUAL path, so the
   *  detail is preserved in `reference` rather than dropped. */
  method: z.string().max(100).optional(),
  reference: z.string().max(200).optional(),
  paidAt: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 422 });

  const payout = await prisma.payout.create({
    data: {
      businessId: parsed.data.businessId,
      amountPence: parsed.data.amountPence,
      method: "MANUAL",
      reference: [parsed.data.method, parsed.data.reference].filter(Boolean).join(" · ") || undefined,
      paidAt: parsed.data.paidAt ? new Date(parsed.data.paidAt) : new Date(),
      createdById: session.user.id,
    },
  });
  await writeAuditLog({
    actorId: session.user.id,
    actorRole: "ADMIN",
    action: "payout.record",
    targetType: "Payout",
    targetId: payout.id,
    metadata: { businessId: parsed.data.businessId, amountPence: parsed.data.amountPence },
  });
  return NextResponse.json({ payout }, { status: 201 });
}
