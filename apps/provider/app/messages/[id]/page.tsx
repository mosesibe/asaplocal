import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { MobileTopBar } from "@asaplocal/ui";
import { ChatThread } from "./chat-thread";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const conversation = await prisma.conversation.findUnique({ where: { id }, include: { participants: true } });
  if (!conversation || !conversation.participants.some((p) => p.userId === session.user.id)) notFound();
  const messages = await prisma.message.findMany({ where: { conversationId: id }, orderBy: { createdAt: "asc" } });
  return (
    <div>
      <MobileTopBar backHref="/messages" linkAs={Link} title="Conversation" className="-mx-4 mb-4 md:hidden" />
      <ChatThread
        conversationId={id}
        currentUserId={session.user.id}
        initialMessages={messages.map((m) => ({ id: m.id, body: m.body, senderId: m.senderId, createdAt: m.createdAt.toISOString() }))}
      />
    </div>
  );
}
