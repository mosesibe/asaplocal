import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { computeProviderBalance } from "@asaplocal/core";
import { Badge, Card, formatPence } from "@asaplocal/ui";

export const metadata = { title: "Invoices & payouts" };

export default async function EarningsInvoicesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) redirect("/onboarding");

  const [settled, payouts, balance] = await Promise.all([
    prisma.booking.findMany({
      where: { businessId: business.id, settledAt: { not: null } },
      orderBy: { settledAt: "desc" },
      include: { jobRequest: true, customer: { include: { profile: true } }, payouts: true },
    }),
    prisma.payout.findMany({ where: { businessId: business.id }, orderBy: { paidAt: "desc" }, take: 20 }),
    computeProviderBalance(business.id),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Invoices &amp; payouts</h1>
      <p className="mt-1 text-sm text-muted-foreground">Every completed job, what the customer paid, and what reached you.</p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Earned</p>
          <p className="mt-0.5 text-lg font-bold">{formatPence(balance.settledPence)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Paid out</p>
          <p className="mt-0.5 text-lg font-bold">{formatPence(balance.paidOutPence)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Available</p>
          <p className="mt-0.5 text-lg font-bold">{formatPence(balance.availablePence)}</p>
        </Card>
      </div>

      <h2 className="mb-2 mt-8 text-lg font-semibold">Job earnings</h2>
      <div className="space-y-2">
        {settled.map((b) => {
          const gross = (b.providerNetPence ?? 0) + (b.platformFeePence ?? 0);
          const paid = b.payouts.length > 0;
          return (
            <Card key={b.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/calendar/${b.id}`} className="font-medium text-brand-700 hover:underline dark:text-brand-300">
                    {b.jobRequest?.title ?? "Booking"}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {b.customer.profile?.firstName} {b.customer.profile?.lastName}
                    {b.settledAt && ` · settled ${b.settledAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
                  </p>
                </div>
                <Badge variant={paid ? "success" : "warning"}>{paid ? "Paid out" : "Awaiting payout"}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Customer paid</p>
                  <p>{formatPence(gross)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Commission</p>
                  <p className="text-muted-foreground">−{formatPence(b.platformFeePence ?? 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Your earnings</p>
                  <p className="font-semibold">{formatPence(b.providerNetPence ?? 0)}</p>
                </div>
              </div>
            </Card>
          );
        })}
        {settled.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No settled jobs yet. Earnings appear here once a job is completed and paid in full.
          </p>
        )}
      </div>

      <h2 className="mb-2 mt-8 text-lg font-semibold">Payout history</h2>
      <div className="space-y-2">
        {payouts.map((p) => (
          <Card key={p.id} className="flex items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{p.reference ?? "Payout"}</p>
              <p className="text-xs text-muted-foreground">
                {p.paidAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} ·{" "}
                {p.method === "STRIPE_CONNECT" ? "Bank transfer (automatic)" : "Bank transfer (manual)"}
              </p>
            </div>
            <span className="shrink-0 font-medium">{formatPence(p.amountPence)}</span>
          </Card>
        ))}
        {payouts.length === 0 && <p className="text-sm text-muted-foreground">No payouts sent yet.</p>}
      </div>
    </div>
  );
}
