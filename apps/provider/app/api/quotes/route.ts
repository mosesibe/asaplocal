import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { quoteSchema, stripHtml, notify, emailTemplates, sendEmail } from "@asaplocal/core";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PROVIDER") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) return NextResponse.json({ message: "No business profile found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = quoteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Invalid quote", issues: parsed.error.flatten() }, { status: 422 });

  const jobRequest = await prisma.jobRequest.findUnique({ where: { id: parsed.data.jobRequestId }, include: { customer: true } });
  if (!jobRequest) return NextResponse.json({ message: "Job request not found" }, { status: 404 });

  const access = await prisma.leadAccess.findFirst({ where: { businessId: business.id, lead: { jobRequestId: jobRequest.id } } });
  if (!access) return NextResponse.json({ message: "You need to acquire this lead before quoting" }, { status: 403 });

  const quote = await prisma.quote.upsert({
    where: { jobRequestId_businessId: { jobRequestId: jobRequest.id, businessId: business.id } },
    update: { amountPence: parsed.data.amountPence, message: parsed.data.message ? stripHtml(parsed.data.message) : undefined, status: "SENT" },
    create: {
      jobRequestId: jobRequest.id,
      businessId: business.id,
      amountPence: parsed.data.amountPence,
      message: parsed.data.message ? stripHtml(parsed.data.message) : undefined,
      status: "SENT",
    },
  });

  await prisma.leadAccess.update({ where: { id: access.id }, data: { status: "QUOTED", quotedAt: new Date() } });
  await prisma.jobRequest.update({ where: { id: jobRequest.id }, data: { status: "QUOTED" } });

  await notify(jobRequest.customerId, "QUOTE_RECEIVED", "You've received a new quote", jobRequest.title, `/jobs/${jobRequest.id}`);
  await sendEmail({
    to: jobRequest.customer.email,
    subject: "You've received a new quote on AsapLocal",
    html: emailTemplates.quoteReceived(jobRequest.title, `${process.env.NEXT_PUBLIC_WEB_URL}/jobs/${jobRequest.id}`),
  }).catch(() => {});

  return NextResponse.json({ id: quote.id }, { status: 201 });
}
