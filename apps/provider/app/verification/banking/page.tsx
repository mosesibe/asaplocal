import { redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { Badge, Card, formatPence } from "@asaplocal/ui";
import { computeProviderBalance } from "@asaplocal/core";
import { StartBankingButton } from "./start-button";
import { WithdrawButton } from "./withdraw-button";
import { BackToVerificationCenter } from "../back-link";

export default async function BankingVerificationPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) redirect("/onboarding");

  const balance = await computeProviderBalance(business.id);

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <BackToVerificationCenter />
      <h1 className="mt-2 text-2xl font-bold">Banking</h1>
      <Card className="mt-6 space-y-4 p-6">
        <p className="text-sm text-muted-foreground">
          Connect your business bank account via Stripe to receive payouts. Your account and sort code are entered directly on Stripe's
          secure page — we never see or store them.
        </p>
        <div className="flex items-center gap-2 text-sm">
          <span>Status:</span>
          <Badge variant={business.payoutsEnabled ? "success" : "outline"}>{business.payoutsEnabled ? "Connected" : "Not connected"}</Badge>
        </div>
        {!business.payoutsEnabled && <StartBankingButton label={business.stripeAccountId ? "Continue setup" : "Connect bank account"} />}
      </Card>

      <Card className="mt-4 space-y-3 p-6">
        <h2 className="font-semibold">Earnings</h2>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Earned (after commission)</span><span>{formatPence(balance.settledPence)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Paid out</span><span>−{formatPence(balance.paidOutPence)}</span></div>
          <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold"><span>Available</span><span>{formatPence(balance.availablePence)}</span></div>
        </div>

        {balance.availablePence > 0 ? (
          business.payoutsEnabled ? (
            <>
              <p className="text-sm text-muted-foreground">
                Completed jobs are normally paid out automatically. Anything still sitting here can be sent now.
              </p>
              <WithdrawButton availablePence={balance.availablePence} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Connect your bank above and this balance will be sent automatically — nothing is lost while you're not set up.
            </p>
          )
        ) : (
          <p className="text-sm text-muted-foreground">
            Nothing waiting. Earnings appear here once a job is completed and paid in full.
          </p>
        )}
      </Card>
    </div>
  );
}
