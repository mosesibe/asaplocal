import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { Badge, Card, cn } from "@asaplocal/ui";
import { CheckoutButton } from "../../billing/checkout-button";
import { PlanAction } from "./plan-actions";
import { PageHeading } from "@/components/page-heading";

export const metadata = { title: "Subscription" };

const PLANS = [
  { key: "FREE", name: "Free", price: "£0", leads: 0, features: ["Basic listing", "Pay-per-lead only"] },
  { key: "PRO", name: "Pro", price: "£29/mo", leads: 15, features: ["15 leads/month included", "Analytics dashboard", "Better search ranking"] },
  { key: "PREMIUM", name: "Premium", price: "£79/mo", leads: 40, features: ["40 leads/month included", "Featured placement", "Priority leads", "Advanced analytics"] },
  { key: "ENTERPRISE", name: "Enterprise", price: "Custom", leads: null, features: ["Unlimited leads", "Dedicated account manager", "Custom integrations"] },
] as const;

const RANK: Record<string, number> = { FREE: 0, PRO: 1, PREMIUM: 2, ENTERPRISE: 3 };

export default async function SubscriptionPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const business = await prisma.business.findUnique({
    where: { ownerId: session.user.id },
    include: { subscription: true },
  });
  if (!business) redirect("/onboarding");

  const sub = business.subscription;
  const plan = sub?.plan ?? "FREE";
  const isPaid = plan === "PRO" || plan === "PREMIUM";
  const used = sub?.leadAllowanceUsed ?? 0;
  const allowance = sub?.monthlyLeadAllowance ?? 0;

  return (
    <div>
      <PageHeading>Subscription</PageHeading>
      <p className="mt-1 text-sm text-muted-foreground">Your plan, allowance, and how to change it.</p>

      <Card className="mt-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">Current plan</p>
            <p className="mt-0.5 text-2xl font-bold">{plan}</p>
          </div>
          <div className="text-right">
            <Badge variant={sub?.status === "ACTIVE" ? "success" : sub?.status ? "warning" : "outline"}>
              {sub?.status ?? "No subscription"}
            </Badge>
            {sub?.currentPeriodEnd && (
              <p className="mt-1 text-xs text-muted-foreground">
                {sub.cancelAtPeriodEnd ? "Ends" : "Renews"} {sub.currentPeriodEnd.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            )}
          </div>
        </div>

        {allowance > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Lead allowance</span>
              <span>{Math.max(0, allowance - used)} of {allowance} left</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-brand-600" style={{ width: `${Math.min(100, (used / allowance) * 100)}%` }} />
            </div>
          </div>
        )}

        {sub?.cancelAtPeriodEnd && (
          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
            <p className="text-sm font-medium">Your plan is set to end</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              You'll keep {plan} benefits until the date above, then drop to Free.
            </p>
            <PlanAction body={{ action: "resume" }} label="Keep my plan" variant="outline" className="mt-2 max-w-[200px]" />
          </div>
        )}
      </Card>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Plans</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((p) => {
          const isCurrent = p.key === plan;
          const direction = RANK[p.key]! > RANK[plan]! ? "up" : "down";
          return (
            <Card key={p.key} className={cn("flex flex-col p-5", isCurrent && "border-brand-500 ring-1 ring-brand-500")}>
              <div className="flex items-center justify-between">
                <p className="font-semibold">{p.name}</p>
                {isCurrent && <Badge variant="secondary">Current</Badge>}
              </div>
              <p className="mt-1 text-2xl font-bold">{p.price}</p>
              <ul className="mt-3 flex-1 space-y-1.5 text-sm text-muted-foreground">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-1.5">
                    <Check size={14} className="mt-0.5 shrink-0 text-brand-600" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-4">
                {isCurrent ? (
                  <p className="text-center text-sm text-muted-foreground">Your current plan</p>
                ) : p.key === "ENTERPRISE" ? (
                  <a href="mailto:sales@asaplocal.pro" className="block text-center text-sm font-medium text-brand-700 hover:underline dark:text-brand-300">
                    Contact sales
                  </a>
                ) : p.key === "FREE" ? (
                  isPaid ? (
                    <PlanAction
                      body={{ action: "cancel" }}
                      label="Downgrade to Free"
                      variant="outline"
                      confirm="Your plan will stay active until the end of the current billing period, then drop to Free. Continue?"
                    />
                  ) : (
                    <p className="text-center text-sm text-muted-foreground">Default plan</p>
                  )
                ) : isPaid ? (
                  <PlanAction
                    body={{ action: "change_plan", plan: p.key as "PRO" | "PREMIUM" }}
                    label={direction === "up" ? `Upgrade to ${p.name}` : `Switch to ${p.name}`}
                    variant={direction === "up" ? "default" : "outline"}
                    confirm={
                      direction === "up"
                        ? undefined
                        : `Switching to ${p.name} reduces your monthly lead allowance. The difference is credited to your account. Continue?`
                    }
                  />
                ) : (
                  <CheckoutButton kind={p.key === "PRO" ? "SUBSCRIPTION_PRO" : "SUBSCRIPTION_PREMIUM"} className="w-full" />
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Plan changes take effect immediately and are prorated — you're only charged for what you use.
        Cancelling keeps your benefits until the end of the period you've already paid for.
      </p>
    </div>
  );
}
