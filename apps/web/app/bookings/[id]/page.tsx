import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { Avatar, Badge, Card, MobileTopBar, formatPence } from "@asaplocal/ui";
import { LeaveReviewForm } from "./leave-review-form";

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/bookings/${id}`);

  const booking = await prisma.booking.findUnique({ where: { id }, include: { business: true, review: true, assignedStaff: true } });
  if (!booking || booking.customerId !== session.user.id) notFound();

  return (
    <div className="mx-auto max-w-2xl md:px-6 md:py-10">
      <MobileTopBar backHref="/dashboard" linkAs={Link} title="Booking" className="md:hidden" />
      <div className="px-4 py-6 md:p-0">
        <Badge variant={booking.status === "COMPLETED" ? "success" : "secondary"}>{booking.status}</Badge>
        <h1 className="mt-3 text-2xl font-bold">Booking with {booking.business.name}</h1>
        <Card className="mt-6 space-y-2 p-6">
          <div className="flex justify-between text-sm"><span>Scheduled</span><span>{booking.scheduledDate.toLocaleDateString("en-GB")}</span></div>
          <div className="flex justify-between text-sm"><span>Address</span><span>{booking.addressLine}, {booking.city}</span></div>
          <div className="flex justify-between text-sm"><span>Total</span><span className="font-semibold">{formatPence(booking.totalAmountPence)}</span></div>
        </Card>

        {booking.assignedStaff && (
          <Card className="mt-6 space-y-4 p-6">
            <h2 className="font-semibold">Who's coming</h2>
            <div className="flex items-center gap-3">
              <Avatar src={booking.assignedStaff.profilePhotoUrl} name={booking.assignedStaff.fullName} size={56} />
              <div>
                <p className="font-medium">{booking.assignedStaff.fullName}</p>
                {booking.assignedStaff.jobTitle && <p className="text-sm text-muted-foreground">{booking.assignedStaff.jobTitle}</p>}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm text-muted-foreground">
                {booking.business.name}'s company ID — so you can confirm who's at your door.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={booking.assignedStaff.idFrontImageUrl} alt={`${booking.assignedStaff.fullName}'s company ID — front`} className="rounded-lg border border-border object-cover" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={booking.assignedStaff.idBackImageUrl} alt={`${booking.assignedStaff.fullName}'s company ID — back`} className="rounded-lg border border-border object-cover" />
              </div>
            </div>
          </Card>
        )}

        {booking.status === "COMPLETED" && !booking.review && (
          <div className="mt-8">
            <h2 className="mb-3 text-lg font-semibold">Leave a review</h2>
            <LeaveReviewForm bookingId={booking.id} />
          </div>
        )}
      </div>
    </div>
  );
}
