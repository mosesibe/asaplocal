import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { ProfileForm } from "./profile-form";
import { AddressesSection } from "./addresses-section";
import { PageHeading } from "@/components/page-heading";

export default async function BusinessProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const business = await prisma.business.findUnique({
    where: { ownerId: session.user.id },
    include: { services: true, addresses: { orderBy: { createdAt: "asc" } } },
  });
  if (!business) redirect("/onboarding");

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <PageHeading>Business profile</PageHeading>
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
      <div className="mt-6">
        <AddressesSection
          addresses={business.addresses.map((a) => ({
            id: a.id,
            label: a.label,
            addressLine: a.addressLine,
            city: a.city,
            postcode: a.postcode,
          }))}
          primary={{ addressLine: business.addressLine, city: business.city, postcode: business.postcode }}
          isSoleTrader={business.businessType === "SOLE_TRADER"}
        />
      </div>
    </div>
  );
}
