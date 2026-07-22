import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { requestLeadRefund, refundRequestSchema } from "@asaplocal/core";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PROVIDER") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const parsed = refundRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input", issues: parsed.error.flatten() }, { status: 422 });

  const access = await prisma.leadAccess.findUnique({ where: { id: parsed.data.leadAccessId }, include: { business: true } });
  if (!access || access.business.ownerId !== session.user.id) return NextResponse.json({ message: "Not found" }, { status: 404 });

  try {
    const refundReq = await requestLeadRefund(access.id, session.user.id, parsed.data.reason, parsed.data.details);
    return NextResponse.json({ id: refundReq.id }, { status: 201 });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    return NextResponse.json({ message: err.message }, { status: err.statusCode ?? 400 });
  }
}
