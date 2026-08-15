import { notFound, redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { Badge, Card } from "@asaplocal/ui";
import { JobSheetPanel } from "./job-sheet-panel";
import { OnTheWayPanel } from "./on-the-way-panel";

export default async function ProviderBookingDetailPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) redirect("/onboarding");

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: { include: { profile: true } },
      jobSheetEntries: { orderBy: { loggedAt: "asc" } },
      assignedStaff: true,
    },
  });
  if (!booking || booking.businessId !== business.id) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{booking.customer.profile?.firstName} {booking.customer.profile?.lastName}</h1>
          <p className="text-sm text-muted-foreground">{booking.scheduledDate.toLocaleString("en-GB")} · {booking.addressLine}, {booking.city}</p>
        </div>
        <Badge variant="outline">{booking.status.replace(/_/g, " ")}</Badge>
      </div>

      {booking.assignedStaff && (
        <p className="mt-2 text-sm text-muted-foreground">Assigned: {booking.assignedStaff.fullName}</p>
      )}

      {booking.durationMinutes != null && (
        <Card className="mt-4 p-4">
          <p className="text-sm">Duration: <span className="font-medium">{booking.durationMinutes} min</span></p>
        </Card>
      )}

      {booking.status === "CONFIRMED" && (
        <div className="mt-6">
          <OnTheWayPanel bookingId={booking.id} initialEtaMinutes={booking.etaMinutes} />
        </div>
      )}

      <div className="mt-6">
        <JobSheetPanel bookingId={booking.id} status={booking.status} entryCount={booking.jobSheetEntries.length} />
      </div>

      {booking.jobSheetEntries.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-lg font-semibold">Job sheet</h2>
          <div className="space-y-2">
            {booking.jobSheetEntries.map((entry) => (
              <Card key={entry.id} className="p-4">
                <p className="text-sm">{entry.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">{entry.loggedAt.toLocaleString("en-GB")}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
