import { redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { canHaveStaff } from "@asaplocal/core";
import { Badge, Card } from "@asaplocal/ui";
import { AssignStaffSelect } from "./assign-staff-select";

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) redirect("/onboarding");

  const staffAssignable = canHaveStaff(business.businessType);

  const [upcoming, staffOptions] = await Promise.all([
    prisma.booking.findMany({
      where: { businessId: business.id, status: { in: ["CONFIRMED", "PENDING", "IN_PROGRESS"] } },
      orderBy: { scheduledDate: "asc" },
      include: { customer: { include: { profile: true } }, assignedStaff: true },
    }),
    staffAssignable
      ? prisma.staffMember.findMany({ where: { businessId: business.id, approvalStatus: "VERIFIED", isActive: true } })
      : Promise.resolve([]),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <button className="text-sm font-medium text-brand-700 hover:underline">Connect Google Calendar →</button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Manage your availability and see upcoming confirmed jobs. Two-way Google Calendar sync keeps external bookings blocked automatically.</p>
      <div className="mt-6 space-y-3">
        {upcoming.map((b) => (
          <Card key={b.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{b.customer.profile?.firstName} {b.customer.profile?.lastName}</p>
              <p className="text-xs text-muted-foreground">{b.scheduledDate.toLocaleString("en-GB")} · {b.addressLine}, {b.city}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {staffAssignable && (b.status === "CONFIRMED" || b.status === "IN_PROGRESS") && (
                <AssignStaffSelect bookingId={b.id} assignedStaffId={b.assignedStaffId} staffOptions={staffOptions} />
              )}
              <Badge variant="outline" className="w-fit">{b.status}</Badge>
            </div>
          </Card>
        ))}
        {upcoming.length === 0 && <p className="text-muted-foreground">No upcoming jobs scheduled.</p>}
      </div>
    </div>
  );
}
