import { NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";

// JSON counterpart to the /messages server-rendered page — the mobile app
// has no server components, so this mirrors the same query as plain JSON.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId: session.user.id } } },
    include: {
      participants: { include: { user: { include: { profile: true, business: true } } } },
      jobRequest: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { lastMessageAt: "desc" },
  });

  return NextResponse.json({
    conversations: conversations.map((c) => {
      const other = c.participants.find((p) => p.userId !== session.user.id);
      const mine = c.participants.find((p) => p.userId === session.user.id);
      // Matches /messages (apps/web/app/messages/page.tsx): the other side
      // of a customer's conversation is almost always a provider, so show
      // their business name — a personal first/last name told the customer
      // nothing about who they were actually talking to.
      const name = other?.user.business?.name ?? other?.user.profile?.firstName ?? "User";
      const lastMessage = c.messages[0] ?? null;
      return {
        id: c.id,
        name,
        jobTitle: c.jobRequest?.title ?? null,
        lastMessageBody: lastMessage?.body ?? null,
        lastMessageAt: c.lastMessageAt,
        unread: lastMessage ? !lastMessage.readByUserIds.includes(session.user.id) : false,
        lastReadAt: mine?.lastReadAt ?? null,
      };
    }),
  });
}
