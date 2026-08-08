import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { ProfileForm } from "./profile-form";

export default async function BusinessProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id }, include: { services: true } });
  if (!business) redirect("/onboarding");

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Business profile</h1>
          <p className="mt-1 text-muted-foreground">This is what customers see on your public listing.</p>
        </div>
        <Link href="/profile/preview" className="text-sm font-medium text-brand-700 hover:underline">
          Preview my listing →
        </Link>
      </div>
      <div className="mt-6">
        <ProfileForm
          business={{
            description: business.description ?? "",
            logoUrl: business.logoUrl ?? "",
            coverImageUrl: business.coverImageUrl ?? "",
            phone: business.phone ?? "",
            website: business.website ?? "",
            baseRadiusMiles: business.baseRadiusMiles,
            photoUrls: business.photoUrls,
            languagesSpoken: business.languagesSpoken,
            emergencyCalloutsAvailable: business.emergencyCalloutsAvailable,
            workingHours: (business.workingHours as any) ?? null,
            targetResponseMins: business.targetResponseMins ?? undefined,
          }}
        />
      </div>
    </div>
  );
}
