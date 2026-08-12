import { redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { Badge, Card } from "@asaplocal/ui";
import { StartBankingButton } from "./start-button";
import { BackToVerificationCenter } from "../back-link";

export default async function BankingVerificationPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) redirect("/onboarding");

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
    </div>
  );
}
