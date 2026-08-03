import { redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { ReferencesManager } from "./references-manager";

export default async function ReferencesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id }, include: { references: { orderBy: { requestedAt: "desc" } } } });
  if (!business) redirect("/onboarding");

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold">References</h1>
      <p className="mt-1 text-muted-foreground">Optional — request 2-3 customer references. They'll get an email to confirm.</p>
      <ReferencesManager
        references={business.references.map((r) => ({ id: r.id, refereeName: r.refereeName, refereeEmail: r.refereeEmail, status: r.status, testimonial: r.testimonial }))}
      />
    </div>
  );
}
