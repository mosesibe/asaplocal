import { notFound, redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { Badge, Card } from "@asaplocal/ui";
import { StaffForm } from "../staff-form";
import { ToggleActiveButton } from "./toggle-active-button";

const STATUS_VARIANT = {
  VERIFIED: "success",
  PENDING: "warning",
  MORE_INFO_REQUESTED: "warning",
  REJECTED: "destructive",
  UNVERIFIED: "outline",
} as const;

export default async function StaffDetailPage({ params }: { params: Promise<{ staffId: string }> }) {
  const { staffId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) redirect("/onboarding");

  const staffMember = await prisma.staffMember.findUnique({ where: { id: staffId } });
  if (!staffMember || staffMember.businessId !== business.id) notFound();

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{staffMember.fullName}</h1>
        <Badge variant={STATUS_VARIANT[staffMember.approvalStatus]}>{staffMember.approvalStatus.replace(/_/g, " ")}</Badge>
      </div>

      {staffMember.reviewNote && (
        <Card className="mt-4 space-y-1 p-4">
          <p className="text-sm font-medium">Reviewer note</p>
          <p className="text-sm text-muted-foreground">{staffMember.reviewNote}</p>
        </Card>
      )}

      {staffMember.approvalStatus === "VERIFIED" && (
        <Card className="mt-4 flex items-center justify-between p-4">
          <div>
            <p className="text-sm font-medium">{staffMember.isActive ? "Active" : "Inactive"}</p>
            <p className="text-xs text-muted-foreground">Inactive staff can't be assigned to bookings.</p>
          </div>
          <ToggleActiveButton staffId={staffMember.id} isActive={staffMember.isActive} />
        </Card>
      )}

      <div className="mt-6">
        <StaffForm
          staffId={staffMember.id}
          initial={{
            fullName: staffMember.fullName,
            jobTitle: staffMember.jobTitle,
            phone: staffMember.phone,
            email: staffMember.email,
            profilePhotoUrl: staffMember.profilePhotoUrl,
            idFrontImageUrl: staffMember.idFrontImageUrl,
            idBackImageUrl: staffMember.idBackImageUrl,
          }}
        />
      </div>
    </div>
  );
}
