import { redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { QualificationsForm } from "./qualifications-form";
import { BackToVerificationCenter } from "../back-link";

export default async function QualificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const business = await prisma.business.findUnique({
    where: { ownerId: session.user.id },
    include: { qualifications: true, services: { include: { category: true } } },
  });
  if (!business) redirect("/onboarding");

  const regulatedCategories = business.services.map((s) => s.category).filter((c) => c.isRegulatedTrade);
  const suggested = Array.from(new Set(regulatedCategories.flatMap((c) => c.suggestedQualifications)));

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <BackToVerificationCenter />
      <h1 className="mt-2 text-2xl font-bold">Qualifications</h1>
      <p className="mt-1 text-muted-foreground">
        {regulatedCategories.length > 0
          ? `Suggested for ${regulatedCategories.map((c) => c.name).join(", ")}: ${suggested.join(", ") || "—"}`
          : "Add any relevant qualifications or certifications."}
      </p>
      <QualificationsForm
        categories={regulatedCategories.map((c) => ({ id: c.id, name: c.name }))}
        existing={business.qualifications.map((q) => ({ id: q.id, name: q.name, status: q.status, documentUrl: q.documentUrl }))}
      />
    </div>
  );
}
