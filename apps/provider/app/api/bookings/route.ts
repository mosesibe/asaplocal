import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";

// JSON list endpoint backing the mobile app's Calendar tab (the web app's
// equivalent view, /calendar, is a server component that queries Prisma
// directly and has no JSON counterpart). Optional ?from=&to= (ISO date
// strings) filter by scheduledDate; with neither, defaults to everything
// from now onward so the mobile "Next up" list has something to group.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "Complete onboarding first" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const from = fromParam && !Number.isNaN(Date.parse(fromParam)) ? new Date(fromParam) : new Date();
  const to = toParam && !Number.isNaN(Date.parse(toParam)) ? new Date(toParam) : undefined;

  const bookings = await prisma.booking.findMany({
    where: {
      businessId: business.id,
      scheduledDate: to ? { gte: from, lt: to } : { gte: from },
    },
    orderBy: { scheduledDate: "asc" },
    take: 100,
    include: { customer: { include: { profile: true } }, jobRequest: true },
  });

  return NextResponse.json({
    bookings: bookings.map((b) => ({
      id: b.id,
      title: b.jobRequest?.title ?? "Booking",
      customerName: b.customer.profile ? `${b.customer.profile.firstName} ${b.customer.profile.lastName}` : b.customer.email,
      scheduledDate: b.scheduledDate,
      status: b.status,
      addressLine: b.addressLine,
      city: b.city,
    })),
  });
}
