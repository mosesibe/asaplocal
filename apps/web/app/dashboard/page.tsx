import { redirect } from "next/navigation";
import Link from "next/link";
import { HelpCircle, FileText, Shield, Receipt } from "lucide-react";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { formatPence } from "@asaplocal/ui";
import { getCustomerAccountStats, getSignInMethods } from "@asaplocal/core";
import { InstallAppBanner } from "@/components/install-app-banner";
import { SignOutButton } from "@/components/sign-out-button";
import { ProfileCard } from "@/components/account/profile-card";
import { SectionCard, SectionRow } from "@/components/account/section-row";
import { VerifyPhoneRow } from "@/components/account/verify-phone";
import { VerifyEmailRow } from "@/components/account/verify-email";
import { PreferencesRows } from "@/components/account/preferences";
import { ReferralCard } from "@/components/account/referral-card";
import { AddressesSection } from "@/components/account/addresses-section";
import { SecuritySection } from "@/components/account/security-section";
import { DeleteAccountSection } from "@/components/account/delete-account-section";

export default async function CustomerDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/dashboard");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true, addresses: { orderBy: { createdAt: "desc" } }, accounts: true, authenticators: true },
  });
  // Stale/invalid session (e.g. the account behind it no longer exists) —
  // bounce to login rather than crash.
  if (!user) redirect("/login?callbackUrl=/dashboard");

  const [stats, payments] = await Promise.all([
    getCustomerAccountStats(session.user.id),
    prisma.payment.findMany({
      where: { userId: session.user.id, status: "SUCCEEDED" },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { business: true },
    }),
  ]);

  const name = user.profile ? `${user.profile.firstName} ${user.profile.lastName}` : user.name ?? user.email;
  const contact = user.email + (user.phone ? ` · ${user.phone}` : "");
  const signInMethods = getSignInMethods(user, user.accounts);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My account</h1>
        <SignOutButton />
      </div>
      <div className="mt-6">
        <InstallAppBanner />
      </div>

      {/* Section 1 — profile & activity */}
      <div className="mt-6">
        <ProfileCard
          name={name}
          avatarUrl={user.image ?? user.profile?.avatarUrl}
          contact={contact}
          status={user.status}
          memberSince={user.createdAt}
          totalSpentPence={stats.totalSpentPence}
          servicesRequested={stats.servicesRequested}
        />
      </div>

      {/* Section 2 — account */}
      <div className="mt-8">
        <SectionCard title="Account">
          <VerifyEmailRow email={user.email} verified={Boolean(user.emailVerified)} />
          <VerifyPhoneRow phone={user.phone} verified={Boolean(user.phoneVerifiedAt)} />
          <PreferencesRows />
          <SectionRow
            icon={Receipt}
            label="Invoices and receipts"
            description={payments.length > 0 ? `${payments.length} payment${payments.length === 1 ? "" : "s"}` : "No payments yet"}
          />
          <ReferralCard />
        </SectionCard>
        {payments.length > 0 && (
          <div className="mt-2 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
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
        )}
      </div>

      {/* Section 3 — addresses */}
      <div className="mt-8">
        <AddressesSection
          addresses={user.addresses.map((a) => ({ id: a.id, addressLine: a.addressLine, city: a.city, postcode: a.postcode }))}
        />
      </div>

      {/* Section 4 — security */}
      <div className="mt-8">
        <SecuritySection signInMethods={signInMethods} hasPasskey={user.authenticators.length > 0} />
      </div>

      {/* Section 5 — support */}
      <div className="mt-8">
        <SectionCard title="Support">
          <SectionRow as={Link} href="/help" icon={HelpCircle} label="Help center" />
          <SectionRow as={Link} href="/terms" icon={FileText} label="Terms of service" />
          <SectionRow as={Link} href="/privacy" icon={Shield} label="Privacy policy" />
        </SectionCard>
      </div>

      {/* Section 6 — danger zone */}
      <div className="mt-8">
        <DeleteAccountSection />
      </div>
    </div>
  );
}
