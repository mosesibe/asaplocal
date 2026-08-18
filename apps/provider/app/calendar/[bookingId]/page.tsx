import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { Badge, Card } from "@asaplocal/ui";
import { JobSheetPanel } from "./job-sheet-panel";
import { OnTheWayPanel } from "./on-the-way-panel";
import { VariationPanel } from "./variation-panel";

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
      jobRequest: { include: { lead: true } },
      variations: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!booking || booking.businessId !== business.id) notFound();

  const customerName = booking.customer.profile
    ? `${booking.customer.profile.firstName} ${booking.customer.profile.lastName}`
    : booking.customer.email;
  const leadId = booking.jobRequest?.lead?.id;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={leadId ? `/leads/${leadId}` : "/calendar"} className="text-sm text-muted-foreground hover:underline">
        ← Back to {leadId ? "lead" : "calendar"}
      </Link>

      <div className="mt-2 flex items-start justify-between gap-3">
        <div>
          {/* Lead the heading with the job — the customer's name alone gave no
              clue which booking this was, and the URL is a bare uuid. */}
          <h1 className="text-2xl font-bold">{booking.jobRequest?.title ?? "Booking"}</h1>
          <p className="text-sm text-muted-foreground">{customerName}</p>
          <p className="text-sm text-muted-foreground">{booking.scheduledDate.toLocaleString("en-GB")} · {booking.addressLine}, {booking.city}</p>
        </div>
        <Badge variant="outline" className="shrink-0">{booking.status.replace(/_/g, " ")}</Badge>
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

      {["CONFIRMED", "IN_PROGRESS", "AWAITING_APPROVAL"].includes(booking.status) && (
        <div className="mt-6">
          <VariationPanel bookingId={booking.id} variations={booking.variations} />
        </div>
      )}

      {booking.jobSheetEntries.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-lg font-semibold">Job sheet</h2>
          <div className="space-y-2">
            {booking.jobSheetEntries.map((entry) => (
              <Card key={entry.id} className="p-4">
                <p className="text-sm">{entry.description}</p>
                {entry.photos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {entry.photos.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="h-16 w-16 rounded-lg border border-border object-cover" />
                      </a>
                    ))}
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">{entry.loggedAt.toLocaleString("en-GB")}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
