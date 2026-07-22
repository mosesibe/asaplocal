import { redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { Badge, Card } from "@asaplocal/ui";

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) redirect("/onboarding");

  const upcoming = await prisma.booking.findMany({
    where: { businessId: business.id, status: { in: ["CONFIRMED", "PENDING", "IN_PROGRESS"] } },
    orderBy: { scheduledDate: "asc" },
    include: { customer: { include: { profile: true } } },
  });

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
            <Badge variant="outline" className="w-fit">{b.status}</Badge>
          </Card>
        ))}
        {upcoming.length === 0 && <p className="text-muted-foreground">No upcoming jobs scheduled.</p>}
      </div>
    </div>
  );
}
