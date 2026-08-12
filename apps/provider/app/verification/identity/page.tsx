import { redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { Badge, Card } from "@asaplocal/ui";
import { StartIdentityVerificationButton } from "./start-button";
import { BackToVerificationCenter } from "../back-link";

export default async function IdentityVerificationPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id }, include: { identityVerification: true } });
  if (!business) redirect("/onboarding");

  const identity = business.identityVerification;

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <BackToVerificationCenter />
      <h1 className="mt-2 text-2xl font-bold">Identity verification</h1>
      <Card className="mt-6 space-y-4 p-6">
        <p className="text-sm text-muted-foreground">
          Confirm your identity with a government-issued ID (passport, driving licence, or national ID) and a quick selfie. This happens on
          Stripe's secure verification page — we never see or store your documents.
        </p>
        {identity && (
          <div className="flex items-center gap-2 text-sm">
            <span>Status:</span>
            <Badge variant={identity.status === "VERIFIED" ? "success" : identity.status === "REJECTED" ? "destructive" : "warning"}>{identity.status}</Badge>
          </div>
        )}
        {identity?.lastError && <p className="text-sm text-red-600">{identity.lastError}</p>}
        {identity?.status !== "VERIFIED" && (
          <StartIdentityVerificationButton label={identity ? "Restart verification" : "Start identity verification"} />
        )}
      </Card>
    </div>
  );
}
