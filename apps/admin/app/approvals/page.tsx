import { redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { Badge, Card } from "@asaplocal/ui";
import { ApprovalActions } from "./approval-actions";

export default async function ApprovalsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dispatcher");

  const pending = await prisma.approvalRequest.findMany({
    where: { status: "PENDING" },
    include: { requestedBy: true, jobRequest: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Dispatcher approval queue</h1>
      <p className="mt-1 text-sm text-muted-foreground">Every job assignment, edit, or cancellation proposed by a dispatcher lands here until you approve or reject it.</p>
      <div className="mt-6 space-y-3">
        {pending.map((req) => (
          <Card key={req.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{req.actionType.replace(/_/g, " ")} — {req.jobRequest?.title ?? "Unknown job"}</p>
                <p className="text-xs text-muted-foreground">Requested by {req.requestedBy.email} · {req.createdAt.toLocaleString("en-GB")}</p>
              </div>
              <Badge variant="outline">{req.status}</Badge>
            </div>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-2 text-xs">{JSON.stringify(req.payload, null, 2)}</pre>
            <ApprovalActions approvalId={req.id} />
          </Card>
        ))}
        {pending.length === 0 && <p className="text-sm text-muted-foreground">Nothing pending.</p>}
      </div>
    </div>
  );
}
