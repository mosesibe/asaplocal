import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { Badge, Card, MobileTopBar, formatPence } from "@asaplocal/ui";
import { LeaveReviewForm } from "./leave-review-form";

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/bookings/${id}`);

  const booking = await prisma.booking.findUnique({ where: { id }, include: { business: true, review: true } });
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
