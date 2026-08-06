import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { z } from "zod";

const PLAN_ALLOWANCE: Record<string, number> = { FREE: 3, PRO: 15, PREMIUM: 40, ENTERPRISE: 999 };

const schema = z.object({
  businessId: z.string().uuid(),
  plan: z.enum(["FREE", "PRO", "PREMIUM", "ENTERPRISE"]),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 422 });

  const existing = await prisma.subscription.findUnique({ where: { businessId: parsed.data.businessId } });
  if (existing) return NextResponse.json({ message: "This business already has a subscription" }, { status: 409 });

  const subscription = await prisma.subscription.create({
    data: {
      businessId: parsed.data.businessId,
      plan: parsed.data.plan,
      status: "ACTIVE",
      monthlyLeadAllowance: PLAN_ALLOWANCE[parsed.data.plan] ?? 0,
    },
  });
  return NextResponse.json({ subscription }, { status: 201 });
}
