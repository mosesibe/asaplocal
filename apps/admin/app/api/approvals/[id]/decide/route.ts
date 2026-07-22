import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { writeAuditLog, notify } from "@asaplocal/core";
import { z } from "zod";

const schema = z.object({ decision: z.enum(["APPROVED", "REJECTED"]), reviewNote: z.string().max(500).optional() });

/**
 * Applies (or rejects) a dispatcher's proposed job mutation. This is the
 * only place dispatcher-originated writes to JobRequest actually happen —
 * everything else in the dispatcher UI only ever creates an ApprovalRequest.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 422 });

  const approval = await prisma.approvalRequest.findUnique({ where: { id }, include: { jobRequest: true } });
  if (!approval) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (approval.status !== "PENDING") return NextResponse.json({ message: "Already decided" }, { status: 409 });

  await prisma.$transaction(async (tx) => {
    await tx.approvalRequest.update({
      where: { id },
      data: { status: parsed.data.decision, reviewedById: session.user.id, reviewedAt: new Date(), reviewNote: parsed.data.reviewNote },
    });

    if (parsed.data.decision !== "APPROVED" || !approval.jobRequestId) return;

    const payload = approval.payload as Record<string, unknown>;

    switch (approval.actionType) {
      case "JOB_ASSIGN_PROVIDER": {
        const businessId = payload.businessId as string;
        const assignment = await tx.dispatcherAssignment.create({
          data: {
            jobRequestId: approval.jobRequestId,
            dispatcherId: approval.requestedById,
            assignedBusinessId: businessId,
            note: payload.note as string | undefined,
            approvalRequestId: approval.id,
          },
        });
        const lead = await tx.lead.findUnique({ where: { jobRequestId: approval.jobRequestId } });
        if (lead) {
          await tx.leadAccess.upsert({
            where: { leadId_businessId: { leadId: lead.id, businessId } },
            update: {},
            create: { leadId: lead.id, businessId, acquisitionType: "CLAIM", pricePaidPence: 0 },
          });
        }
        const business = await tx.business.findUnique({ where: { id: businessId } });
        if (business) await notify(business.ownerId, "DISPATCHER_ASSIGNMENT", "A job was assigned to you", approval.jobRequest?.title ?? "", "/leads");
        void assignment;
        break;
      }
      case "JOB_DELETE": {
        await tx.jobRequest.update({ where: { id: approval.jobRequestId }, data: { status: "CANCELLED" } });
        break;
      }
      case "JOB_UPDATE":
      case "JOB_STATUS_OVERRIDE": {
        await tx.jobRequest.update({
          where: { id: approval.jobRequestId },
          data: {
            title: payload.title as string | undefined,
            description: payload.description as string | undefined,
            status: payload.status as any,
          },
        });
        break;
      }
      default:
        break;
    }
  });

  await notify(
    approval.requestedById,
    "APPROVAL_DECISION",
    `Your request was ${parsed.data.decision.toLowerCase()}`,
    approval.jobRequest?.title ?? undefined
  );
  await writeAuditLog({
    actorId: session.user.id,
    actorRole: "ADMIN",
    action: `approval.${parsed.data.decision.toLowerCase()}`,
    targetType: "ApprovalRequest",
    targetId: id,
    metadata: { actionType: approval.actionType },
  });

  return NextResponse.json({ ok: true });
}
