import { prisma } from "@asaplocal/db";
import { Badge, Card, formatPence } from "@asaplocal/ui";
import { RefundActions } from "./refund-actions";

export default async function RefundsPage() {
  const refundRequests = await prisma.refundRequest.findMany({
    where: { status: "PENDING" },
    include: { leadAccess: { include: { business: true, lead: { include: { jobRequest: true } } } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Lead refund requests</h1>
      <p className="mt-1 text-sm text-muted-foreground">Providers flagging invalid leads (wrong area, duplicate, spam, unresponsive customer). Approving reverses the charge/credit/allowance and re-opens a slot on the lead.</p>
      <div className="mt-6 space-y-3">
        {refundRequests.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{r.leadAccess.business.name} — {r.leadAccess.lead.jobRequest.title}</p>
                <p className="text-xs text-muted-foreground">
                  {r.reason.replace(/_/g, " ")} · paid {formatPence(r.leadAccess.pricePaidPence)} via {r.leadAccess.acquisitionType.replace("_", " ").toLowerCase()}
                </p>
              </div>
              <Badge variant="outline">{r.status}</Badge>
            </div>
            {r.details && <p className="mt-2 text-sm text-muted-foreground">"{r.details}"</p>}
            <RefundActions refundRequestId={r.id} />
          </Card>
        ))}
        {refundRequests.length === 0 && <p className="text-sm text-muted-foreground">No pending refund requests.</p>}
      </div>
    </div>
  );
}
