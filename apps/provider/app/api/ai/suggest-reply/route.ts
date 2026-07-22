import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { suggestLeadReply } from "@asaplocal/core";

/** AI Chat Assistant: drafts a reply for a provider inside a conversation thread. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PROVIDER") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { conversationId } = await req.json();
  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "No business profile" }, { status: 404 });

  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId }, include: { jobRequest: true, messages: { orderBy: { createdAt: "desc" }, take: 1 } } });
  if (!conversation) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const reply = await suggestLeadReply({
    jobDescription: conversation.jobRequest?.description ?? "General enquiry",
    customerMessage: conversation.messages[0]?.body,
    businessName: business.name,
  });

  return NextResponse.json({ reply });
}
