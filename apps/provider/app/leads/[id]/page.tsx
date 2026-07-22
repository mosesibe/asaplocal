import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { generateQuoteTemplate } from "@asaplocal/core";
import { Badge, Card, MobileTopBar, formatPence } from "@asaplocal/ui";
import { LeadPipelineControls } from "./lead-pipeline-controls";
import { QuoteForm } from "./quote-form";
import { RefundRequestForm } from "./refund-request-form";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) redirect("/onboarding");

  const lead = await prisma.lead.findUnique({ where: { id }, include: { jobRequest: { include: { category: true } } } });
  if (!lead) notFound();

  const access = await prisma.leadAccess.findUnique({ where: { leadId_businessId: { leadId: id, businessId: business.id } }, include: { refundRequest: true } });
  if (!access) redirect("/leads");

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
      <div className="flex items-center gap-2">
        <Badge variant="outline">{lead.jobRequest.category.name}</Badge>
        <Badge>{access.status}</Badge>
      </div>
      <h1 className="mt-3 text-2xl font-bold">{lead.jobRequest.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{lead.jobRequest.city} · Budget {lead.jobRequest.budgetMinPence ? formatPence(lead.jobRequest.budgetMinPence) : "?"}–{lead.jobRequest.budgetMaxPence ? formatPence(lead.jobRequest.budgetMaxPence) : "?"}</p>

      <Card className="mt-6 p-5">
        <p className="whitespace-pre-line">{lead.jobRequest.description}</p>
        {lead.jobRequest.photos.length > 0 && (
          <div className="mt-3 flex gap-2">
            {lead.jobRequest.photos.map((p, i) => <img key={i} src={p} alt="" className="h-20 w-20 rounded-lg object-cover" />)}
          </div>
        )}
      </Card>

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
