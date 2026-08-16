import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { generateQuoteTemplate } from "@asaplocal/core";
import { Badge, Card, MobileTopBar, buttonVariants, formatPence } from "@asaplocal/ui";
import { LeadPipelineControls } from "./lead-pipeline-controls";
import { QuoteForm } from "./quote-form";
import { RefundRequestForm } from "./refund-request-form";
import { MessageCustomerButton } from "./message-customer-button";

/** What the provider actually does next, per booking stage (see JobSheetPanel). */
const BOOKING_NEXT_STEP: Record<string, string> = {
  PENDING: "Waiting for the customer to pay their deposit — you'll be notified when it clears.",
  CONFIRMED: "Share your ETA, then start the job when you arrive.",
  IN_PROGRESS: "Log what you're doing as you go, then finish the job to send it for sign-off.",
  AWAITING_APPROVAL: "Sent to the customer — waiting for them to confirm the work is complete.",
  COMPLETED: "The customer confirmed this job as complete.",
  CANCELLED: "This booking was cancelled.",
};

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) redirect("/onboarding");

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { jobRequest: { include: { category: true, customer: { include: { profile: true } } } } },
  });
  if (!lead) notFound();

  const access = await prisma.leadAccess.findUnique({ where: { leadId_businessId: { leadId: id, businessId: business.id } }, include: { refundRequest: true } });
  if (!access) redirect("/leads");

  const dispatchAssignment = await prisma.dispatcherAssignment.findFirst({
    where: { jobRequestId: lead.jobRequestId, assignedBusinessId: business.id },
    orderBy: { createdAt: "desc" },
  });
  const customerName = lead.jobRequest.customer.profile
    ? `${lead.jobRequest.customer.profile.firstName} ${lead.jobRequest.customer.profile.lastName}`
    : "the customer";

  // Once a quote is accepted the work itself lives on the booking (start job,
  // job sheet, finish) — surface it here so the provider isn't left on the lead
  // page with nothing to act on. Booking.jobRequestId is unique.
  const booking = await prisma.booking.findUnique({ where: { jobRequestId: lead.jobRequestId } });
  const ownBooking = booking && booking.businessId === business.id ? booking : null;

  const existingQuote = await prisma.quote.findUnique({ where: { jobRequestId_businessId: { jobRequestId: lead.jobRequestId, businessId: business.id } } });
  const aiReply = !existingQuote
    ? await generateQuoteTemplate({
        businessName: business.name,
        serviceCategory: lead.jobRequest.category.name,
        jobDescription: lead.jobRequest.description,
        budgetMinPence: lead.jobRequest.budgetMinPence,
        budgetMaxPence: lead.jobRequest.budgetMaxPence,
      })
    : null;

  return (
    <div className="mx-auto max-w-3xl">
      <MobileTopBar backHref="/leads" linkAs={Link} title="Lead detail" className="-mx-4 mb-4 md:hidden" />
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{lead.jobRequest.category.name}</Badge>
        <Badge>{access.status}</Badge>
        {dispatchAssignment && <Badge variant="secondary">Assigned to you by dispatch</Badge>}
      </div>
      <h1 className="mt-3 text-2xl font-bold">{lead.jobRequest.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{lead.jobRequest.city} · Budget {lead.jobRequest.budgetMinPence ? formatPence(lead.jobRequest.budgetMinPence) : "?"}–{lead.jobRequest.budgetMaxPence ? formatPence(lead.jobRequest.budgetMaxPence) : "?"}</p>

      {dispatchAssignment?.note && (
        <Card className="mt-4 border-brand-200 bg-brand-50/60 p-4 dark:border-brand-800 dark:bg-brand-950/20">
          <p className="text-xs font-semibold text-brand-800 dark:text-brand-300">Note from dispatch</p>
          <p className="mt-1 text-sm">{dispatchAssignment.note}</p>
        </Card>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Customer: <span className="font-medium text-foreground">{customerName}</span></p>
        <MessageCustomerButton leadId={lead.id} />
      </div>

      {access.status === "WON" && (
        <Card className="mt-4 space-y-1.5 p-4">
          <p className="text-xs font-semibold text-muted-foreground">Contact details</p>
          <p className="text-sm">
            {lead.jobRequest.addressLine ? `${lead.jobRequest.addressLine}, ` : ""}
            {lead.jobRequest.city}
            {lead.jobRequest.postcode ? `, ${lead.jobRequest.postcode}` : ""}
          </p>
          <p className="text-sm">{lead.jobRequest.customer.phone ?? "No phone number on file"}</p>
        </Card>
      )}

      <Card className="mt-6 p-5">
        <p className="whitespace-pre-line">{lead.jobRequest.description}</p>
        {lead.jobRequest.photos.length > 0 && (
          <div className="mt-3 flex gap-2">
            {lead.jobRequest.photos.map((p, i) => <img key={i} src={p} alt="" className="h-20 w-20 rounded-lg object-cover" />)}
          </div>
        )}
      </Card>

      {ownBooking && (
        <Card className="mt-6 border-brand-200 bg-brand-50/60 p-5 dark:border-brand-800 dark:bg-brand-950/20">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">You won this job</h2>
            <Badge variant="outline">{ownBooking.status.replace(/_/g, " ")}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{BOOKING_NEXT_STEP[ownBooking.status] ?? "Open the booking for details."}</p>
          <Link href={`/calendar/${ownBooking.id}`} className={`${buttonVariants({ size: "sm" })} mt-3`}>
            {ownBooking.status === "IN_PROGRESS" ? "Open job sheet" : "Open booking"}
          </Link>
        </Card>
      )}

      <div className="mt-6">
        <h2 className="mb-2 text-lg font-semibold">Pipeline status</h2>
        <LeadPipelineControls leadId={lead.id} leadAccessId={access.id} currentStatus={access.status} />
      </div>

      <div className="mt-8">
        <h2 className="mb-2 text-lg font-semibold">{existingQuote ? "Your quote" : "Send a quote"}</h2>
        <QuoteForm jobRequestId={lead.jobRequestId} existingQuote={existingQuote ? { amountPence: existingQuote.amountPence, message: existingQuote.message, status: existingQuote.status } : null} aiSuggestion={aiReply} />
      </div>

      {!access.refundRequest && (
        <div className="mt-10 border-t border-border pt-6">
          <h2 className="mb-2 text-lg font-semibold">Something wrong with this lead?</h2>
          <RefundRequestForm leadAccessId={access.id} />
        </div>
      )}
      {access.refundRequest && (
        <p className="mt-6 text-sm text-muted-foreground">Refund request status: <Badge variant="outline">{access.refundRequest.status}</Badge></p>
      )}
    </div>
  );
}
