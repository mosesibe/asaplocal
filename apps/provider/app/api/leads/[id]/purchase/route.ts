import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { stripe } from "@asaplocal/core";

/**
 * Card purchase of a single lead. We never trust a client-supplied price —
 * it's re-read from JobRequest.leadPricePence server-side. Access is only
 * granted once the Stripe webhook confirms payment (see grantPurchasedLeadAccess
 * in @asaplocal/core, invoked from api/webhooks/stripe).
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "PROVIDER") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "No business profile found" }, { status: 404 });

  const lead = await prisma.lead.findUnique({ where: { id }, include: { jobRequest: true } });
  if (!lead || lead.status !== "AVAILABLE") return NextResponse.json({ message: "Lead is no longer available" }, { status: 409 });

  const existing = await prisma.leadAccess.findUnique({ where: { leadId_businessId: { leadId: id, businessId: business.id } } });
  if (existing) return NextResponse.json({ message: "You already have this lead" }, { status: 409 });

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: { currency: "gbp", unit_amount: lead.jobRequest.leadPricePence, product_data: { name: `Lead: ${lead.jobRequest.title}` } },
        quantity: 1,
      },
    ],
    metadata: { leadId: id, businessId: business.id, paymentType: "LEAD_PURCHASE" },
    success_url: `${process.env.NEXT_PUBLIC_PROVIDER_URL}/leads/${id}?purchased=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_PROVIDER_URL}/leads?cancelled=1`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
