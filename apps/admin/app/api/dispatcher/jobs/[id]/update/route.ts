import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { writeAuditLog } from "@asaplocal/core";
import { z } from "zod";

const schema = z.object({ title: z.string().min(8).max(120).optional(), description: z.string().min(20).max(2000).optional(), status: z.enum(["OPEN", "MATCHING", "QUOTED", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "EXPIRED"]).optional() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: jobRequestId } = await params;
  const session = await auth();
  if (!session?.user || (session.user.role !== "DISPATCHER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 422 });

  const jobRequest = await prisma.jobRequest.findUnique({ where: { id: jobRequestId } });
  if (!jobRequest) return NextResponse.json({ message: "Job not found" }, { status: 404 });

  if (session.user.role === "ADMIN") {
    await prisma.jobRequest.update({ where: { id: jobRequestId }, data: parsed.data });
    await writeAuditLog({ actorId: session.user.id, actorRole: "ADMIN", action: "dispatcher.job.update.direct", targetType: "JobRequest", targetId: jobRequestId, metadata: parsed.data });
    return NextResponse.json({ id: jobRequestId, status: "APPLIED" });
  }

  const approval = await prisma.approvalRequest.create({
    data: { requestedById: session.user.id, actionType: parsed.data.status ? "JOB_STATUS_OVERRIDE" : "JOB_UPDATE", jobRequestId, payload: parsed.data, status: "PENDING" },
  });
  await writeAuditLog({ actorId: session.user.id, actorRole: "DISPATCHER", action: "dispatcher.job.update.proposed", targetType: "JobRequest", targetId: jobRequestId, metadata: parsed.data });
  return NextResponse.json({ id: approval.id, status: "PENDING_APPROVAL" }, { status: 201 });
}
