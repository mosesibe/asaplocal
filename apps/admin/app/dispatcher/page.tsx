import { redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { Badge, Card } from "@asaplocal/ui";
import { DispatchJobRow } from "./dispatch-job-row";

export default async function DispatchBoardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [jobs, businesses] = await Promise.all([
    prisma.jobRequest.findMany({
      where: { status: { in: ["OPEN", "MATCHING", "QUOTED"] } },
      include: { category: true, customer: { include: { profile: true } }, lead: { include: { accesses: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.business.findMany({ where: { verificationStatus: { in: ["VERIFIED", "PENDING"] } }, select: { id: true, name: true, city: true } }),
  ]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dispatch board</h1>
        <Badge variant="outline">{session.user.role}</Badge>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        {session.user.role === "DISPATCHER"
          ? "Track every open job and propose an assignment, edit, or cancellation. Every change you submit is queued for admin approval before it takes effect."
          : "Track every open job. As an admin, your changes apply immediately."}
      </p>
      <div className="space-y-3">
        {jobs.map((j) => (
          <Card key={j.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{j.title}</p>
                  <Badge variant="outline">{j.category.name}</Badge>
                  <Badge>{j.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {j.customer.profile?.firstName} {j.customer.profile?.lastName} · {j.city} · {j.lead?.accesses.length ?? 0} providers engaged
                </p>
              </div>
            </div>
            <DispatchJobRow jobId={j.id} isAdmin={session.user.role === "ADMIN"} businesses={businesses} currentStatus={j.status} />
          </Card>
        ))}
        {jobs.length === 0 && <p className="text-sm text-muted-foreground">No open jobs right now.</p>}
      </div>
    </div>
  );
}
