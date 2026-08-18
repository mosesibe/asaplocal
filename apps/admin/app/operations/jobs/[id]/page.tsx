import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@asaplocal/db";
import { Badge, Card, formatPence } from "@asaplocal/ui";
import { buildJobTimeline } from "@asaplocal/core";

function statusVariant(status: string): "success" | "destructive" | "outline" | "warning" | "secondary" {
  if (["COMPLETED", "WON", "SUCCEEDED", "ACCEPTED", "CONFIRMED"].includes(status)) return "success";
  if (["CANCELLED", "EXPIRED", "LOST", "FAILED", "DECLINED", "DISPUTED"].includes(status)) return "destructive";
  if (["ASSIGNED", "IN_PROGRESS", "AWAITING_APPROVAL", "PENDING", "CONTACTED", "SENT"].includes(status)) return "warning";
  if (["QUOTED"].includes(status)) return "secondary";
  return "outline";
}

function fmtDateTime(d: Date) {
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const job = await prisma.jobRequest.findUnique({
    where: { id },
    include: {
      category: true,
      customer: { include: { profile: true } },
      quotes: { include: { business: true }, orderBy: { createdAt: "asc" } },
      booking: {
        include: {
          business: true,
          payments: { orderBy: { createdAt: "asc" } },
          assignedStaff: true,
          jobSheetEntries: { orderBy: { loggedAt: "asc" } },
          review: true,
          variations: { orderBy: { createdAt: "asc" } },
        },
      },
      lead: { include: { accesses: { include: { business: true }, orderBy: { createdAt: "asc" } } } },
      dispatcherAssignments: { include: { dispatcher: true, assignedBusiness: true }, orderBy: { createdAt: "desc" } },
      conversations: {
        include: {
          participants: { include: { user: { include: { profile: true } } } },
          messages: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!job) notFound();

  const customerName = job.customer.profile ? `${job.customer.profile.firstName} ${job.customer.profile.lastName}` : job.customer.email;
  const firstSucceededPayment = job.booking?.payments.find((p) => p.status === "SUCCEEDED");
  const firstQuote = job.quotes[0];

  const timeline = buildJobTimeline({
    jobPostedAt: job.createdAt,
    quoteReceivedAt: firstQuote?.createdAt,
    bookingConfirmedAt: job.booking?.createdAt,
    paymentReceivedAt: firstSucceededPayment?.createdAt,
    startedAt: job.booking?.startedAt,
    completedAt: job.booking?.completedAt,
    cancelledAt: job.booking?.cancelledAt,
  });

  function participantName(userId: string) {
    for (const convo of job!.conversations) {
      const p = convo.participants.find((p) => p.userId === userId);
      if (p) return p.user.profile ? `${p.user.profile.firstName} ${p.user.profile.lastName}` : p.user.email;
    }
    return "Unknown";
  }

  return (
    <div>
      <Link href="/operations/jobs" className="text-sm text-muted-foreground hover:underline">← Back to jobs</Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{job.title}</h1>
          <p className="text-sm text-muted-foreground">
            {job.category.name} · {job.city} · Posted {fmtDateTime(job.createdAt)}
          </p>
        </div>
        <Badge variant={statusVariant(job.status)}>{job.status.replace(/_/g, " ")}</Badge>
      </div>

      <div className="mt-6 space-y-4">
        <Card className="p-4">
          <h2 className="font-semibold">Job details</h2>
          <p className="mt-2 whitespace-pre-line text-sm">{job.description}</p>
          {job.photos.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {job.photos.map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={p} alt="" className="h-20 w-20 rounded-lg border border-border object-cover" />
              ))}
            </div>
          )}
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
            <p><span className="text-muted-foreground">Budget: </span>{job.budgetMinPence ? formatPence(job.budgetMinPence) : "?"}–{job.budgetMaxPence ? formatPence(job.budgetMaxPence) : "?"}</p>
            <p><span className="text-muted-foreground">Address: </span>{job.addressLine ? `${job.addressLine}, ` : ""}{job.city}{job.postcode ? `, ${job.postcode}` : ""}</p>
            <p><span className="text-muted-foreground">Preferred date: </span>{job.preferredDate ? fmtDateTime(job.preferredDate) : job.flexibleDate ? "Flexible" : "—"}</p>
            <p><span className="text-muted-foreground">Expires: </span>{fmtDateTime(job.expiresAt)}</p>
            <p><span className="text-muted-foreground">Max lead sales: </span>{job.maxLeadSales}</p>
            <p><span className="text-muted-foreground">Lead price: </span>{formatPence(job.leadPricePence)}</p>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold">Customer</h2>
          <div className="mt-2 space-y-1 text-sm">
            <p className="font-medium">{customerName}</p>
            <p className="text-muted-foreground">{job.customer.email}</p>
            <p className="text-muted-foreground">{job.customer.phone ?? "No phone on file"}</p>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 font-semibold">Status timeline</h2>
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">No timeline events yet.</p>
          ) : (
            <div className="space-y-0">
              {timeline.map((entry, i) => (
                <div key={i} className="flex gap-3 pb-3 last:pb-0">
                  <div className="flex flex-col items-center">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600" />
                    {i < timeline.length - 1 && <span className="w-px flex-1 bg-border" />}
                  </div>
                  <div className="-mt-1">
                    <p className="text-sm font-medium">{entry.label}</p>
                    <p className="text-xs text-muted-foreground">{fmtDateTime(entry.at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {job.dispatcherAssignments.length > 0 && (
          <Card className="p-4">
            <h2 className="font-semibold">Dispatcher assignments</h2>
            <div className="mt-2 space-y-2">
              {job.dispatcherAssignments.map((a) => (
                <div key={a.id} className="rounded-lg border border-border p-3 text-sm">
                  <p><span className="text-muted-foreground">By </span>{a.dispatcher.email}<span className="text-muted-foreground"> → </span>{a.assignedBusiness.name}</p>
                  {a.note && <p className="mt-1 text-muted-foreground">{a.note}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{fmtDateTime(a.createdAt)}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-4">
          <h2 className="font-semibold">Quotes ({job.quotes.length})</h2>
          {job.quotes.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">No quotes yet.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {job.quotes.map((quote) => (
                <div key={quote.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                  <div>
                    <p className="font-medium">{quote.business.name}</p>
                    <p className="text-muted-foreground">{formatPence(quote.amountPence)} · {fmtDateTime(quote.createdAt)}</p>
                  </div>
                  <Badge variant={statusVariant(quote.status)}>{quote.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {job.lead && job.lead.accesses.length > 0 && (
          <Card className="p-4">
            <h2 className="font-semibold">Providers who accessed this lead</h2>
            <div className="mt-2 space-y-2">
              {job.lead.accesses.map((access) => (
                <div key={access.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                  <div>
                    <p className="font-medium">{access.business.name}</p>
                    <p className="text-muted-foreground">{access.acquisitionType.replace(/_/g, " ")} · {fmtDateTime(access.createdAt)}</p>
                  </div>
                  <Badge variant={statusVariant(access.status)}>{access.status}</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {job.booking && (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Booking</h2>
              <Badge variant={statusVariant(job.booking.status)}>{job.booking.status.replace(/_/g, " ")}</Badge>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
              <p><span className="text-muted-foreground">Provider: </span>{job.booking.business.name}</p>
              <p><span className="text-muted-foreground">Scheduled: </span>{fmtDateTime(job.booking.scheduledDate)}</p>
              <p><span className="text-muted-foreground">Total: </span>{formatPence(job.booking.totalAmountPence)}</p>
              {job.booking.assignedStaff && <p><span className="text-muted-foreground">Assigned staff: </span>{job.booking.assignedStaff.fullName}</p>}
              {job.booking.etaMinutes != null && <p><span className="text-muted-foreground">ETA given: </span>{job.booking.etaMinutes} min</p>}
              {job.booking.cancelledReason && <p className="text-red-600"><span className="text-muted-foreground">Cancelled: </span>{job.booking.cancelledReason}</p>}
            </div>
            {job.booking.payments.length > 0 && (
              <div className="mt-3 border-t border-border pt-3">
                <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Payments</p>
                <div className="space-y-1.5">
                  {job.booking.payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <span>{p.type.replace(/_/g, " ")} · {formatPence(p.amountPence)}</span>
                      <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {job.booking && (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Work log</h2>
              {job.booking.durationMinutes != null && (
                <span className="text-sm text-muted-foreground">{job.booking.durationMinutes} min on site</span>
              )}
            </div>
            {job.booking.jobSheetEntries.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {job.booking.startedAt ? "Job started but nothing logged yet." : "The provider hasn't started this job yet."}
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {job.booking.jobSheetEntries.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-border p-3">
                    <p className="text-sm">{entry.description}</p>
                    {entry.photos.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {entry.photos.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="" className="h-16 w-16 rounded-lg border border-border object-cover" />
                          </a>
                        ))}
                      </div>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">{fmtDateTime(entry.loggedAt)}</p>
                  </div>
                ))}
              </div>
            )}
            {job.booking.variations.length > 0 && (
              <div className="mt-3 border-t border-border pt-3">
                <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Extra work (variations)</p>
                <div className="space-y-1.5">
                  {job.booking.variations.map((v) => (
                    <div key={v.id} className="flex items-start justify-between gap-3 text-sm">
                      <span>{v.description}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span>+{formatPence(v.amountPence)}</span>
                        <Badge variant={statusVariant(v.status)}>{v.status}</Badge>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {job.booking.review && (
              <div className="mt-3 border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">Customer review</p>
                  <Badge variant={statusVariant(job.booking.review.status)}>{job.booking.review.status}</Badge>
                </div>
                <p className="mt-1 text-sm font-medium">
                  {"★".repeat(job.booking.review.rating)}
                  {"☆".repeat(Math.max(0, 5 - job.booking.review.rating))} {job.booking.review.rating}/5
                </p>
                {job.booking.review.comment && <p className="mt-1 text-sm text-muted-foreground">{job.booking.review.comment}</p>}
              </div>
            )}
          </Card>
        )}

        <Card className="p-4">
          <h2 className="font-semibold">Correspondence</h2>
          {job.conversations.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">No messages exchanged for this job yet.</p>
          ) : (
            <div className="mt-2 space-y-4">
              {job.conversations.map((convo) => (
                <div key={convo.id} className="rounded-lg border border-border">
                  <div className="border-b border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    Between {convo.participants.map((p) => (p.user.profile ? `${p.user.profile.firstName} ${p.user.profile.lastName}` : p.user.email)).join(" and ")}
                  </div>
                  <div className="max-h-96 space-y-3 overflow-y-auto p-3">
                    {convo.messages.length === 0 && <p className="text-sm text-muted-foreground">No messages sent yet.</p>}
                    {convo.messages.map((m) => (
                      <div key={m.id} className="text-sm">
                        <p className="font-medium">{participantName(m.senderId)}<span className="ml-2 text-xs font-normal text-muted-foreground">{fmtDateTime(m.createdAt)}</span></p>
                        <p className="mt-0.5 whitespace-pre-line text-muted-foreground">{m.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
