import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { Card } from "@asaplocal/ui";
import { VerificationStatusBadge } from "@/lib/verification-badge";
import { PageHeading } from "@/components/page-heading";
import { OnboardingProgress } from "@/components/onboarding-progress";
import { OnboardingContinueBar } from "@/components/onboarding-continue-bar";

// Rolls up a list of individual VerificationStatus values into one status
// for the summary row: complete only once everything submitted has been
// verified, surfaced as rejected/more-info-needed if any one item is, and
// pending otherwise (covers a mix of UNVERIFIED/PENDING items).
function aggregateStatus(statuses: (string | null | undefined)[]): string | null {
  const present = statuses.filter((s): s is string => !!s);
  if (present.length === 0) return null;
  if (present.every((s) => s === "VERIFIED")) return "VERIFIED";
  if (present.some((s) => s === "REJECTED")) return "REJECTED";
  if (present.some((s) => s === "MORE_INFO_REQUESTED")) return "MORE_INFO_REQUESTED";
  return "PENDING";
}

export default async function VerificationCenterPage({ searchParams }: { searchParams: Promise<{ onboarding?: string }> }) {
  const { onboarding } = await searchParams;
  const isOnboarding = onboarding === "1";

  const session = await auth();
  if (!session?.user) redirect("/login");

  const business = await prisma.business.findUnique({
    where: { ownerId: session.user.id },
    include: { identityVerification: true, insurancePolicies: true, qualifications: true, portfolioItems: true, references: true },
  });
  if (!business) redirect("/onboarding");

  const publicLiability = business.insurancePolicies.find((p) => p.type === "PUBLIC_LIABILITY");
  // References uses its own ReferenceStatus enum (REQUESTED/VERIFIED/EXPIRED)
  // rather than VerificationStatus — at least one verified referee is enough
  // to consider the section complete.
  const referencesStatus = business.references.length === 0 ? null : business.references.some((r) => r.status === "VERIFIED") ? "VERIFIED" : "PENDING";

  const sections = [
    { href: "/verification/identity", label: "Identity", status: business.identityVerification?.status },
    { href: "/verification/business", label: "Business", status: business.verificationStatus },
    {
      href: "/verification/qualifications",
      label: "Qualifications",
      status: aggregateStatus(business.qualifications.map((q) => q.status)),
      count: business.qualifications.length,
    },
    { href: "/verification/insurance", label: "Insurance", status: publicLiability?.status ?? null },
    { href: "/verification/banking", label: "Banking", status: business.payoutsEnabled ? "VERIFIED" : null },
    { href: "/profile", label: "Profile", status: business.profileCompletedAt ? "VERIFIED" : null },
    { href: "/portfolio", label: "Portfolio", status: business.portfolioItems.length > 0 ? "VERIFIED" : null },
    { href: "/references", label: "References", status: referencesStatus },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      {isOnboarding && <OnboardingProgress current={3} />}
      <PageHeading>Verification Center</PageHeading>
      <p className="mt-1 text-muted-foreground">
        Current trust tier: <span className="font-medium">{business.trustTier}</span>. Complete more sections to unlock higher tiers.
      </p>
      {isOnboarding && (
        <div className="mt-6">
          <OnboardingContinueBar
            label="Finish and go to dashboard"
            hint="These can all be completed later from your dashboard — verifying sooner just unlocks higher trust tiers faster."
            nextHref="/dashboard"
            markComplete
          />
        </div>
      )}
      <div className="mt-6 space-y-2">
        {sections.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="flex items-center justify-between p-4 transition-shadow hover:shadow-card">
              <span className="font-medium">{s.label}</span>
              <VerificationStatusBadge status={s.status} />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
