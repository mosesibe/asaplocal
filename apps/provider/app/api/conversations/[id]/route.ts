import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";

// Job-context metadata for the conversation header — kept separate from the
// polled `.../messages` endpoint so this doesn't get re-fetched every 5s.
// Mirrors the derivation in apps/provider/app/messages/[id]/page.tsx.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const participant = await prisma.conversationParticipant.findUnique({ where: { conversationId_userId: { conversationId: id, userId: session.user.id } } });
  if (!participant) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      participants: { include: { user: { include: { profile: true } } } },
      jobRequest: { include: { category: true } },
    },
  });
  if (!conversation) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const other = conversation.participants.find((p) => p.userId !== session.user.id);
  const customerName = other?.user.profile ? `${other.user.profile.firstName} ${other.user.profile.lastName}`.trim() : (other?.user.email ?? "Customer");

  const lead = conversation.jobRequestId
    ? await prisma.lead.findUnique({ where: { jobRequestId: conversation.jobRequestId } })
    : null;
  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  const leadAccess = lead && business ? await prisma.leadAccess.findUnique({ where: { leadId_businessId: { leadId: lead.id, businessId: business.id } } }) : null;

  return NextResponse.json({
    customerName,
    leadId: leadAccess ? lead!.id : null,
    jobRequest: conversation.jobRequest
      ? {
          title: conversation.jobRequest.title,
          city: conversation.jobRequest.city,
          budgetMinPence: conversation.jobRequest.budgetMinPence,
          budgetMaxPence: conversation.jobRequest.budgetMaxPence,
          categoryName: conversation.jobRequest.category?.name ?? null,
        }
      : null,
  });
}
