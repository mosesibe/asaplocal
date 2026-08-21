import Link from "next/link";
import { redirect } from "next/navigation";
import { Receipt, CreditCard, Coins, Wallet } from "lucide-react";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { computeProviderBalance } from "@asaplocal/core";
import { Badge, Card, formatPence } from "@asaplocal/ui";

export const metadata = { title: "Earnings" };

export default async function EarningsOverviewPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const business = await prisma.business.findUnique({
    where: { ownerId: session.user.id },
    include: { subscription: true, leadCreditWallet: true },
  });
  if (!business) redirect("/onboarding");

  const [balance, settledCount, lastPayout] = await Promise.all([
    computeProviderBalance(business.id),
    prisma.booking.count({ where: { businessId: business.id, settledAt: { not: null } } }),
    prisma.payout.findFirst({ where: { businessId: business.id }, orderBy: { paidAt: "desc" } }),
  ]);

  const plan = business.subscription?.plan ?? "FREE";
  const allowance = business.subscription
    ? business.subscription.monthlyLeadAllowance - business.subscription.leadAllowanceUsed
    : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold">Earnings</h1>
      <p className="mt-1 text-sm text-muted-foreground">What you've earned, what's been paid out, and what you're paying us.</p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Earned (after commission)</p>
          <p className="mt-0.5 text-xl font-bold">{formatPence(balance.settledPence)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{settledCount} settled job{settledCount === 1 ? "" : "s"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Paid out</p>
          <p className="mt-0.5 text-xl font-bold">{formatPence(balance.paidOutPence)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {lastPayout ? `Last ${lastPayout.paidAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : "No payouts yet"}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Available</p>
          <p className="mt-0.5 text-xl font-bold">{formatPence(balance.availablePence)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {business.payoutsEnabled ? "Paid out automatically" : "Connect a bank to release"}
          </p>
        </Card>
      </div>

      {balance.availablePence > 0 && !business.payoutsEnabled && (
        <Card className="mt-4 border-brand-200 bg-brand-50/60 p-4 dark:border-brand-800 dark:bg-brand-950/20">
          <p className="text-sm font-medium">You have {formatPence(balance.availablePence)} waiting</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Connect your bank account and we'll send it straight away — nothing is lost while you're not set up.
          </p>
          <Link href="/verification/banking" className="mt-2 inline-block text-sm font-medium text-brand-700 hover:underline dark:text-brand-300">
            Connect bank account →
          </Link>
        </Card>
      )}

      <div className="mt-6 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        <Link href="/earnings/invoices" className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted">
          <Receipt size={18} className="shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Invoices &amp; payouts</p>
            <p className="text-xs text-muted-foreground">Per-job breakdown of what you earned and were paid</p>
          </div>
        </Link>
        <Link href="/earnings/subscription" className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted">
          <CreditCard size={18} className="shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Subscription</p>
            <p className="text-xs text-muted-foreground">{allowance} plan lead{allowance === 1 ? "" : "s"} left this month</p>
          </div>
          <Badge variant={plan === "FREE" ? "outline" : "secondary"}>{plan}</Badge>
        </Link>
        <Link href="/earnings/credits" className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted">
          <Coins size={18} className="shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Lead credits</p>
            <p className="text-xs text-muted-foreground">Top up to buy leads outside your plan allowance</p>
          </div>
          <Badge variant="outline">{business.leadCreditWallet?.balance ?? 0}</Badge>
        </Link>
        <Link href="/verification/banking" className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted">
          <Wallet size={18} className="shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Bank account</p>
            <p className="text-xs text-muted-foreground">Where your payouts are sent</p>
          </div>
          <Badge variant={business.payoutsEnabled ? "success" : "outline"}>
            {business.payoutsEnabled ? "Connected" : "Not connected"}
          </Badge>
        </Link>
      </div>
    </div>
  );
}
