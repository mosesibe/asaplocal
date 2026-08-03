import { NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { createExpressAccount, createAccountLink } from "@asaplocal/core";

export async function POST() {
  const session = await auth();
  if (!session?.user || !session.user.isProvider) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "Complete onboarding first" }, { status: 400 });

  let accountId = business.stripeAccountId;
  if (!accountId) {
    const account = await createExpressAccount({
      email: business.email ?? session.user.email,
      businessType: business.businessType === "LIMITED_COMPANY" ? "company" : "individual",
    });
    accountId = account.id;
    await prisma.business.update({ where: { id: business.id }, data: { stripeAccountId: accountId } });
  }

  const baseUrl = process.env.NEXT_PUBLIC_PROVIDER_URL;
  const link = await createAccountLink(accountId, `${baseUrl}/verification/banking/return`, `${baseUrl}/verification/banking/refresh`);

  return NextResponse.json({ url: link.url });
}
