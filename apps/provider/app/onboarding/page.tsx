import { redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [categories, user] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, parentId: true },
    }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true, phone: true } }),
  ]);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold">Set up your business profile</h1>
      <p className="mt-1 text-muted-foreground">Takes a few minutes — you'll get 2 free lead credits to try the marketplace.</p>
      <OnboardingForm categories={categories} contactEmail={user?.email ?? ""} contactPhone={user?.phone ?? ""} />
    </div>
  );
}
