import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@asaplocal/db";
import { Badge, Card, formatPence, Logo } from "@asaplocal/ui";
import { ArrowLeft } from "lucide-react";
import { invoiceNumber } from "@/lib/invoice-number";
import { AutoPrint } from "./auto-print";
import { PrintButton } from "./print-button";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      user: { include: { profile: true } },
      business: true,
      booking: { include: { service: { include: { category: true } } } },
    },
  });
  if (!payment) notFound();

  const customerName = payment.user.profile ? `${payment.user.profile.firstName} ${payment.user.profile.lastName}` : payment.user.email;

  return (
    <div className="mx-auto max-w-2xl">
      <AutoPrint />
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href="/finance/invoices" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> Back to invoices
        </Link>
        <PrintButton />
      </div>

      <Card className="rounded-none p-8 shadow-none print:border-0 print:shadow-none">
        <div className="flex items-start justify-between">
          <Logo markClassName="h-9 w-9" />
          <div className="text-right">
            <h1 className="text-xl font-bold">Invoice {invoiceNumber(payment.id)}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {payment.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </p>
            <Badge
              className="mt-2"
              variant={payment.status === "SUCCEEDED" ? "success" : payment.status === "FAILED" ? "destructive" : payment.status === "PENDING" ? "warning" : "outline"}
            >
              {payment.status.replace(/_/g, " ")}
            </Badge>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-6 border-t border-border pt-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer</p>
            <p className="mt-1 font-medium">{customerName}</p>
            <p className="text-sm text-muted-foreground">{payment.user.email}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Provider</p>
            <p className="mt-1 font-medium">{payment.business?.name ?? "—"}</p>
            {payment.business?.email && <p className="text-sm text-muted-foreground">{payment.business.email}</p>}
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5">Description</th>
                <th className="px-4 py-2.5">Job ID</th>
                <th className="px-4 py-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border">
                <td className="px-4 py-3">
                  {payment.booking?.service?.category.name ?? payment.type.replace(/_/g, " ").toLowerCase()}
                  {payment.type === "BOOKING_DEPOSIT" && <span className="text-muted-foreground"> (deposit)</span>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{payment.bookingId?.slice(0, 8) ?? "—"}</td>
                <td className="px-4 py-3 text-right font-medium">{formatPence(payment.amountPence)}</td>
              </tr>
              {payment.refundedAmountPence > 0 && (
                <tr className="border-t border-border text-red-600">
                  <td className="px-4 py-3" colSpan={2}>Refunded</td>
                  <td className="px-4 py-3 text-right font-medium">-{formatPence(payment.refundedAmountPence)}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-muted/20">
                <td className="px-4 py-3 font-semibold" colSpan={2}>Total</td>
                <td className="px-4 py-3 text-right font-bold">{formatPence(payment.amountPence - payment.refundedAmountPence)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">AsapLocal · This is a record of a payment made through the AsapLocal platform.</p>
      </Card>
    </div>
  );
}
