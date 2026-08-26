import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";

// JSON counterpart to the /leads/[id] server-rendered page — the mobile app
// has no server components, so this mirrors the same queries as plain JSON.
// Contact details (address, phone) and full description slice only surface
// once access.status is "WON", matching the page's own gating.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "No business profile found" }, { status: 404 });

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { jobRequest: { include: { category: true, customer: { include: { profile: true } } } } },
  });
  if (!lead) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const access = await prisma.leadAccess.findUnique({
    where: { leadId_businessId: { leadId: id, businessId: business.id } },
    include: { refundRequest: true },
  });
  if (!access) return NextResponse.json({ message: "You haven't acquired this lead" }, { status: 403 });

  const dispatchAssignment = await prisma.dispatcherAssignment.findFirst({
    where: { jobRequestId: lead.jobRequestId, assignedBusinessId: business.id },
    orderBy: { createdAt: "desc" },
  });
  const booking = await prisma.booking.findUnique({ where: { jobRequestId: lead.jobRequestId } });
  const ownBooking = booking && booking.businessId === business.id ? booking : null;
  const existingQuote = await prisma.quote.findUnique({
    where: { jobRequestId_businessId: { jobRequestId: lead.jobRequestId, businessId: business.id } },
  });

  const { jobRequest } = lead;
  const customerName = jobRequest.customer.profile
    ? `${jobRequest.customer.profile.firstName} ${jobRequest.customer.profile.lastName}`
    : "the customer";
  const isWon = access.status === "WON";

  return NextResponse.json({
    lead: {
      id: lead.id,
      jobRequestId: lead.jobRequestId,
      title: jobRequest.title,
      description: jobRequest.description,
      categoryName: jobRequest.category.name,
      city: jobRequest.city,
      addressLine: isWon ? jobRequest.addressLine : null,
      postcode: isWon ? jobRequest.postcode : null,
      budgetMinPence: jobRequest.budgetMinPence,
      budgetMaxPence: jobRequest.budgetMaxPence,
      photos: jobRequest.photos,
      designRenderUrl: jobRequest.designRenderUrl,
    },
    access: { id: access.id, status: access.status, refundRequestStatus: access.refundRequest?.status ?? null },
    customer: { name: customerName, phone: isWon ? jobRequest.customer.phone : null },
    dispatchNote: dispatchAssignment?.note ?? null,
    existingQuote: existingQuote
      ? { amountPence: existingQuote.amountPence, message: existingQuote.message, status: existingQuote.status }
      : null,
    ownBooking: ownBooking ? { id: ownBooking.id, status: ownBooking.status } : null,
  });
}
