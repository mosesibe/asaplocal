import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { Badge, Button, Card, MobileTopBar, buttonVariants, formatPence } from "@asaplocal/ui";
import { computeBookingBalance } from "@asaplocal/core";
import { formatBudget, formatJobLocation, formatNeededBy } from "@/lib/job-format";
import { AcceptQuoteButton } from "./accept-quote-button";
import { DeleteJobButton } from "./delete-job-button";

const EDITABLE_STATUSES = ["OPEN", "MATCHING", "QUOTED"];

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
      booking: { include: { payments: true, variations: true } },
    },
  });
  if (!job || job.customerId !== session.user.id) notFound();

  const depositDuePence = job.booking ? computeBookingBalance(job.booking).depositDuePence : 0;

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
        <div className="flex items-center justify-between">
          <Badge variant="secondary">{job.status.replace("_", " ")}</Badge>
          {EDITABLE_STATUSES.includes(job.status) && (
            <div className="flex gap-2">
              <Link href={`/jobs/${id}/edit`}>
                <Button size="sm" variant="outline">Edit</Button>
              </Link>
              <DeleteJobButton jobId={job.id} />
            </div>
          )}
        </div>
        <h1 className="mt-3 text-2xl font-bold">{job.title}</h1>
        <p className="mt-1 text-muted-foreground">{statusCopy[job.status]}</p>
        <Card className="mt-6 p-5">
          <p className="text-sm text-muted-foreground">{job.category.name} · {job.city}</p>
          <p className="mt-3 whitespace-pre-line">{job.description}</p>

          {job.photos.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {job.photos.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt="" className="h-20 w-20 rounded-lg border border-border object-cover" />
              ))}
            </div>
          )}

          {job.designRenderUrl && (
            <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Your design concept
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={job.designRenderUrl}
                alt="The design concept you chose in Redesign Studio"
                className="mt-2 w-full max-w-sm rounded-lg border border-border object-cover"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Shared with pros as inspiration. They&apos;ll advise on what&apos;s achievable in your space.
              </p>
            </div>
          )}

          <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-3 border-t border-border pt-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Expected cost</dt>
              <dd className="mt-0.5 font-medium">{formatBudget(job.budgetMinPence, job.budgetMaxPence) ?? "No budget set"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Needed by</dt>
              <dd className="mt-0.5 font-medium">{formatNeededBy(job.preferredDate, job.flexibleDate)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Service location</dt>
              <dd className="mt-0.5 font-medium">{formatJobLocation(job)}</dd>
            </div>
          </dl>
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
              ) : q.status === "ACCEPTED" && job.booking ? (
                /* An "ACCEPTED" badge on its own was a dead end: the customer
                   had accepted but had no way through to paying the deposit. */
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <Badge variant="success" className="w-fit">ACCEPTED</Badge>
                  <Link
                    href={depositDuePence > 0 ? `/bookings/${job.booking.id}/checkout` : `/bookings/${job.booking.id}`}
                    className={buttonVariants({ size: "sm", variant: depositDuePence > 0 ? "default" : "outline" })}
                  >
                    {depositDuePence > 0 ? `Pay deposit — ${formatPence(depositDuePence)}` : "View booking"}
                  </Link>
                </div>
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
