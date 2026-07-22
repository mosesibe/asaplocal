import { redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { Badge, Card } from "@asaplocal/ui";
import { CheckoutButton } from "./checkout-button";

const PLANS = [
  { key: "FREE", name: "Free", price: "£0", features: ["Basic listing", "Pay-per-lead only"] },
  { key: "SUBSCRIPTION_PRO", name: "Pro", price: "£29/mo", features: ["15 leads/month included", "Analytics dashboard", "Better search ranking"] },
  { key: "SUBSCRIPTION_PREMIUM", name: "Premium", price: "£79/mo", features: ["40 leads/month included", "Featured placement", "Priority leads", "Advanced analytics"] },
  { key: "ENTERPRISE", name: "Enterprise", price: "Custom", features: ["Unlimited leads", "Dedicated account manager", "Custom integrations"] },
];

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id }, include: { subscription: true, leadCreditWallet: true } });
  if (!business) redirect("/onboarding");

  return (
    <div>
      <h1 className="text-2xl font-bold">Billing &amp; lead credits</h1>
      <p className="mt-1 text-muted-foreground">Current plan: <Badge>{business.subscription?.plan ?? "FREE"}</Badge></p>

      <h2 className="mt-8 mb-4 text-lg font-semibold">Subscription plans</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((p) => (
          <Card key={p.key} className="flex flex-col p-5">
            <p className="font-semibold">{p.name}</p>
            <p className="mt-1 text-2xl font-bold">{p.price}</p>
            <ul className="mt-3 flex-1 space-y-1 text-sm text-muted-foreground">
              {p.features.map((f) => <li key={f}>• {f}</li>)}
            </ul>
            {p.key === "SUBSCRIPTION_PRO" || p.key === "SUBSCRIPTION_PREMIUM" ? (
              <CheckoutButton kind={p.key as "SUBSCRIPTION_PRO" | "SUBSCRIPTION_PREMIUM"} className="mt-4" />
            ) : p.key === "ENTERPRISE" ? (
              <a href="mailto:sales@asaplocal.app" className="mt-4 text-center text-sm font-medium text-brand-700 hover:underline">Contact sales</a>
            ) : (
              <p className="mt-4 text-center text-sm text-muted-foreground">Current default</p>
            )}
          </Card>
        ))}
      </div>

      <h2 className="mt-10 mb-4 text-lg font-semibold">Lead credits — balance: {business.leadCreditWallet?.balance ?? 0}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="font-semibold">5 credits</p>
          <p className="text-sm text-muted-foreground">£4/credit — top up for occasional purchases</p>
          <CheckoutButton kind="CREDITS_SMALL" className="mt-3" />
        </Card>
        <Card className="p-5">
          <p className="font-semibold">20 credits</p>
          <p className="text-sm text-muted-foreground">£3.25/credit — best value</p>
          <CheckoutButton kind="CREDITS_LARGE" className="mt-3" />
        </Card>
      </div>
    </div>
  );
}
