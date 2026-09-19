import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { Badge, Card, cn, formatPence } from "@asaplocal/ui";
import {
  ArrowLeft,
  Banknote,
  Briefcase,
  CalendarCheck,
  LogIn,
  PoundSterling,
  Star,
  Target,
  Wallet,
} from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { MetricCard } from "@/components/metric-card";
import { ListBreakdown } from "@/components/list-breakdown";
import { UserRowActions } from "@/components/user-row-actions";
import { ActivityChart, DonutStat, EarningsChart, LoginChart } from "./no-ssr-charts";

const DAY_MS = 24 * 3600 * 1000;
const TZ = "Europe/London";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATUS_VARIANT: Record<string, "success" | "destructive" | "outline" | "warning" | "secondary"> = {
  ACTIVE: "success",
  SUSPENDED: "destructive",
  DEACTIVATED: "outline",
  PENDING_VERIFICATION: "warning",
  VERIFIED: "success",
  REJECTED: "destructive",
  PENDING: "warning",
  MORE_INFO_REQUESTED: "warning",
  UNVERIFIED: "outline",
};

function statusVariant(status: string): "success" | "destructive" | "outline" | "warning" | "secondary" {
  if (["COMPLETED", "WON", "SUCCEEDED", "ACCEPTED", "CONFIRMED", "RESOLVED", "PUBLISHED", "APPROVED"].includes(status)) return "success";
  if (["CANCELLED", "EXPIRED", "LOST", "FAILED", "DECLINED", "DISPUTED", "OPEN", "REJECTED", "HIDDEN", "FLAGGED", "REFUNDED"].includes(status)) return "destructive";
  if (["IN_PROGRESS", "AWAITING_APPROVAL", "PENDING", "CONTACTED", "SENT"].includes(status)) return "warning";
  if (["QUOTED", "NEW"].includes(status)) return "secondary";
  return "outline";
}

const BOOKING_STATUS_COLOR: Record<string, string> = {
  COMPLETED: "#10b981",
  CONFIRMED: "#0ea5e9",
  IN_PROGRESS: "#8b5cf6",
  AWAITING_APPROVAL: "#f59e0b",
  PENDING: "#e8c3a8",
  DISPUTED: "#f43f5e",
  CANCELLED: "#9a8f85",
};

const PAYMENT_TYPE_LABEL: Record<string, string> = {
  LEAD_PURCHASE: "Lead purchases",
  LEAD_CREDIT_TOPUP: "Credit top-ups",
  SUBSCRIPTION: "Subscription",
};

const LOGIN_METHOD_LABEL: Record<string, string> = {
  credentials: "Password",
  google: "Google",
  apple: "Apple",
  webauthn: "Passkey",
};

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: TZ });
}

function fmtDateTime(d: Date) {
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TZ });
}

function pct(n: number, d: number) {
  return d > 0 ? `${((n / d) * 100).toFixed(0)}%` : "—";
}

function relative(d: Date | null) {
  if (!d) return "Never";
  const days = Math.floor((Date.now() - d.getTime()) / DAY_MS);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

function monthKey(d: Date) {
  return d.toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: TZ });
}

/** The last `n` calendar months, oldest first, as display keys. */
function lastMonths(n: number) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => monthKey(new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 15)));
}

function londonWeekdayHour(d: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short", hour: "numeric", hourCycle: "h23" }).formatToParts(d);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  return { day: Math.max(WEEKDAYS.indexOf(weekday), 0), hour };
}

function describeDevice(userAgent: string | null, deviceInfo: string | null) {
  if (deviceInfo) return deviceInfo;
  if (!userAgent) return "Unknown device";
  const os = /iPhone|iPad/.test(userAgent) ? "iOS" : /Android/.test(userAgent) ? "Android" : /Mac OS X/.test(userAgent) ? "macOS" : /Windows/.test(userAgent) ? "Windows" : /Linux/.test(userAgent) ? "Linux" : "Other";
  const browser = /Edg\//.test(userAgent) ? "Edge" : /Chrome\//.test(userAgent) ? "Chrome" : /Firefox\//.test(userAgent) ? "Firefox" : /Safari\//.test(userAgent) ? "Safari" : "Browser";
  return `${browser} on ${os}`;
}

type LoginMeta = { channel?: string; method?: string | null; host?: string | null; deviceInfo?: string | null };

type FeedItem = { at: Date; label: string; detail?: string; tone: string };

export default async function ProviderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const [session, user] = await Promise.all([
    auth(),
    prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        business: {
          include: {
            subscription: true,
            leadCreditWallet: true,
            services: { include: { category: { select: { name: true } } } },
            _count: { select: { staffMembers: true, favouritedBy: true, portfolioItems: true } },
          },
        },
      },
    }),
  ]);
  if (!user) notFound();
  // Earnings and platform spend are finance data — the providers list is
  // open to dispatchers too, but only admins see the money.
  const showFinance = session?.user?.role === "ADMIN";

  const business = user.business;
  const businessId = business?.id ?? "00000000-0000-0000-0000-000000000000";
  const now = Date.now();
  const since90 = new Date(now - 90 * DAY_MS);
  const since365 = new Date(now - 365 * DAY_MS);

  const [bookings, leadAccesses, quotes, reviews, payouts, spend, disputes, logins, mobileSessions, auditActions, messagesSent, messagesSent90, reportsAgainst] =
    await Promise.all([
      prisma.booking.findMany({
        where: { businessId },
        select: {
          id: true,
          status: true,
          totalAmountPence: true,
          providerNetPence: true,
          platformFeePence: true,
          scheduledDate: true,
          createdAt: true,
          completedAt: true,
          cancelledAt: true,
          settledAt: true,
          jobRequestId: true,
          city: true,
          service: { select: { title: true } },
          customer: { select: { email: true, profile: { select: { firstName: true, lastName: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 2000,
      }),
      prisma.leadAccess.findMany({
        where: { businessId },
        select: {
          id: true,
          status: true,
          acquisitionType: true,
          pricePaidPence: true,
          creditsSpent: true,
          isRefunded: true,
          createdAt: true,
          refundRequest: { select: { status: true, reason: true } },
          lead: { select: { jobRequest: { select: { id: true, title: true, city: true, category: { select: { name: true } } } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 2000,
      }),
      prisma.quote.findMany({
        where: { businessId },
        select: { status: true, amountPence: true, aiGenerated: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 2000,
      }),
      prisma.review.findMany({
        where: { businessId },
        select: {
          id: true,
          rating: true,
          comment: true,
          status: true,
          providerResponse: true,
          createdAt: true,
          author: { select: { email: true, profile: { select: { firstName: true, lastName: true } } } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.payout.findMany({ where: { businessId }, orderBy: { paidAt: "desc" } }),
      prisma.payment.findMany({
        where: { userId: id, type: { in: ["LEAD_PURCHASE", "LEAD_CREDIT_TOPUP", "SUBSCRIPTION"] } },
        select: { id: true, type: true, status: true, amountPence: true, refundedAmountPence: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.bookingDispute.findMany({
        where: { booking: { businessId } },
        select: { id: true, status: true, reason: true, createdAt: true, resolvedAt: true, bookingId: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.auditLog.findMany({
        where: { actorId: id, action: "auth.login", createdAt: { gte: since365 } },
        select: { id: true, createdAt: true, metadata: true, ipAddress: true, userAgent: true },
        orderBy: { createdAt: "desc" },
        take: 5000,
      }),
      prisma.mobileSession.findMany({
        where: { userId: id },
        select: { id: true, deviceInfo: true, createdAt: true, expiresAt: true, revokedAt: true },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
      prisma.auditLog.findMany({
        where: { actorId: id, action: { not: "auth.login" } },
        select: { id: true, action: true, targetType: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.message.count({ where: { senderId: id } }),
      prisma.message.count({ where: { senderId: id, createdAt: { gte: since90 } } }),
      prisma.report.findMany({
        where: {
          OR: [
            { targetType: "USER", targetId: id },
            ...(business ? [{ targetType: "LISTING" as const, targetId: { in: [business.id, ...business.services.map((s) => s.id)] } }] : []),
          ],
        },
        select: { id: true, reason: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  // ── Earnings ────────────────────────────────────────────────────────────
  const completed = bookings.filter((b) => b.status === "COMPLETED");
  const settled = bookings.filter((b) => b.settledAt);
  const grossPence = completed.reduce((s, b) => s + b.totalAmountPence, 0);
  const netEarnedPence = settled.reduce((s, b) => s + (b.providerNetPence ?? 0), 0);
  const feesPence = settled.reduce((s, b) => s + (b.platformFeePence ?? 0), 0);
  const paidOutPence = payouts.reduce((s, p) => s + p.amountPence, 0);
  const balancePence = netEarnedPence - paidOutPence;
  const avgJobPence = completed.length > 0 ? Math.round(grossPence / completed.length) : 0;
  const succeededSpend = spend.filter((p) => p.status === "SUCCEEDED" || p.status === "PARTIALLY_REFUNDED");
  const spendPence = succeededSpend.reduce((s, p) => s + p.amountPence - p.refundedAmountPence, 0);

  const months = lastMonths(12);
  const earningsByMonth = new Map(months.map((m) => [m, { month: m, gross: 0, net: 0, paidOut: 0 }]));
  for (const b of completed) {
    const row = earningsByMonth.get(monthKey(b.completedAt ?? b.scheduledDate));
    if (row) row.gross += b.totalAmountPence / 100;
  }
  for (const b of settled) {
    const row = earningsByMonth.get(monthKey(b.settledAt!));
    if (row) row.net += (b.providerNetPence ?? 0) / 100;
  }
  for (const p of payouts) {
    const row = earningsByMonth.get(monthKey(p.paidAt));
    if (row) row.paidOut += p.amountPence / 100;
  }
  const earningsData = [...earningsByMonth.values()];

  const spendByType = new Map<string, number>();
  for (const p of succeededSpend) spendByType.set(p.type, (spendByType.get(p.type) ?? 0) + p.amountPence - p.refundedAmountPence);

  // ── Engagement ──────────────────────────────────────────────────────────
  const activityByMonth = new Map(months.map((m) => [m, { month: m, leads: 0, quotes: 0, bookings: 0, completed: 0 }]));
  for (const l of leadAccesses) {
    const row = activityByMonth.get(monthKey(l.createdAt));
    if (row) row.leads++;
  }
  for (const q of quotes) {
    const row = activityByMonth.get(monthKey(q.createdAt));
    if (row) row.quotes++;
  }
  for (const b of bookings) {
    const row = activityByMonth.get(monthKey(b.createdAt));
    if (row) row.bookings++;
    const doneRow = b.status === "COMPLETED" && b.completedAt ? activityByMonth.get(monthKey(b.completedAt)) : undefined;
    if (doneRow) doneRow.completed++;
  }
  const activityData = [...activityByMonth.values()];

  const leadsTotal = leadAccesses.length;
  const leadReached = (statuses: string[]) => leadAccesses.filter((l) => statuses.includes(l.status)).length;
  const contacted = leadReached(["CONTACTED", "QUOTED", "WON"]);
  const quotedLeads = leadReached(["QUOTED", "WON"]);
  const won = leadReached(["WON"]);
  const lost = leadReached(["LOST"]);
  const funnel = [
    { label: `Acquired`, value: leadsTotal, color: "bg-sky-500" },
    { label: `Contacted · ${pct(contacted, leadsTotal)}`, value: contacted, color: "bg-amber-500" },
    { label: `Quoted · ${pct(quotedLeads, leadsTotal)}`, value: quotedLeads, color: "bg-violet-500" },
    { label: `Won · ${pct(won, leadsTotal)}`, value: won, color: "bg-emerald-500" },
    { label: `Lost · ${pct(lost, leadsTotal)}`, value: lost, color: "bg-red-500" },
  ];

  const acquisitionCounts = new Map<string, number>();
  for (const l of leadAccesses) acquisitionCounts.set(l.acquisitionType, (acquisitionCounts.get(l.acquisitionType) ?? 0) + 1);

  const bookingStatusCounts = new Map<string, number>();
  for (const b of bookings) bookingStatusCounts.set(b.status, (bookingStatusCounts.get(b.status) ?? 0) + 1);
  const bookingSegments = [...bookingStatusCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([status, value]) => ({ label: status.replace(/_/g, " ").toLowerCase(), value, color: BOOKING_STATUS_COLOR[status] ?? "#9a8f85" }));

  const decidedQuotes = quotes.filter((q) => ["ACCEPTED", "DECLINED", "EXPIRED"].includes(q.status));
  const acceptedQuotes = quotes.filter((q) => q.status === "ACCEPTED").length;
  const aiQuotes = quotes.filter((q) => q.aiGenerated).length;

  // ── Reputation ──────────────────────────────────────────────────────────
  const publishedReviews = reviews.filter((r) => r.status === "PUBLISHED");
  const avgRating = publishedReviews.length > 0 ? publishedReviews.reduce((s, r) => s + r.rating, 0) / publishedReviews.length : 0;
  const ratingItems = [5, 4, 3, 2, 1].map((stars) => ({
    label: `${stars} ★`,
    value: publishedReviews.filter((r) => r.rating === stars).length,
    color: stars >= 4 ? "bg-emerald-500" : stars === 3 ? "bg-amber-500" : "bg-red-500",
  }));
  const respondedReviews = reviews.filter((r) => r.providerResponse).length;

  // ── Logins ──────────────────────────────────────────────────────────────
  const loginDays = Array.from({ length: 90 }, (_, i) => {
    const d = new Date(now - (89 - i) * DAY_MS);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: TZ });
  });
  const loginsByDay = new Map(loginDays.map((day) => [day, { day, web: 0, mobile: 0 }]));
  const heatmap = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  const methodCounts = new Map<string, number>();
  const logins90 = logins.filter((l) => l.createdAt >= since90);
  for (const l of logins90) {
    const meta = (l.metadata ?? {}) as LoginMeta;
    const row = loginsByDay.get(l.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: TZ }));
    if (row) row[meta.channel === "mobile" ? "mobile" : "web"]++;
    const { day, hour } = londonWeekdayHour(l.createdAt);
    const heatRow = heatmap[day];
    if (heatRow) heatRow[hour] = (heatRow[hour] ?? 0) + 1;
    const method = LOGIN_METHOD_LABEL[meta.method ?? ""] ?? meta.method ?? "Unknown";
    methodCounts.set(method, (methodCounts.get(method) ?? 0) + 1);
  }
  const loginData = [...loginsByDay.values()];
  const heatMax = Math.max(1, ...heatmap.flat());
  const activeDays90 = loginData.filter((d) => d.web + d.mobile > 0).length;
  const mobileLogins90 = loginData.reduce((s, d) => s + d.mobile, 0);
  const distinctIps = new Set(logins90.map((l) => l.ipAddress).filter(Boolean)).size;
  const activeDevices = mobileSessions.filter((s) => !s.revokedAt && s.expiresAt.getTime() > now).length;
  const loginSparkline = Array.from({ length: 13 }, (_, w) =>
    loginData.slice(w * 7, w * 7 + 7).reduce((s, d) => s + d.web + d.mobile, 0)
  );

  // ── Behaviour signals ───────────────────────────────────────────────────
  const cancelled = bookings.filter((b) => b.status === "CANCELLED").length;
  const refundRequests = leadAccesses.filter((l) => l.refundRequest);
  const refundsApproved = refundRequests.filter((l) => l.refundRequest?.status === "APPROVED").length;
  const openDisputes = disputes.filter((d) => d.status === "OPEN").length;
  const openReports = reportsAgainst.filter((r) => r.status === "OPEN" || r.status === "IN_REVIEW").length;
  const flaggedReviews = reviews.filter((r) => r.status === "FLAGGED" || r.status === "HIDDEN").length;

  type Tone = "good" | "warn" | "bad" | "neutral";
  const rate = (n: number, d: number) => (d > 0 ? n / d : 0);
  const signals: { label: string; value: string; hint: string; tone: Tone }[] = [
    {
      label: "Lead win rate",
      value: pct(won, leadsTotal),
      hint: `${won} of ${leadsTotal} leads won`,
      tone: leadsTotal < 5 ? "neutral" : rate(won, leadsTotal) >= 0.2 ? "good" : rate(won, leadsTotal) >= 0.08 ? "warn" : "bad",
    },
    {
      label: "Quote acceptance",
      value: pct(acceptedQuotes, decidedQuotes.length),
      hint: `${acceptedQuotes} accepted of ${decidedQuotes.length} decided`,
      tone: decidedQuotes.length < 3 ? "neutral" : rate(acceptedQuotes, decidedQuotes.length) >= 0.3 ? "good" : "warn",
    },
    {
      label: "Cancellation rate",
      value: pct(cancelled, bookings.length),
      hint: `${cancelled} of ${bookings.length} bookings cancelled`,
      tone: bookings.length < 3 ? "neutral" : rate(cancelled, bookings.length) <= 0.1 ? "good" : rate(cancelled, bookings.length) <= 0.25 ? "warn" : "bad",
    },
    {
      label: "Disputes",
      value: disputes.length.toString(),
      hint: `${openDisputes} open · ${pct(disputes.length, completed.length)} of completed jobs`,
      tone: openDisputes > 0 ? "bad" : disputes.length === 0 ? "good" : "warn",
    },
    {
      label: "Lead refund requests",
      value: refundRequests.length.toString(),
      hint: `${refundsApproved} approved · ${pct(refundRequests.length, leadsTotal)} of leads`,
      tone: leadsTotal < 5 ? "neutral" : rate(refundRequests.length, leadsTotal) <= 0.1 ? "good" : rate(refundRequests.length, leadsTotal) <= 0.25 ? "warn" : "bad",
    },
    {
      label: "Reports against",
      value: reportsAgainst.length.toString(),
      hint: `${openReports} open or in review`,
      tone: openReports > 0 ? "bad" : reportsAgainst.length === 0 ? "good" : "warn",
    },
    {
      label: "Review replies",
      value: pct(respondedReviews, reviews.length),
      hint: `${respondedReviews} of ${reviews.length} reviews answered · ${flaggedReviews} flagged/hidden`,
      tone: reviews.length === 0 ? "neutral" : rate(respondedReviews, reviews.length) >= 0.5 ? "good" : "warn",
    },
    {
      label: "Response time",
      value: business?.avgResponseMins != null ? `${business.avgResponseMins} min` : "—",
      hint: `Response rate ${business ? Number(business.responseRatePct).toFixed(0) : 0}%${business?.targetResponseMins ? ` · target ${business.targetResponseMins} min` : ""}`,
      tone: business?.avgResponseMins == null ? "neutral" : business.avgResponseMins <= 60 ? "good" : business.avgResponseMins <= 240 ? "warn" : "bad",
    },
    {
      label: "Messages sent",
      value: messagesSent.toLocaleString(),
      hint: `${messagesSent90} in the last 90 days`,
      tone: "neutral",
    },
    {
      label: "Last seen",
      value: relative(user.lastLoginAt),
      hint: `${activeDays90} active days in the last 90`,
      tone: !user.lastLoginAt ? "bad" : now - user.lastLoginAt.getTime() <= 14 * DAY_MS ? "good" : now - user.lastLoginAt.getTime() <= 60 * DAY_MS ? "warn" : "bad",
    },
  ];
  const TONE_CLASS: Record<Tone, string> = {
    good: "bg-emerald-500",
    warn: "bg-amber-500",
    bad: "bg-red-500",
    neutral: "bg-muted-foreground/40",
  };

  // ── Activity feed ───────────────────────────────────────────────────────
  const feed: FeedItem[] = [
    ...leadAccesses.slice(0, 15).map((l) => ({ at: l.createdAt, label: "Acquired a lead", detail: l.lead.jobRequest.title, tone: "bg-sky-500" })),
    ...quotes.slice(0, 15).map((q) => ({ at: q.createdAt, label: `Sent a quote${q.aiGenerated ? " (AI-drafted)" : ""}`, detail: formatPence(q.amountPence), tone: "bg-violet-500" })),
    ...bookings.slice(0, 15).map((b) => ({ at: b.createdAt, label: "New booking", detail: b.service?.title ?? b.city, tone: "bg-amber-500" })),
    ...completed.slice(0, 15).filter((b) => b.completedAt).map((b) => ({ at: b.completedAt!, label: "Completed a job", detail: formatPence(b.totalAmountPence), tone: "bg-emerald-500" })),
    ...reviews.slice(0, 10).map((r) => ({ at: r.createdAt, label: `Received a ${r.rating}★ review`, detail: r.comment?.slice(0, 80) ?? undefined, tone: "bg-yellow-500" })),
    ...disputes.slice(0, 10).map((d) => ({ at: d.createdAt, label: "Dispute raised by customer", detail: d.reason.slice(0, 80), tone: "bg-red-500" })),
    ...(showFinance ? payouts.slice(0, 10).map((p) => ({ at: p.paidAt, label: "Payout sent", detail: formatPence(p.amountPence), tone: "bg-emerald-700" })) : []),
    ...auditActions.slice(0, 15).map((a) => ({ at: a.createdAt, label: a.action.replace(/[._]/g, " "), detail: a.targetType, tone: "bg-muted-foreground" })),
    ...logins.slice(0, 10).map((l) => {
      const meta = (l.metadata ?? {}) as LoginMeta;
      return { at: l.createdAt, label: `Logged in (${meta.channel === "mobile" ? "mobile app" : "web"})`, detail: describeDevice(l.userAgent, meta.deviceInfo ?? null), tone: "bg-brand-500" };
    }),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 25);

  const displayName = user.profile ? `${user.profile.firstName} ${user.profile.lastName}` : (user.name ?? user.email);
  const initials = displayName
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sections = [
    { id: "overview", label: "Overview" },
    ...(showFinance ? [{ id: "earnings", label: "Earnings" }] : []),
    { id: "engagement", label: "Engagement" },
    { id: "logins", label: "Logins" },
    { id: "behaviour", label: "Behaviour" },
    { id: "records", label: "Records" },
  ];

  return (
    <div>
      <Link href="/users/providers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Providers
      </Link>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
        <div className="flex min-w-0 items-start gap-4">
          {business?.logoUrl || user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={business?.logoUrl ?? user.image!} alt="" className="h-16 w-16 shrink-0 rounded-full border border-border object-cover" />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xl font-bold text-white">{initials}</div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{displayName}</h1>
              <Badge variant={STATUS_VARIANT[user.status] ?? "outline"}>{user.status.replace(/_/g, " ")}</Badge>
              {business && <Badge variant={STATUS_VARIANT[business.verificationStatus] ?? "outline"}>{business.verificationStatus.replace(/_/g, " ")}</Badge>}
              {business && <Badge variant="secondary">{business.trustTier}</Badge>}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {business ? (
                <>
                  <span className="font-medium text-foreground">{business.name}</span> · {business.city}
                  {business.postcode ? ` ${business.postcode}` : ""} ·{" "}
                </>
              ) : (
                "No business profile yet · "
              )}
              {user.email}
              {user.phone ? ` · ${user.phone}` : ""}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Joined {fmtDate(user.createdAt)}
              {user.providerSince ? ` · Provider since ${fmtDate(user.providerSince)}` : ""} · Last login{" "}
              {user.lastLoginAt ? fmtDateTime(user.lastLoginAt) : "never"}
              {business?.subscription ? ` · ${business.subscription.plan} plan (${business.subscription.status.toLowerCase()})` : ""}
            </p>
            {user.suspendedReason && <p className="mt-1 text-xs text-red-700">Suspended: {user.suspendedReason}</p>}
          </div>
        </div>
        <UserRowActions userId={user.id} status={user.status} businessId={business?.id} />
      </div>

      <nav className="sticky top-0 z-20 -mx-1 flex gap-6 overflow-x-auto border-b border-border bg-background px-1 text-sm">
        {sections.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="-mb-px whitespace-nowrap border-b-2 border-transparent px-1 py-3 text-muted-foreground hover:border-brand-500 hover:text-foreground">
            {s.label}
          </a>
        ))}
      </nav>

      {/* ── KPIs ───────────────────────────────────────────────────────── */}
      <div id="overview" className="mt-6 grid scroll-mt-16 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {showFinance ? (
          <>
            <StatCard icon={<PoundSterling size={20} />} accent="brand" label="Net earnings (settled)" value={formatPence(netEarnedPence)} sparkline={earningsData.map((d) => d.net)} />
            <StatCard icon={<Banknote size={20} />} accent="emerald" label={`Paid out · ${formatPence(balancePence)} outstanding`} value={formatPence(paidOutPence)} sparkline={earningsData.map((d) => d.paidOut)} />
          </>
        ) : (
          <>
            <StatCard icon={<Target size={20} />} accent="brand" label="Leads acquired" value={leadsTotal.toLocaleString()} sparkline={activityData.map((d) => d.leads)} />
            <StatCard icon={<Briefcase size={20} />} accent="emerald" label="Quotes sent" value={quotes.length.toLocaleString()} sparkline={activityData.map((d) => d.quotes)} />
          </>
        )}
        <StatCard icon={<CalendarCheck size={20} />} accent="sky" label={`Jobs completed · ${bookings.length} bookings`} value={completed.length.toLocaleString()} sparkline={activityData.map((d) => d.completed)} />
        <StatCard icon={<Star size={20} />} accent="amber" label={`Avg rating · ${publishedReviews.length} reviews`} value={publishedReviews.length > 0 ? avgRating.toFixed(1) : "—"} />
        <StatCard icon={<Target size={20} />} accent="violet" label={`Lead win rate · ${leadsTotal} leads`} value={pct(won, leadsTotal)} sparkline={activityData.map((d) => d.leads)} />
        {showFinance && (
          <StatCard icon={<Wallet size={20} />} accent="rose" label="Spent on platform (leads & plan)" value={formatPence(spendPence)} />
        )}
        <StatCard icon={<LogIn size={20} />} accent="brand" label={`Logins (90d) · ${activeDays90} active days`} value={logins90.length.toLocaleString()} sparkline={loginSparkline} />
        <StatCard
          icon={<Briefcase size={20} />}
          accent="sky"
          label="Live services"
          value={`${business?.services.filter((s) => s.isActive).length ?? 0} / ${business?.services.length ?? 0}`}
        />
      </div>

      {/* ── Earnings ───────────────────────────────────────────────────── */}
      {showFinance && (
        <div id="earnings" className="mt-3 grid scroll-mt-16 grid-cols-1 gap-3 xl:grid-cols-3">
          <MetricCard
            title="Earnings trend"
            subtitle="Completed job value, settled net earnings and payouts over the last 12 months."
            className="xl:col-span-2"
            stats={[
              { label: "Job value (completed)", value: formatPence(grossPence), color: "bg-brand-200" },
              { label: "Net earned", value: formatPence(netEarnedPence), color: "bg-brand-500" },
              { label: "Platform fees", value: formatPence(feesPence), color: "bg-violet-500" },
              { label: "Avg job", value: formatPence(avgJobPence), color: "bg-sky-500" },
            ]}
          >
            <div className="h-72 w-full">
              <EarningsChart data={earningsData} />
            </div>
          </MetricCard>
          <MetricCard
            title="Platform spend"
            subtitle="What this provider has paid AsapLocal, net of refunds."
            stats={[
              { label: "Total", value: formatPence(spendPence), color: "bg-rose-500" },
              { label: "Credit balance", value: `${business?.leadCreditWallet?.balance ?? 0} credits`, color: "bg-amber-500" },
            ]}
          >
            <ListBreakdown
              items={(
                [
                  ["LEAD_PURCHASE", "bg-sky-500"],
                  ["LEAD_CREDIT_TOPUP", "bg-amber-500"],
                  ["SUBSCRIPTION", "bg-brand-500"],
                ] as const
              ).map(([t, color]) => ({
                label: `${PAYMENT_TYPE_LABEL[t]} · ${formatPence(spendByType.get(t) ?? 0)}`,
                value: Math.round((spendByType.get(t) ?? 0) / 100),
                color,
              }))}
            />
            {business?.subscription && (
              <p className="mt-4 text-xs text-muted-foreground">
                Allowance used this period: {business.subscription.leadAllowanceUsed} / {business.subscription.monthlyLeadAllowance}
                {business.subscription.currentPeriodEnd ? ` · renews ${fmtDate(business.subscription.currentPeriodEnd)}` : ""}
              </p>
            )}
          </MetricCard>
        </div>
      )}

      {/* ── Engagement ─────────────────────────────────────────────────── */}
      <div id="engagement" className="mt-3 grid scroll-mt-16 grid-cols-1 gap-3 xl:grid-cols-3">
        <MetricCard
          title="Marketplace activity"
          subtitle="Leads acquired, quotes sent and bookings per month."
          className="xl:col-span-2"
          stats={[
            { label: "Leads", value: leadsTotal.toLocaleString(), color: "bg-sky-500" },
            { label: "Quotes", value: `${quotes.length} (${aiQuotes} AI)`, color: "bg-violet-500" },
            { label: "Bookings", value: bookings.length.toLocaleString(), color: "bg-amber-500" },
            { label: "Completed", value: completed.length.toLocaleString(), color: "bg-emerald-500" },
          ]}
        >
          <div className="h-72 w-full">
            <ActivityChart data={activityData} />
          </div>
        </MetricCard>
        <MetricCard title="Lead funnel" subtitle="How far each acquired lead got in this provider's pipeline.">
          <ListBreakdown items={funnel} />
          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            {[...acquisitionCounts.entries()].map(([type, count]) => (
              <span key={type} className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                {type.replace(/_/g, " ").toLowerCase()}: <span className="font-semibold text-foreground">{count}</span>
              </span>
            ))}
          </div>
        </MetricCard>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <DonutStat
          title="Bookings by status"
          subtitle="Every booking this provider has received."
          centerValue={bookings.length.toLocaleString()}
          centerLabel="bookings"
          segments={bookingSegments.length > 0 ? bookingSegments : [{ label: "none", value: 0, color: "#e5e0da" }]}
        />
        <MetricCard
          title="Ratings"
          subtitle="Published reviews by star rating."
          stats={[
            { label: "Average", value: publishedReviews.length > 0 ? `${avgRating.toFixed(2)} ★` : "—", color: "bg-amber-500" },
            { label: "Profile views", value: (business?.profileViews ?? 0).toLocaleString(), color: "bg-sky-500" },
            { label: "Favourited", value: (business?._count.favouritedBy ?? 0).toLocaleString(), color: "bg-rose-500" },
          ]}
        >
          <ListBreakdown items={ratingItems} />
        </MetricCard>
        <MetricCard title="Services offered" subtitle={`${business?._count.staffMembers ?? 0} staff · ${business?._count.portfolioItems ?? 0} portfolio items`}>
          <div className="space-y-2 text-sm">
            {(business?.services ?? []).map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.category.name} · {s.priceType.replace(/_/g, " ").toLowerCase()}
                    {s.priceMinPence != null ? ` · from ${formatPence(s.priceMinPence)}` : ""}
                  </p>
                </div>
                <Badge variant={s.isActive ? "success" : "outline"}>{s.isActive ? "Live" : "Paused"}</Badge>
              </div>
            ))}
            {(business?.services.length ?? 0) === 0 && <p className="text-muted-foreground">No services listed.</p>}
          </div>
        </MetricCard>
      </div>

      {/* ── Logins ─────────────────────────────────────────────────────── */}
      <div id="logins" className="mt-3 grid scroll-mt-16 grid-cols-1 gap-3 xl:grid-cols-3">
        <MetricCard
          title="Login activity"
          subtitle="Sign-ins per day over the last 90 days, web vs. mobile app."
          className="xl:col-span-2"
          stats={[
            { label: "Logins (90d)", value: logins90.length.toLocaleString(), color: "bg-brand-500" },
            { label: "Mobile share", value: pct(mobileLogins90, logins90.length), color: "bg-sky-500" },
            { label: "Distinct IPs", value: distinctIps.toLocaleString(), color: "bg-violet-500" },
            { label: "Active devices", value: activeDevices.toLocaleString(), color: "bg-emerald-500" },
          ]}
        >
          <div className="h-56 w-full">
            <LoginChart data={loginData} />
          </div>
        </MetricCard>
        <MetricCard title="When they log in" subtitle="Day × hour of sign-ins, last 90 days (UK time).">
          <div className="overflow-x-auto">
            <div className="grid min-w-[300px] gap-[2px]" style={{ gridTemplateColumns: "28px repeat(24, minmax(0, 1fr))" }}>
              {WEEKDAYS.map((wd, day) => (
                <div key={wd} className="contents">
                  <span className="pr-1 text-[10px] leading-3 text-muted-foreground">{wd}</span>
                  {(heatmap[day] ?? []).map((count, hour) => (
                    <div
                      key={hour}
                      title={`${wd} ${String(hour).padStart(2, "0")}:00 — ${count} login${count === 1 ? "" : "s"}`}
                      className={cn("aspect-square rounded-[2px]", count === 0 && "bg-muted")}
                      style={count > 0 ? { backgroundColor: `rgba(193, 95, 42, ${0.2 + 0.8 * (count / heatMax)})` } : undefined}
                    />
                  ))}
                </div>
              ))}
              <span />
              {Array.from({ length: 24 }, (_, h) => (
                <span key={h} className="text-center text-[9px] text-muted-foreground">
                  {h % 6 === 0 ? h : ""}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-5">
            <ListBreakdown items={[...methodCounts.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value, color: "bg-brand-500" }))} />
            {logins90.length === 0 && <p className="text-sm text-muted-foreground">No logins recorded in the last 90 days.</p>}
          </div>
        </MetricCard>
      </div>

      {/* ── Behaviour ──────────────────────────────────────────────────── */}
      <div id="behaviour" className="mt-3 grid scroll-mt-16 grid-cols-1 gap-3 xl:grid-cols-3">
        <Card className="rounded-none border-border p-5 shadow-none xl:col-span-2">
          <h3 className="text-sm font-semibold">Behaviour signals</h3>
          <p className="mt-1 text-xs text-muted-foreground">Green is healthy, amber is worth watching, red needs attention. Grey means too little data.</p>
          <div className="mt-4 grid grid-cols-1 gap-px overflow-hidden border border-border bg-border sm:grid-cols-2">
            {signals.map((s) => (
              <div key={s.label} className="flex items-start gap-3 bg-card p-4">
                <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", TONE_CLASS[s.tone])} />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-lg font-bold leading-tight">{s.value}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.hint}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="rounded-none border-border p-5 shadow-none">
          <h3 className="text-sm font-semibold">Recent activity</h3>
          <p className="mt-1 text-xs text-muted-foreground">Everything this provider did most recently, newest first.</p>
          <ol className="mt-4 max-h-[520px] space-y-3 overflow-y-auto pr-1">
            {feed.map((f, i) => (
              <li key={i} className="flex gap-3">
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", f.tone)} />
                <div className="min-w-0">
                  <p className="text-sm font-medium first-letter:uppercase">{f.label}</p>
                  {f.detail && <p className="truncate text-xs text-muted-foreground">{f.detail}</p>}
                  <p className="text-[11px] text-muted-foreground">{fmtDateTime(f.at)}</p>
                </div>
              </li>
            ))}
            {feed.length === 0 && <li className="text-sm text-muted-foreground">No activity yet.</li>}
          </ol>
        </Card>
      </div>

      {/* ── Records ────────────────────────────────────────────────────── */}
      <div id="records" className="scroll-mt-16">
        <DataTable
          title="Bookings"
          subtitle={`${bookings.length} total — most recent 15`}
          headers={["Created", "Customer", "Service", "Scheduled", "Status", ...(showFinance ? ["Value", "Net"] : [])]}
          rows={bookings.slice(0, 15).map((b) => [
            fmtDate(b.createdAt),
            b.customer.profile ? `${b.customer.profile.firstName} ${b.customer.profile.lastName}` : b.customer.email,
            b.jobRequestId ? (
              <Link href={`/operations/jobs/${b.jobRequestId}`} className="text-brand-700 hover:underline">
                {b.service?.title ?? "Job request"}
              </Link>
            ) : (
              (b.service?.title ?? "—")
            ),
            fmtDate(b.scheduledDate),
            <Badge key="s" variant={statusVariant(b.status)}>{b.status.replace(/_/g, " ")}</Badge>,
            ...(showFinance ? [formatPence(b.totalAmountPence), b.providerNetPence != null ? formatPence(b.providerNetPence) : "—"] : []),
          ])}
        />

        <DataTable
          title="Leads"
          subtitle={`${leadsTotal} acquired — most recent 15`}
          headers={["Acquired", "Job", "Category", "Via", ...(showFinance ? ["Paid"] : []), "Status", "Refund"]}
          rows={leadAccesses.slice(0, 15).map((l) => [
            fmtDate(l.createdAt),
            <Link key="j" href={`/operations/jobs/${l.lead.jobRequest.id}`} className="text-brand-700 hover:underline">
              {l.lead.jobRequest.title}
            </Link>,
            l.lead.jobRequest.category.name,
            l.acquisitionType.replace(/_/g, " ").toLowerCase(),
            ...(showFinance ? [l.pricePaidPence > 0 ? formatPence(l.pricePaidPence) : l.creditsSpent > 0 ? `${l.creditsSpent} credits` : "—"] : []),
            <Badge key="s" variant={statusVariant(l.status)}>{l.status}</Badge>,
            l.refundRequest ? <Badge key="r" variant={statusVariant(l.refundRequest.status)}>{l.refundRequest.status}</Badge> : "—",
          ])}
        />

        <div className="grid grid-cols-1 gap-x-3 xl:grid-cols-2">
          <DataTable
            title="Recent logins"
            subtitle={`${logins.length} in the last year — most recent 20`}
            headers={["When", "Channel", "Method", "Device", "IP"]}
            rows={logins.slice(0, 20).map((l) => {
              const meta = (l.metadata ?? {}) as LoginMeta;
              return [
                fmtDateTime(l.createdAt),
                meta.channel === "mobile" ? "Mobile app" : (meta.host ?? "Web"),
                LOGIN_METHOD_LABEL[meta.method ?? ""] ?? meta.method ?? "—",
                describeDevice(l.userAgent, meta.deviceInfo ?? null),
                l.ipAddress ?? "—",
              ];
            })}
            empty="No logins recorded yet — login history is captured from this release onward."
          />
          <DataTable
            title="Mobile devices"
            subtitle={`${activeDevices} active sessions`}
            headers={["Signed in", "Device", "State"]}
            rows={mobileSessions.slice(0, 20).map((s) => [
              fmtDateTime(s.createdAt),
              s.deviceInfo ?? "Unknown device",
              s.revokedAt ? (
                <Badge key="st" variant="outline">Signed out</Badge>
              ) : s.expiresAt.getTime() < now ? (
                <Badge key="st" variant="outline">Expired</Badge>
              ) : (
                <Badge key="st" variant="success">Active</Badge>
              ),
            ])}
            empty="Never signed in on the mobile app."
          />
        </div>

        <DataTable
          title="Reviews"
          subtitle={`${reviews.length} total — most recent 10`}
          headers={["Date", "Customer", "Rating", "Comment", "Replied", "Status"]}
          rows={reviews.slice(0, 10).map((r) => [
            fmtDate(r.createdAt),
            r.author.profile ? `${r.author.profile.firstName} ${r.author.profile.lastName}` : r.author.email,
            <span key="r" className="font-semibold text-amber-600">{"★".repeat(r.rating)}<span className="text-muted-foreground/40">{"★".repeat(5 - r.rating)}</span></span>,
            <span key="c" className="line-clamp-2 max-w-md whitespace-normal">{r.comment ?? "—"}</span>,
            r.providerResponse ? "Yes" : "No",
            <Badge key="s" variant={statusVariant(r.status)}>{r.status}</Badge>,
          ])}
        />

        {showFinance && (
          <div className="grid grid-cols-1 gap-x-3 xl:grid-cols-2">
            <DataTable
              title="Payouts"
              subtitle={`${formatPence(paidOutPence)} across ${payouts.length} payouts`}
              headers={["Paid", "Amount", "Fee retained", "Method", "Reference"]}
              rows={payouts.slice(0, 15).map((p) => [
                fmtDate(p.paidAt),
                formatPence(p.amountPence),
                formatPence(p.platformFeePence),
                p.method === "STRIPE_CONNECT" ? "Stripe" : "Manual",
                p.reference ?? "—",
              ])}
            />
            <DataTable
              title="Payments to AsapLocal"
              subtitle={`${spend.length} payments`}
              headers={["Date", "Type", "Amount", "Status"]}
              rows={spend.slice(0, 15).map((p) => [
                fmtDate(p.createdAt),
                PAYMENT_TYPE_LABEL[p.type] ?? p.type,
                formatPence(p.amountPence),
                <Badge key="s" variant={statusVariant(p.status)}>{p.status.replace(/_/g, " ")}</Badge>,
              ])}
            />
          </div>
        )}

        {(disputes.length > 0 || reportsAgainst.length > 0) && (
          <div className="grid grid-cols-1 gap-x-3 xl:grid-cols-2">
            <DataTable
              title="Disputes"
              subtitle={`${openDisputes} open`}
              headers={["Raised", "Reason", "Status"]}
              rows={disputes.slice(0, 10).map((d) => [
                fmtDate(d.createdAt),
                <span key="r" className="line-clamp-2 max-w-md whitespace-normal">{d.reason}</span>,
                <Badge key="s" variant={statusVariant(d.status)}>{d.status}</Badge>,
              ])}
            />
            <DataTable
              title="Reports against"
              subtitle={`${openReports} open`}
              headers={["Filed", "Reason", "Status"]}
              rows={reportsAgainst.slice(0, 10).map((r) => [
                fmtDate(r.createdAt),
                r.reason,
                <Badge key="s" variant={statusVariant(r.status)}>{r.status.replace(/_/g, " ")}</Badge>,
              ])}
            />
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-border py-4 text-xs text-muted-foreground">
        <span>Provider ID {user.id}</span>
        {business && (
          <Link href={`/operations/verification/${business.id}`} className="text-brand-700 hover:underline">
            Verification record →
          </Link>
        )}
      </div>
    </div>
  );
}

function DataTable({
  title,
  subtitle,
  headers,
  rows,
  empty = "Nothing here yet.",
}: {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: React.ReactNode[][];
  empty?: string;
}) {
  return (
    <Card className="mt-3 overflow-hidden rounded-none border-border shadow-none">
      <div className="px-5 pt-5">
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-y border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <tr>
              {headers.map((h) => (
                <th key={h} className="whitespace-nowrap px-5 py-2.5">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((cells, i) => (
              <tr key={i} className="hover:bg-muted/30">
                {cells.map((c, j) => (
                  <td key={j} className="whitespace-nowrap px-5 py-2.5 text-muted-foreground first:text-foreground">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={headers.length} className="px-5 py-8 text-center text-muted-foreground">
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
