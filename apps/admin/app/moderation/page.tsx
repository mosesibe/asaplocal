import { prisma } from "@asaplocal/db";
import { Badge, Card } from "@asaplocal/ui";
import { ReviewModerationActions } from "./review-moderation-actions";
import { ReportResolveActions } from "./report-resolve-actions";

export default async function ModerationPage() {
  const [flaggedReviews, pendingBusinesses, openReports] = await Promise.all([
    prisma.review.findMany({ where: { status: "FLAGGED" }, include: { business: true, author: { include: { profile: true } } } }),
    prisma.business.findMany({ where: { verificationStatus: "PENDING" }, take: 20 }),
    prisma.report.findMany({ where: { status: "OPEN" }, include: { reporter: true }, take: 20 }),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Moderation</h1>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">AI-flagged reviews ({flaggedReviews.length})</h2>
        <div className="space-y-3">
          {flaggedReviews.map((r) => (
            <Card key={r.id} className="p-4">
              <p className="text-sm font-medium">{r.business.name} — {r.rating}★</p>
              <p className="mt-1 text-sm text-muted-foreground">{r.comment}</p>
              <p className="mt-1 text-xs text-amber-700">Flag reason: {r.aiFlagReason}</p>
              <ReviewModerationActions reviewId={r.id} />
            </Card>
          ))}
          {flaggedReviews.length === 0 && <p className="text-sm text-muted-foreground">Nothing flagged.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Businesses pending verification ({pendingBusinesses.length})</h2>
        <div className="space-y-2">
          {pendingBusinesses.map((b) => (
            <Card key={b.id} className="flex items-center justify-between p-4">
              <p className="font-medium">{b.name}</p>
              <Badge variant="warning">PENDING</Badge>
            </Card>
          ))}
          {pendingBusinesses.length === 0 && <p className="text-sm text-muted-foreground">None pending.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Open reports ({openReports.length})</h2>
        <div className="space-y-3">
          {openReports.map((r) => (
            <Card key={r.id} className="p-4">
              <p className="text-sm font-medium">{r.targetType} — {r.reason}</p>
              <p className="mt-1 text-sm text-muted-foreground">{r.details}</p>
              <p className="mt-1 text-xs text-muted-foreground">Reported by {r.reporter.email}</p>
              <ReportResolveActions reportId={r.id} />
            </Card>
          ))}
          {openReports.length === 0 && <p className="text-sm text-muted-foreground">No open reports.</p>}
        </div>
      </section>
    </div>
  );
}
