import { prisma } from "@asaplocal/db";
import { Badge, Card } from "@asaplocal/ui";
import { DeletionRequestActions } from "./deletion-request-actions";

export default async function DeletionRequestsPage() {
  const requests = await prisma.accountDeletionRequest.findMany({
    include: { user: { include: { profile: true } }, reviewedBy: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Account deletion requests</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Customers and providers asking to have their account closed. Approving deactivates the account.
      </p>
      <div className="mt-6 space-y-3">
        {requests.map((r) => {
          const name = r.user.profile ? `${r.user.profile.firstName} ${r.user.profile.lastName}` : (r.user.name ?? r.user.email);
          return (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{name} <span className="font-normal text-muted-foreground">— {r.user.email}</span></p>
                  <p className="text-xs text-muted-foreground">
                    {r.user.role} · requested {r.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    {r.reviewedBy && ` · reviewed by ${r.reviewedBy.email}`}
                  </p>
                </div>
                <Badge variant={r.status === "PENDING" ? "warning" : r.status === "APPROVED" ? "destructive" : "outline"}>{r.status}</Badge>
              </div>
              {r.reason && <p className="mt-2 text-sm text-muted-foreground">"{r.reason}"</p>}
              {r.status === "PENDING" && (
                <div className="mt-3">
                  <DeletionRequestActions requestId={r.id} />
                </div>
              )}
            </Card>
          );
        })}
        {requests.length === 0 && <p className="text-sm text-muted-foreground">No account deletion requests.</p>}
      </div>
    </div>
  );
}
