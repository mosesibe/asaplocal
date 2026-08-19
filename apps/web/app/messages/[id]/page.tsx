import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { Avatar, Card, MobileTopBar } from "@asaplocal/ui";
import { ChatThread } from "./chat-thread";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/messages/${id}`);

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      participants: { include: { user: { include: { profile: true, business: true } } } },
      jobRequest: true,
    },
  });
  if (!conversation || !conversation.participants.some((p) => p.userId === session.user.id)) notFound();

  const messages = await prisma.message.findMany({ where: { conversationId: id }, orderBy: { createdAt: "asc" } });

  const other = conversation.participants.find((p) => p.userId !== session.user.id);
  const recipientName = other?.user.business?.name ?? other?.user.profile?.firstName ?? "User";

  return (
    <div className="md:mx-auto md:max-w-2xl md:px-6 md:py-6">
      <MobileTopBar backHref="/messages" linkAs={Link} title={recipientName} className="md:hidden" />
      <div className="px-4 py-4 md:p-0">
        <Card className="mb-4 min-w-0 space-y-2 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={recipientName} />
            <p className="min-w-0 flex-1 truncate font-semibold">{recipientName}</p>
            {conversation.jobRequestId && (
              <Link href={`/jobs/${conversation.jobRequestId}`} className="shrink-0 text-sm font-medium text-brand-600 hover:underline dark:text-brand-300">
                View job
              </Link>
            )}
          </div>
          {conversation.jobRequest && (
            <p className="min-w-0 truncate text-sm text-muted-foreground">
              {conversation.jobRequest.title} · {conversation.jobRequest.city}
            </p>
          )}
        </Card>
        <ChatThread
          conversationId={id}
          currentUserId={session.user.id}
          initialMessages={messages.map((m) => ({ id: m.id, body: m.body, senderId: m.senderId, createdAt: m.createdAt.toISOString() }))}
        />
      </div>
    </div>
  );
}
