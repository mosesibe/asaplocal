import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { stripe, STRIPE_PRICE_IDS } from "@asaplocal/core";
import { z } from "zod";

const schema = z.object({
  kind: z.enum(["SUBSCRIPTION_PRO", "SUBSCRIPTION_PREMIUM", "CREDITS_SMALL", "CREDITS_LARGE"]),
});

const CREDIT_PACKS = { CREDITS_SMALL: { qty: 5, priceId: STRIPE_PRICE_IDS.LEAD_CREDIT_PACK_SMALL }, CREDITS_LARGE: { qty: 20, priceId: STRIPE_PRICE_IDS.LEAD_CREDIT_PACK_LARGE } };

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PROVIDER") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "No business profile found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid request" }, { status: 422 });

  if (parsed.data.kind === "SUBSCRIPTION_PRO" || parsed.data.kind === "SUBSCRIPTION_PREMIUM") {
    const plan = parsed.data.kind === "SUBSCRIPTION_PRO" ? "PRO" : "PREMIUM";
    const priceId = plan === "PRO" ? STRIPE_PRICE_IDS.PRO_MONTHLY : STRIPE_PRICE_IDS.PREMIUM_MONTHLY;
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: session.user.email ?? undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { businessId: business.id, paymentType: "SUBSCRIPTION", plan },
      success_url: `${process.env.NEXT_PUBLIC_PROVIDER_URL}/billing?upgraded=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_PROVIDER_URL}/billing?cancelled=1`,
    });
    return NextResponse.json({ url: checkoutSession.url });
  }

  const pack = CREDIT_PACKS[parsed.data.kind];
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: session.user.email ?? undefined,
    line_items: [{ price: pack.priceId, quantity: 1 }],
    metadata: { businessId: business.id, paymentType: "LEAD_CREDIT_TOPUP", creditsQty: String(pack.qty) },
    success_url: `${process.env.NEXT_PUBLIC_PROVIDER_URL}/billing?topup=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_PROVIDER_URL}/billing?cancelled=1`,
  });
  return NextResponse.json({ url: checkoutSession.url });
}
