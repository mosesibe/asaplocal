import Link from "next/link";
import { prisma } from "@asaplocal/db";
import { Badge, Card } from "@asaplocal/ui";

function fmtDateTime(d: Date) {
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/**
 * Read-only visibility for staff — resolution happens between the customer
 * and provider apps (raise → provider responds → customer reconfirms), not
 * here. This is just so a stuck or repeatedly-reopened dispute is visible.
 */
export default async function DisputesPage() {
  const [open, recentlyResolved] = await Promise.all([
    prisma.bookingDispute.findMany({
      where: { status: "OPEN" },
      include: { booking: { include: { business: true, jobRequest: true } }, raisedBy: { include: { profile: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.bookingDispute.findMany({
      where: { status: "RESOLVED" },
      include: { booking: { include: { business: true, jobRequest: true } }, raisedBy: { include: { profile: true } } },
      orderBy: { resolvedAt: "desc" },
      take: 20,
    }),
  ]);

  function customerName(raisedBy: (typeof open)[number]["raisedBy"]) {
    return raisedBy.profile ? `${raisedBy.profile.firstName} ${raisedBy.profile.lastName}` : raisedBy.email;
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Disputes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Customers reporting an issue instead of accepting a completed job. Resolution happens between the customer and provider — this is a visibility queue, not an action queue.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Open ({open.length})</h2>
        <div className="space-y-3">
          {open.map((d) => (
            <Link key={d.id} href={d.booking.jobRequestId ? `/operations/jobs/${d.booking.jobRequestId}` : "#"}>
              <Card className="p-4 transition-shadow hover:shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{d.booking.jobRequest?.title ?? "Booking"} — {d.booking.business.name}</p>
                    <p className="text-xs text-muted-foreground">Raised by {customerName(d.raisedBy)} · {fmtDateTime(d.createdAt)}</p>
                  </div>
                  <Badge variant="destructive">OPEN</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{d.reason}</p>
              </Card>
            </Link>
          ))}
          {open.length === 0 && <p className="text-sm text-muted-foreground">No open disputes.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Recently resolved</h2>
        <div className="space-y-3">
          {recentlyResolved.map((d) => (
            <Link key={d.id} href={d.booking.jobRequestId ? `/operations/jobs/${d.booking.jobRequestId}` : "#"}>
              <Card className="p-4 transition-shadow hover:shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{d.booking.jobRequest?.title ?? "Booking"} — {d.booking.business.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Raised by {customerName(d.raisedBy)} · resolved {d.resolvedAt ? fmtDateTime(d.resolvedAt) : "—"}
                    </p>
                  </div>
                  <Badge variant="success">RESOLVED</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{d.reason}</p>
              </Card>
            </Link>
          ))}
          {recentlyResolved.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
        </div>
      </section>
    </div>
  );
}
