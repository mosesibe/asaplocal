import { redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { InsuranceForm } from "./insurance-form";
import { BackToVerificationCenter } from "../back-link";

export default async function InsurancePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id }, include: { insurancePolicies: true } });
  if (!business) redirect("/onboarding");

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <BackToVerificationCenter />
      <h1 className="mt-2 text-2xl font-bold">Insurance</h1>
      <p className="mt-1 text-muted-foreground">Public Liability is required. Professional Indemnity and Employer's Liability are optional.</p>
      <InsuranceForm
        policies={business.insurancePolicies.map((p) => ({
          type: p.type,
          provider: p.provider,
          policyNumber: p.policyNumber,
          expiryDate: p.expiryDate.toISOString().slice(0, 10),
          coverageAmountPence: p.coverageAmountPence,
          documentUrl: p.documentUrl,
          status: p.status,
        }))}
      />
    </div>
  );
}
