import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { Badge, Card, formatPence } from "@asaplocal/ui";

function formatBudget(minPence: number | null, maxPence: number | null): string | null {
  if (minPence && maxPence) return `${formatPence(minPence)}–${formatPence(maxPence)}`;
  if (minPence) return `From ${formatPence(minPence)}`;
  if (maxPence) return `Up to ${formatPence(maxPence)}`;
  return null;
}

export default async function ActivityPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/activity");

  const [jobRequests, bookings, payments] = await Promise.all([
    prisma.jobRequest.findMany({ where: { customerId: session.user.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.booking.findMany({ where: { customerId: session.user.id }, include: { business: true }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.payment.findMany({ where: { userId: session.user.id, status: "SUCCEEDED" }, include: { business: true }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  const hasActivity = jobRequests.length > 0 || bookings.length > 0 || payments.length > 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 pb-28 sm:px-6">
      <h1 className="text-2xl font-bold">Activity</h1>
      <p className="mt-1 text-sm text-muted-foreground">Everything you've done on LocalConnect so far.</p>

      {!hasActivity && (
        <p className="mt-8 text-sm text-muted-foreground">
          No activity yet — <Link href="/jobs/new" className="text-brand-700 hover:underline">post a job</Link> to get started.
        </p>
      )}

      {jobRequests.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Job requests</h2>
            <Link href="/jobs/new" className="text-sm text-brand-700 hover:underline">Post another →</Link>
          </div>
          <div className="space-y-2">
            {jobRequests.map((j) => {
              const budget = formatBudget(j.budgetMinPence, j.budgetMaxPence);
              return (
                <Link key={j.id} href={`/jobs/${j.id}`}>
                  <Card className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{j.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {j.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        {" · "}
                        {j.addressLine ? `${j.addressLine}, ${j.city}` : j.city}
                      </p>
                      <p className="text-xs text-muted-foreground">{budget ? `Expected cost: ${budget}` : "No budget set"}</p>
                    </div>
                    <Badge variant="outline" className="w-fit">{j.status.replace("_", " ")}</Badge>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {bookings.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Bookings</h2>
          <div className="space-y-2">
            {bookings.map((b) => (
              <Link key={b.id} href={`/bookings/${b.id}`}>
                <Card className="flex items-center justify-between gap-2 p-4">
                  <div>
                    <p className="font-medium">{b.business.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatPence(b.totalAmountPence)} · {b.scheduledDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <Badge variant="outline">{b.status}</Badge>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {payments.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Payments</h2>
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {payments.map((p) => (
              <Link
                key={p.id}
                href={p.bookingId ? `/bookings/${p.bookingId}` : "#"}
                className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted"
              >
                <div>
                  <p className="font-medium">{p.business?.name ?? p.type.replace("_", " ")}</p>
                  <p className="text-xs text-muted-foreground">{p.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
                <span className="font-medium">{formatPence(p.amountPence)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
