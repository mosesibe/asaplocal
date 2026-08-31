import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { messageSchema, publishMessage, stripHtml, checkRateLimit, notify } from "@asaplocal/core";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const participant = await prisma.conversationParticipant.findUnique({ where: { conversationId_userId: { conversationId: id, userId: session.user.id } } });
  if (!participant) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  // Extended to also carry the header info /messages/[id]/page.tsx shows
  // (recipient name — business, not personal — plus the "View job" link) so
  // the mobile client doesn't need a second round trip for it.
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: { participants: { include: { user: { include: { profile: true, business: true } } } }, jobRequest: true },
  });
  const other = conversation?.participants.find((p) => p.userId !== session.user.id);
  const recipientName = other?.user.business?.name ?? other?.user.profile?.firstName ?? "User";

  const messages = await prisma.message.findMany({ where: { conversationId: id }, orderBy: { createdAt: "asc" }, take: 200 });
  await prisma.conversationParticipant.update({ where: { conversationId_userId: { conversationId: id, userId: session.user.id } }, data: { lastReadAt: new Date() } });
  return NextResponse.json({
    recipientName,
    jobRequestId: conversation?.jobRequestId ?? null,
    jobTitle: conversation?.jobRequest?.title ?? null,
    jobCity: conversation?.jobRequest?.city ?? null,
    messages,
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    await checkRateLimit("message-send", session.user.id, 30, 60);
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 429 });
  }

  const participant = await prisma.conversationParticipant.findUnique({ where: { conversationId_userId: { conversationId: id, userId: session.user.id } } });
  if (!participant) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = messageSchema.safeParse({ ...body, conversationId: id });
  if (!parsed.success) return NextResponse.json({ message: "Invalid message" }, { status: 422 });

  const message = await prisma.message.create({
    data: { conversationId: id, senderId: session.user.id, body: stripHtml(parsed.data.body), attachments: parsed.data.attachments, readByUserIds: [session.user.id] },
  });
  await prisma.conversation.update({ where: { id }, data: { lastMessageAt: new Date() } });
  await publishMessage(id, "new-message", message);

  const otherParticipants = await prisma.conversationParticipant.findMany({ where: { conversationId: id, userId: { not: session.user.id } } });
  await Promise.all(
    otherParticipants.map((p) => notify(p.userId, "MESSAGE_RECEIVED", "New message", message.body.slice(0, 140), `/messages/${id}`))
  );

  return NextResponse.json({ message }, { status: 201 });
}
