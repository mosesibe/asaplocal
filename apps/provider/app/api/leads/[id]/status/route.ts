import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { updateLeadPipelineStatus } from "@asaplocal/core";
import { z } from "zod";

const schema = z.object({ leadAccessId: z.string().uuid(), status: z.enum(["CONTACTED", "QUOTED", "WON", "LOST"]), lostReason: z.string().max(300).optional() });

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PROVIDER") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 422 });

  const access = await prisma.leadAccess.findUnique({ where: { id: parsed.data.leadAccessId }, include: { business: true } });
  if (!access || access.business.ownerId !== session.user.id) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const updated = await updateLeadPipelineStatus(access.id, parsed.data.status, parsed.data.lostReason);
  return NextResponse.json({ leadAccess: updated });
}
