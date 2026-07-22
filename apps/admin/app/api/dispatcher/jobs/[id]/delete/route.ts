import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { writeAuditLog, notify } from "@asaplocal/core";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: jobRequestId } = await params;
  const session = await auth();
  if (!session?.user || (session.user.role !== "DISPATCHER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const jobRequest = await prisma.jobRequest.findUnique({ where: { id: jobRequestId }, include: { customer: true } });
  if (!jobRequest) return NextResponse.json({ message: "Job not found" }, { status: 404 });

  if (session.user.role === "ADMIN") {
    await prisma.jobRequest.update({ where: { id: jobRequestId }, data: { status: "CANCELLED" } });
    await writeAuditLog({ actorId: session.user.id, actorRole: "ADMIN", action: "dispatcher.job.cancel.direct", targetType: "JobRequest", targetId: jobRequestId });
    await notify(jobRequest.customerId, "SYSTEM", "Your job request was cancelled", jobRequest.title);
    return NextResponse.json({ id: jobRequestId, status: "APPLIED" });
  }

  const approval = await prisma.approvalRequest.create({
    data: { requestedById: session.user.id, actionType: "JOB_DELETE", jobRequestId, payload: {}, status: "PENDING" },
  });
  await writeAuditLog({ actorId: session.user.id, actorRole: "DISPATCHER", action: "dispatcher.job.cancel.proposed", targetType: "JobRequest", targetId: jobRequestId });
  return NextResponse.json({ id: approval.id, status: "PENDING_APPROVAL" }, { status: 201 });
}
