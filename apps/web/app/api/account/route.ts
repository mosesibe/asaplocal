import { NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { getCustomerAccountStats, getSignInMethods, invoiceNumber } from "@asaplocal/core";

const TYPE_LABEL: Record<string, string> = { BOOKING_DEPOSIT: "Deposit", BOOKING_BALANCE: "Balance", BOOKING_FULL: "Full payment" };

// Composite JSON counterpart to /dashboard (a server component that loads
// everything in one render pass via direct Prisma reads) — the mobile app
// has no server components, so this bundles the same reads into one round
// trip rather than the client firing five separate requests on screen load.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true, addresses: { orderBy: { createdAt: "desc" } }, accounts: true, authenticators: true },
  });
  if (!user) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const [stats, payments] = await Promise.all([
    getCustomerAccountStats(session.user.id),
    prisma.payment.findMany({ where: { userId: session.user.id, status: "SUCCEEDED" }, orderBy: { createdAt: "desc" }, take: 10, include: { business: true } }),
  ]);

  return NextResponse.json({
    user: {
      email: user.email,
      phone: user.phone,
      status: user.status,
      createdAt: user.createdAt,
      emailVerified: !!user.emailVerified,
      phoneVerified: !!user.phoneVerifiedAt,
      marketingEmail: user.marketingEmail,
      marketingSms: user.marketingSms,
    },
    profile: user.profile ? { firstName: user.profile.firstName, lastName: user.profile.lastName, avatarUrl: user.profile.avatarUrl } : null,
    stats,
    signInMethods: getSignInMethods(user, user.accounts),
    hasPasskey: user.authenticators.length > 0,
    addresses: user.addresses.map((a) => ({ id: a.id, addressLine: a.addressLine, city: a.city, postcode: a.postcode })),
    invoices: payments.map((p) => ({
      id: p.id,
      bookingId: p.bookingId,
      businessName: p.business?.name ?? null,
      type: p.type,
      typeLabel: TYPE_LABEL[p.type] ?? p.type.replace(/_/g, " "),
      amountPence: p.amountPence,
      createdAt: p.createdAt,
      invoiceRef: invoiceNumber(p.id),
    })),
  });
}
