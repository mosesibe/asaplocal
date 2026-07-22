import { prisma } from "@asaplocal/db";
import { JobRequestForm } from "./job-request-form";

export const metadata = { title: "Post a job — get quotes from local pros" };

export default async function NewJobPage({ searchParams }: { searchParams: Promise<{ businessId?: string; businessName?: string; category?: string }> }) {
  const sp = await searchParams;
  const categories = await prisma.category.findMany({ where: { isActive: true, parentId: null }, orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold">
        {sp.businessName ? `Request a quote from ${sp.businessName}` : "Post a job — no provider to choose, we'll bring them to you"}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {sp.businessName
          ? "Tell them what you need and they'll be notified immediately."
          : "Describe what you need done. Vetted local providers in your area will see your request and send you quotes — you pick who to book."}
      </p>
      <div className="mt-8">
        <JobRequestForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} targetBusinessId={sp.businessId} defaultCategorySlug={sp.category} />
      </div>
    </div>
  );
}
