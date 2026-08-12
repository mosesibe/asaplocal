import { redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { BusinessVerificationForm } from "./business-verification-form";
import { BackToVerificationCenter } from "../back-link";

export default async function BusinessVerificationPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const business = await prisma.business.findUnique({
    where: { ownerId: session.user.id },
    include: { verificationDocuments: true },
  });
  if (!business) redirect("/onboarding");

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <BackToVerificationCenter />
      <h1 className="mt-2 text-2xl font-bold">Business verification</h1>
      <BusinessVerificationForm
        businessType={business.businessType}
        verificationStatus={business.verificationStatus}
        companyRegistrationNumber={business.companyRegistrationNumber}
        companyDirectorName={business.companyDirectorName}
        companiesHouseDirectorMatch={business.companiesHouseDirectorMatch}
        documents={business.verificationDocuments.map((d) => ({ id: d.id, docType: d.docType, fileUrl: d.fileUrl }))}
      />
    </div>
  );
}
