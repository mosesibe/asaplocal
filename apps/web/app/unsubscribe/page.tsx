import Link from "next/link";
import { prisma } from "@asaplocal/db";
import { Card } from "@asaplocal/ui";

export const metadata = { title: "Unsubscribe" };

/**
 * One-click unsubscribe, no login required — a recipient who no longer has an
 * account password (or never signs in) must still be able to opt out.
 * Only ever turns marketing *off*, so a leaked link can't be used to opt
 * someone in.
 */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  const user = token ? await prisma.user.findUnique({ where: { unsubscribeToken: token } }) : null;
  if (user && (user.marketingEmail || user.marketingSms)) {
    await prisma.user.update({
      where: { id: user.id },
      data: { marketingEmail: false, marketingSms: false, marketingConsentSource: "unsubscribe-link" },
    });
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <Card className="p-6 text-center">
        {user ? (
          <>
            <h1 className="text-xl font-bold">You're unsubscribed</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We won't send you marketing emails again. You'll still get essential messages about your bookings, payments
              and receipts — those aren't marketing and can't be turned off.
            </p>
            <Link href="/dashboard" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline dark:text-brand-300">
              Manage all preferences →
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold">Link not recognised</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This unsubscribe link is invalid or has already been used. You can change your preferences from your account.
            </p>
            <Link href="/dashboard" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline dark:text-brand-300">
              Go to my account →
            </Link>
          </>
        )}
      </Card>
    </div>
  );
}
