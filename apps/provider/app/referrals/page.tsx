import { redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { getReferralSummary } from "@asaplocal/core";
import { Card, formatPence } from "@asaplocal/ui";
import { CopyLink } from "./copy-link";
import { PageHeading } from "@/components/page-heading";

export default async function ReferralsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const summary = await getReferralSummary(session.user.id);

  return (
    <div>
      <PageHeading>Referrals</PageHeading>
      <p className="mt-1 text-muted-foreground">
        Invite another tradesperson to AsapLocal. When they make their first payment, you both get{" "}
        {formatPence(summary.rewardPence)} in credit.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xl font-bold">{formatPence(summary.creditBalancePence)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Credit earned</p>
        </Card>
        <Card className="p-4">
          <p className="text-xl font-bold">{summary.referralCount}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Signed up</p>
        </Card>
        <Card className="p-4">
          <p className="text-xl font-bold">{summary.completedCount}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Rewarded</p>
        </Card>
        <Card className="p-4">
          <p className="text-xl font-bold">{summary.pendingCount}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Pending</p>
        </Card>
      </div>

      <div className="mt-6 max-w-2xl space-y-4">
        <CopyLink
          title="Invite a tradesperson"
          hint="They'll land on business signup. Best for people you work alongside."
          link={summary.providerLink}
        />
        <CopyLink
          title="Invite a customer"
          hint="They'll land on the customer app to post their first job."
          link={summary.link}
        />
        <Card className="p-5">
          <p className="text-sm font-medium">Your code</p>
          <p className="mt-1 font-mono text-lg font-bold tracking-wider">{summary.code}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Rewards are credited automatically once the person you invited completes their first payment.
          </p>
        </Card>
      </div>
    </div>
  );
}
