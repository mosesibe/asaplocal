import { prisma } from "@asaplocal/db";
import { Card } from "@asaplocal/ui";

const ACTION_LABEL: Record<string, string> = {
  "dispatcher.assign.direct": "Assigned provider",
  "dispatcher.assign.proposed": "Proposed provider assignment",
  "dispatcher.job.cancel.direct": "Cancelled job",
  "dispatcher.job.cancel.proposed": "Proposed job cancellation",
};

export async function ServiceLog({ q, region }: { q?: string; region?: string }) {
  const logs = await prisma.auditLog.findMany({
    where: { targetType: "JobRequest", action: { startsWith: "dispatcher." } },
    orderBy: { createdAt: "desc" },
    take: 150,
    include: { actor: { include: { profile: true } } },
  });

  const jobIds = [...new Set(logs.map((l) => l.targetId).filter((id): id is string => !!id))];
  const jobs = await prisma.jobRequest.findMany({ where: { id: { in: jobIds } }, select: { id: true, title: true, city: true } });
  const jobMap = new Map(jobs.map((j) => [j.id, j]));

  const rows = logs
    .map((l) => ({ log: l, job: l.targetId ? jobMap.get(l.targetId) : undefined }))
    .filter(({ job }) => {
      if (region && job?.city !== region) return false;
      if (q && !(job?.title.toLowerCase().includes(q.toLowerCase()))) return false;
      return true;
    });

  return (
    <div className="mt-4 space-y-2">
      {rows.map(({ log, job }) => {
        const actorName = log.actor?.profile ? `${log.actor.profile.firstName} ${log.actor.profile.lastName}` : (log.actor?.email ?? "System");
        return (
          <Card key={log.id} className="rounded-none border-border p-3 shadow-none">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <p>
                <span className="font-medium">{actorName}</span>
                <span className="text-muted-foreground"> · {ACTION_LABEL[log.action] ?? log.action}</span>
                {job && <span className="text-muted-foreground"> · {job.title}{job.city ? ` (${job.city})` : ""}</span>}
              </p>
              <span className="shrink-0 text-xs text-muted-foreground">
                {log.createdAt.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </Card>
        );
      })}
      {rows.length === 0 && <p className="text-sm text-muted-foreground">No dispatcher activity yet.</p>}
    </div>
  );
}
