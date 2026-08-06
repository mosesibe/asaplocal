import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@asaplocal/db";
import { Badge, Card } from "@asaplocal/ui";
import { DecisionActions } from "../../verification/decision-actions";

function statusVariant(status: string) {
  if (status === "VERIFIED") return "success" as const;
  if (status === "REJECTED") return "destructive" as const;
  if (status === "PENDING" || status === "MORE_INFO_REQUESTED") return "warning" as const;
  return "outline" as const;
}

export default async function StaffDetailPage({ params }: { params: Promise<{ staffId: string }> }) {
  const { staffId } = await params;
  const staffMember = await prisma.staffMember.findUnique({ where: { id: staffId }, include: { business: { include: { owner: true } } } });
  if (!staffMember) notFound();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{staffMember.fullName}</h1>
          <p className="text-sm text-muted-foreground">
            <Link href={`/operations/verification/${staffMember.business.id}`} className="text-brand-700 hover:underline">
              {staffMember.business.name}
            </Link>
            {" "}({staffMember.business.owner.email}){staffMember.jobTitle ? ` · ${staffMember.jobTitle}` : ""}
          </p>
        </div>
        <Badge variant={statusVariant(staffMember.approvalStatus)}>{staffMember.approvalStatus.replace(/_/g, " ")}</Badge>
      </div>

      <div className="mt-6 space-y-4">
        <Card className="p-4">
          <h2 className="font-semibold">Contact</h2>
          <div className="mt-2 space-y-1 text-sm">
            <p>Phone: {staffMember.phone}</p>
            {staffMember.email && <p>Email: {staffMember.email}</p>}
            <p className="text-muted-foreground">Active: {staffMember.isActive ? "yes" : "no"}</p>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold">Profile photo</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={staffMember.profilePhotoUrl} alt="Profile" className="mt-2 h-40 w-40 rounded-lg border border-border object-cover" />
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold">Company ID</h2>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Front</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={staffMember.idFrontImageUrl} alt="Company ID front" className="w-full rounded-lg border border-border object-cover" />
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Back</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={staffMember.idBackImageUrl} alt="Company ID back" className="w-full rounded-lg border border-border object-cover" />
            </div>
          </div>
          {staffMember.reviewNote && (
            <p className="mt-3 text-sm text-muted-foreground">Previous reviewer note: {staffMember.reviewNote}</p>
          )}
          {["PENDING", "MORE_INFO_REQUESTED"].includes(staffMember.approvalStatus) && (
            <DecisionActions endpoint={`/api/staff/${staffMember.id}/decide`} />
          )}
        </Card>
      </div>
    </div>
  );
}
