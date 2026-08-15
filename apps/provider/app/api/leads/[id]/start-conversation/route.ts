import { NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const lead = await prisma.lead.findUnique({ where: { id }, include: { jobRequest: true } });
  if (!lead) return NextResponse.json({ message: "Lead not found" }, { status: 404 });

  const access = await prisma.leadAccess.findUnique({ where: { leadId_businessId: { leadId: id, businessId: business.id } } });
  if (!access) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  let conversation = await prisma.conversation.findFirst({
    where: {
      jobRequestId: lead.jobRequestId,
      AND: [{ participants: { some: { userId: lead.jobRequest.customerId } } }, { participants: { some: { userId: business.ownerId } } }],
    },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        jobRequestId: lead.jobRequestId,
        participants: { create: [{ userId: lead.jobRequest.customerId }, { userId: business.ownerId }] },
      },
    });
  }

  return NextResponse.json({ conversationId: conversation.id }, { status: 201 });
}
