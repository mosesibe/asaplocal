import { redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { Card, formatPence } from "@asaplocal/ui";
import { CheckoutButton } from "../../billing/checkout-button";
import { PageHeading } from "@/components/page-heading";

export const metadata = { title: "Lead credits" };

export default async function LeadCreditsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const business = await prisma.business.findUnique({
    where: { ownerId: session.user.id },
    include: { leadCreditWallet: { include: { transactions: { orderBy: { createdAt: "desc" }, take: 20 } } } },
  });
  if (!business) redirect("/onboarding");

  const wallet = business.leadCreditWallet;

  return (
    <div>
      <PageHeading>Lead credits</PageHeading>
      <p className="mt-1 text-sm text-muted-foreground">
        Credits buy leads beyond your plan allowance. They never expire.
      </p>

      <Card className="mt-6 p-5">
        <p className="text-xs text-muted-foreground">Current balance</p>
        <p className="mt-0.5 text-3xl font-bold">{wallet?.balance ?? 0}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">credit{(wallet?.balance ?? 0) === 1 ? "" : "s"}</p>
      </Card>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Top up</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="font-semibold">5 credits</p>
          <p className="text-sm text-muted-foreground">{formatPence(400)}/credit — for occasional purchases</p>
          <CheckoutButton kind="CREDITS_SMALL" className="mt-3" />
        </Card>
        <Card className="p-5">
          <p className="font-semibold">20 credits</p>
          <p className="text-sm text-muted-foreground">{formatPence(325)}/credit — best value</p>
          <CheckoutButton kind="CREDITS_LARGE" className="mt-3" />
        </Card>
      </div>

      <h2 className="mb-2 mt-8 text-lg font-semibold">History</h2>
      <div className="space-y-2">
        {(wallet?.transactions ?? []).map((t) => (
          <Card key={t.id} className="flex items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm">{t.description ?? t.type.replace(/_/g, " ")}</p>
              <p className="text-xs text-muted-foreground">
                {t.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
            <span className={`shrink-0 font-medium ${t.amount >= 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
              {t.amount >= 0 ? "+" : ""}{t.amount}
            </span>
          </Card>
        ))}
        {(wallet?.transactions ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No credit activity yet.</p>
        )}
      </div>
    </div>
  );
}
