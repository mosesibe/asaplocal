import { prisma } from "@asaplocal/db";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, parentId: true },
  });

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold">Set up your business profile</h1>
      <p className="mt-1 text-muted-foreground">Takes a few minutes — you'll get 2 free lead credits to try the marketplace.</p>
      <OnboardingForm categories={categories} />
    </div>
  );
}
