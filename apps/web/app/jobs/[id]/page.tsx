import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { Badge, Card, MobileTopBar, formatPence } from "@asaplocal/ui";
import { AcceptQuoteButton } from "./accept-quote-button";

export default async function JobStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/jobs/${id}`);

  const job = await prisma.jobRequest.findUnique({
    where: { id },
    include: {
      category: true,
      quotes: { include: { business: true }, orderBy: { createdAt: "desc" } },
      lead: true,
      booking: true,
    },
  });
  if (!job || job.customerId !== session.user.id) notFound();

  const statusCopy: Record<string, string> = {
    OPEN: "We're matching your job with local providers…",
    MATCHING: "Providers in your area have been notified.",
    QUOTED: "You've received quotes — compare and book below.",
    ASSIGNED: "You've booked a provider for this job.",
    IN_PROGRESS: "Your job is in progress.",
    COMPLETED: "This job is complete.",
    CANCELLED: "This job was cancelled.",
    EXPIRED: "This job request has expired.",
  };

  return (
    <div className="mx-auto max-w-3xl md:px-6 md:py-10">
      <MobileTopBar backHref="/dashboard" linkAs={Link} title="Job request" className="md:hidden" />
      <div className="px-4 py-6 md:p-0">
        <Badge variant="secondary">{job.status.replace("_", " ")}</Badge>
        <h1 className="mt-3 text-2xl font-bold">{job.title}</h1>
        <p className="mt-1 text-muted-foreground">{statusCopy[job.status]}</p>
        <Card className="mt-6 p-5">
          <p className="text-sm text-muted-foreground">{job.category.name} · {job.city}</p>
          <p className="mt-3 whitespace-pre-line">{job.description}</p>
        </Card>

        <h2 className="mt-10 mb-4 text-xl font-semibold">Quotes ({job.quotes.length})</h2>
        {job.quotes.length === 0 && <p className="text-muted-foreground">No quotes yet — providers typically respond within a few hours.</p>}
        <div className="space-y-4">
          {job.quotes.map((q) => (
            <Card key={q.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">{q.business.name}</p>
                <p className="text-sm text-muted-foreground">{q.message}</p>
                <p className="mt-1 text-lg font-bold text-brand-700">{formatPence(q.amountPence)}</p>
              </div>
              {job.status !== "ASSIGNED" && q.status === "SENT" ? (
                <AcceptQuoteButton quoteId={q.id} />
              ) : (
                <Badge variant={q.status === "ACCEPTED" ? "success" : "outline"} className="w-fit">{q.status}</Badge>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
