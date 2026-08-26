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
      participants: { include: { user: { include: { profile: true } } } },
      jobRequest: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { lastMessageAt: "desc" },
  });

  return NextResponse.json({
    conversations: conversations.map((c) => {
      const other = c.participants.find((p) => p.userId !== session.user.id);
      const mine = c.participants.find((p) => p.userId === session.user.id);
      const name = `${other?.user.profile?.firstName ?? ""} ${other?.user.profile?.lastName ?? ""}`.trim() || "Customer";
      const lastMessage = c.messages[0] ?? null;
      return {
        id: c.id,
        customerName: name,
        jobTitle: c.jobRequest?.title ?? null,
        lastMessageBody: lastMessage?.body ?? null,
        lastMessageAt: c.lastMessageAt,
        unread: lastMessage ? !lastMessage.readByUserIds.includes(session.user.id) : false,
        lastReadAt: mine?.lastReadAt ?? null,
      };
    }),
  });
}
