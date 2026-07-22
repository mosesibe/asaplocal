import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { writeAuditLog, notify } from "@asaplocal/core";
import { z } from "zod";

const schema = z.object({ businessId: z.string().uuid(), note: z.string().max(300).optional() });

/**
 * Dispatchers can assign a job to a specific provider, but the assignment
 * only takes effect once an admin approves it (see /api/approvals/[id]/decide).
 * Admins assign directly — no approval hop needed for their own actions.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: jobRequestId } = await params;
  const session = await auth();
  if (!session?.user || (session.user.role !== "DISPATCHER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 422 });

  const jobRequest = await prisma.jobRequest.findUnique({ where: { id: jobRequestId }, include: { lead: true } });
  if (!jobRequest) return NextResponse.json({ message: "Job not found" }, { status: 404 });

  if (session.user.role === "ADMIN") {
    const result = await prisma.$transaction(async (tx) => {
      const assignment = await tx.dispatcherAssignment.create({
        data: { jobRequestId, dispatcherId: session.user.id, assignedBusinessId: parsed.data.businessId, note: parsed.data.note },
      });
      if (jobRequest.lead) {
        await tx.leadAccess.upsert({
          where: { leadId_businessId: { leadId: jobRequest.lead.id, businessId: parsed.data.businessId } },
          update: {},
          create: { leadId: jobRequest.lead.id, businessId: parsed.data.businessId, acquisitionType: "CLAIM", pricePaidPence: 0 },
        });
      }
      return assignment;
    });
    const business = await prisma.business.findUnique({ where: { id: parsed.data.businessId } });
    if (business) await notify(business.ownerId, "DISPATCHER_ASSIGNMENT", "A job was assigned to you", jobRequest.title, `/leads`);
    await writeAuditLog({ actorId: session.user.id, actorRole: "ADMIN", action: "dispatcher.assign.direct", targetType: "JobRequest", targetId: jobRequestId, metadata: parsed.data });
    return NextResponse.json({ id: result.id, status: "APPLIED" }, { status: 201 });
  }

  // DISPATCHER — queue for approval
  const approval = await prisma.approvalRequest.create({
    data: { requestedById: session.user.id, actionType: "JOB_ASSIGN_PROVIDER", jobRequestId, payload: parsed.data, status: "PENDING" },
  });
  await writeAuditLog({ actorId: session.user.id, actorRole: "DISPATCHER", action: "dispatcher.assign.proposed", targetType: "JobRequest", targetId: jobRequestId, metadata: parsed.data });
  return NextResponse.json({ id: approval.id, status: "PENDING_APPROVAL" }, { status: 201 });
}
