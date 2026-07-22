import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { messageSchema, publishMessage, stripHtml, checkRateLimit } from "@asaplocal/core";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const participant = await prisma.conversationParticipant.findUnique({ where: { conversationId_userId: { conversationId: id, userId: session.user.id } } });
  if (!participant) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const messages = await prisma.message.findMany({ where: { conversationId: id }, orderBy: { createdAt: "asc" }, take: 200 });
  await prisma.conversationParticipant.update({ where: { conversationId_userId: { conversationId: id, userId: session.user.id } }, data: { lastReadAt: new Date() } });
  return NextResponse.json({ messages });
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

  return NextResponse.json({ message }, { status: 201 });
}
