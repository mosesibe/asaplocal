import Link from "next/link";
import { Prisma, prisma } from "@asaplocal/db";
import { Badge, formatPence } from "@asaplocal/ui";
import { Receipt, CheckCircle2, Clock } from "lucide-react";
import { Download, Eye } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { ListToolbar } from "@/components/list-toolbar";
import { Pagination } from "@/components/pagination";
import { invoiceNumber } from "@/lib/invoice-number";

const PAGE_SIZE = 20;
const INVOICE_TYPES = ["BOOKING_DEPOSIT", "BOOKING_FULL"] as const;

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const where: Prisma.PaymentWhereInput = {
    type: { in: [...INVOICE_TYPES] },
    ...(q
      ? {
          OR: [
            { user: { email: { contains: q, mode: "insensitive" } } },
            { user: { profile: { firstName: { contains: q, mode: "insensitive" } } } },
            { user: { profile: { lastName: { contains: q, mode: "insensitive" } } } },
            { business: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [payments, totalCount, totalAgg, paidAgg] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        user: { include: { profile: true } },
        business: true,
        booking: { include: { service: { include: { category: true } } } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.payment.count({ where }),
    prisma.payment.aggregate({ where: { type: { in: [...INVOICE_TYPES] } }, _sum: { amountPence: true } }),
    prisma.payment.aggregate({ where: { type: { in: [...INVOICE_TYPES] }, status: "SUCCEEDED" }, _sum: { amountPence: true } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const totalInvoicedPence = totalAgg._sum.amountPence ?? 0;
  const paidPence = paidAgg._sum.amountPence ?? 0;
  const outstandingPence = totalInvoicedPence - paidPence;

  return (
    <div>
      <h1 className="text-2xl font-bold">Invoices</h1>
      <p className="mt-1 text-sm text-muted-foreground">Booking payments between customers and providers.</p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard icon={<Receipt size={20} />} accent="brand" label="Total invoiced (all providers)" value={formatPence(totalInvoicedPence)} />
        <StatCard icon={<CheckCircle2 size={20} />} accent="emerald" label="Paid" value={formatPence(paidPence)} />
        <StatCard icon={<Clock size={20} />} accent="amber" label="Outstanding" value={formatPence(outstandingPence)} />
      </div>

      <ListToolbar basePath="/finance/invoices" q={q} searchPlaceholder="Search by customer or provider…" />

      <div className="mt-4 overflow-x-auto rounded-none border border-border">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Job ID</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {payments.map((p) => {
              const customerName = p.user.profile ? `${p.user.profile.firstName} ${p.user.profile.lastName}` : p.user.email;
              return (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="whitespace-nowrap px-4 py-3 font-medium">{invoiceNumber(p.id)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{p.bookingId ? p.bookingId.slice(0, 8) : "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3">{customerName}</td>
                  <td className="whitespace-nowrap px-4 py-3">{p.business?.name ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{p.booking?.service?.category.name ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium">{formatPence(p.amountPence)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{p.type === "BOOKING_DEPOSIT" ? "Deposit" : "Full payment"}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <Badge variant={p.status === "SUCCEEDED" ? "success" : p.status === "FAILED" ? "destructive" : p.status === "PENDING" ? "warning" : "outline"}>
                      {p.status.replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {p.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/finance/invoices/${p.id}`}
                        aria-label="View invoice"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Eye size={15} />
                      </Link>
                      <Link
                        href={`/finance/invoices/${p.id}?autoprint=1`}
                        aria-label="Download invoice"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Download size={15} />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            {payments.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-muted-foreground">No invoices found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <Pagination page={page} totalPages={totalPages} totalCount={totalCount} basePath="/finance/invoices" searchParams={{ q }} />
      </div>
    </div>
  );
}
