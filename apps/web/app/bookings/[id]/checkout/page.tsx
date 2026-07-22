import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { Card, MobileTopBar, formatPence } from "@asaplocal/ui";
import { CheckoutButton } from "./checkout-button";
import { InstallAppBanner } from "@/components/install-app-banner";

export default async function BookingCheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/bookings/${id}/checkout`);

  const booking = await prisma.booking.findUnique({ where: { id }, include: { business: true } });
  if (!booking || booking.customerId !== session.user.id) notFound();

  return (
    <div className="mx-auto max-w-lg md:px-6 md:py-10">
      <MobileTopBar backHref={`/bookings/${id}`} linkAs={Link} title="Checkout" className="md:hidden" />
      <div className="px-4 py-6 md:p-0">
        <h1 className="text-2xl font-bold">Confirm &amp; pay deposit</h1>
        <div className="mt-4">
          <InstallAppBanner />
        </div>
        <Card className="mt-2 space-y-3 p-6">
          <div className="flex justify-between text-sm"><span>Provider</span><span className="font-medium">{booking.business.name}</span></div>
          <div className="flex justify-between text-sm"><span>Scheduled</span><span className="font-medium">{booking.scheduledDate.toLocaleDateString("en-GB")}</span></div>
          <div className="flex justify-between text-sm"><span>Total job price</span><span className="font-medium">{formatPence(booking.totalAmountPence)}</span></div>
          <div className="flex justify-between border-t border-border pt-3 text-base font-semibold"><span>Deposit due now</span><span>{formatPence(booking.depositAmountPence ?? 0)}</span></div>
        </Card>
        <div className="mt-6">
          <CheckoutButton bookingId={booking.id} />
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">Secure payment powered by Stripe. The remaining balance is paid on completion.</p>
      </div>
    </div>
  );
}
