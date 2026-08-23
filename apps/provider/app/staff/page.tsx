import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { canHaveStaff } from "@asaplocal/core";
import { Avatar, Badge, Button, Card } from "@asaplocal/ui";
import { PageHeading } from "@/components/page-heading";

const STATUS_VARIANT = {
  VERIFIED: "success",
  PENDING: "warning",
  MORE_INFO_REQUESTED: "warning",
  REJECTED: "destructive",
  UNVERIFIED: "outline",
} as const;

export default async function StaffPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) redirect("/onboarding");

  if (!canHaveStaff(business.businessType)) {
    return (
      <div>
        <PageHeading>Staff</PageHeading>
        <Card className="mt-6 p-6">
          <p className="text-sm text-muted-foreground">
            Staff management is for limited companies and partnerships that send employees out to jobs. As a sole trader / self-employed
            provider, you complete jobs yourself, so there's no roster to manage here.
          </p>
        </Card>
      </div>
    );
  }

  const staff = await prisma.staffMember.findMany({ where: { businessId: business.id }, orderBy: { createdAt: "desc" } });

  return (
    <div>
      <div className="flex items-center justify-between">
        <PageHeading>Staff</PageHeading>
        <Link href="/staff/new"><Button>Add staff member</Button></Link>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Staff you add here must be approved by our team before you can send them to a job. Once approved, you can assign them to a
        confirmed booking on your calendar — their details, including their company ID, are shown to the customer.
      </p>

      <div className="mt-6 space-y-3">
        {staff.map((s) => (
          <Link key={s.id} href={`/staff/${s.id}`}>
            <Card className="flex items-center justify-between p-4 transition-shadow hover:shadow-card">
              <div className="flex items-center gap-3">
                <Avatar src={s.profilePhotoUrl} name={s.fullName} size={44} />
                <div>
                  <p className="font-medium">{s.fullName}</p>
                  <p className="text-xs text-muted-foreground">{s.jobTitle ?? "—"}{!s.isActive && s.approvalStatus === "VERIFIED" ? " · Inactive" : ""}</p>
                </div>
              </div>
              <Badge variant={STATUS_VARIANT[s.approvalStatus]}>{s.approvalStatus.replace(/_/g, " ")}</Badge>
            </Card>
          </Link>
        ))}
        {staff.length === 0 && <p className="text-muted-foreground">No staff added yet.</p>}
      </div>
    </div>
  );
}
