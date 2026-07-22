import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { Avatar, Card } from "@asaplocal/ui";

export default async function MessagesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/messages");

  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId: session.user.id } } },
    include: { participants: { include: { user: { include: { profile: true, business: true } } } }, jobRequest: true, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { lastMessageAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold">Messages</h1>
      <div className="mt-6 space-y-3">
        {conversations.map((c) => {
          const other = c.participants.find((p) => p.userId !== session.user.id);
          const name = other?.user.business?.name ?? `${other?.user.profile?.firstName ?? "User"}`;
          return (
            <Link key={c.id} href={`/messages/${c.id}`}>
              <Card className="flex items-center gap-3 p-4">
                <Avatar name={name} />
                <div className="min-w-0">
                  <p className="truncate font-medium">{name}</p>
                  <p className="truncate text-sm text-muted-foreground">{c.jobRequest?.title ?? c.messages[0]?.body ?? "No messages yet"}</p>
                </div>
              </Card>
            </Link>
          );
        })}
        {conversations.length === 0 && <p className="text-muted-foreground">No conversations yet.</p>}
      </div>
    </div>
  );
}
