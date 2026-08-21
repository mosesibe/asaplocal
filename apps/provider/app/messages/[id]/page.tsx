import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { Avatar, Badge, Card, MobileTopBar, formatPence } from "@asaplocal/ui";
import { ChatThread } from "./chat-thread";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      participants: { include: { user: { include: { profile: true } } } },
      jobRequest: { include: { category: true } },
    },
  });
  if (!conversation || !conversation.participants.some((p) => p.userId === session.user.id)) notFound();
  const messages = await prisma.message.findMany({ where: { conversationId: id }, orderBy: { createdAt: "asc" } });

  const other = conversation.participants.find((p) => p.userId !== session.user.id);
  const customerName = other?.user.profile ? `${other.user.profile.firstName} ${other.user.profile.lastName}`.trim() : (other?.user.email ?? "Customer");

  const lead = conversation.jobRequestId
    ? await prisma.lead.findUnique({ where: { jobRequestId: conversation.jobRequestId } })
    : null;
  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  const leadAccess = lead && business ? await prisma.leadAccess.findUnique({ where: { leadId_businessId: { leadId: lead.id, businessId: business.id } } }) : null;

  return (
    // Sized to the space ProviderShell's <main> leaves: mobile is pt-8 (2rem)
    // + ProviderTopBar (4rem, its 40px row plus mb-6) + pb-20 (5rem) = 11rem;
    // desktop is pt-8 + pb-8 = 4rem, with both top bars hidden. The page then
    // never scrolls, so the composer stays put and only the messages move.
    <div className="flex h-[calc(100dvh-11rem)] flex-col overflow-hidden md:h-[calc(100dvh-4rem)]">
      <MobileTopBar backHref="/messages" linkAs={Link} title={customerName} className="-mx-4 mb-4 shrink-0 md:hidden" />
      <Card className="mb-4 min-w-0 shrink-0 space-y-2 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={customerName} />
          <p className="min-w-0 flex-1 truncate font-semibold">{customerName}</p>
          {leadAccess && (
            <Link href={`/leads/${lead!.id}`} className="shrink-0 text-sm font-medium text-brand-600 hover:underline dark:text-brand-300">
              View lead
            </Link>
          )}
        </div>
        {conversation.jobRequest && (
          <div className="flex min-w-0 items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
              {conversation.jobRequest.title} · {conversation.jobRequest.city}
              {conversation.jobRequest.budgetMinPence ? ` · Budget ${formatPence(conversation.jobRequest.budgetMinPence)}–${conversation.jobRequest.budgetMaxPence ? formatPence(conversation.jobRequest.budgetMaxPence) : "?"}` : ""}
            </p>
            {conversation.jobRequest.category && <Badge variant="outline" className="shrink-0">{conversation.jobRequest.category.name}</Badge>}
          </div>
        )}
      </Card>
      <ChatThread
        conversationId={id}
        currentUserId={session.user.id}
        initialMessages={messages.map((m) => ({ id: m.id, body: m.body, senderId: m.senderId, createdAt: m.createdAt.toISOString() }))}
      />
    </div>
  );
}
