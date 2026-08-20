"use client";

import { useState } from "react";
import Link from "next/link";
import { Receipt, ChevronDown } from "lucide-react";
import { cn, formatPence } from "@asaplocal/ui";

export interface InvoiceRow {
  id: string;
  bookingId: string | null;
  businessName: string | null;
  type: string;
  amountPence: number;
  createdAt: string;
  invoiceRef: string;
}

const TYPE_LABEL: Record<string, string> = {
  BOOKING_DEPOSIT: "Deposit",
  BOOKING_BALANCE: "Balance",
  BOOKING_FULL: "Full payment",
};

/**
 * Payments live *inside* the "Invoices and receipts" row rather than as a
 * separate list below the card — previously they floated unlabelled under the
 * Account section with no visible connection to the row describing them.
 */
export function InvoicesSection({ invoices }: { invoices: InvoiceRow[] }) {
  const [open, setOpen] = useState(false);
  const hasAny = invoices.length > 0;

  return (
    <div>
      <button
        type="button"
        onClick={() => hasAny && setOpen((v) => !v)}
        aria-expanded={hasAny ? open : undefined}
        disabled={!hasAny}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3.5 text-left",
          hasAny && "transition-colors hover:bg-muted"
        )}
      >
        <Receipt size={18} className="shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Invoices and receipts</p>
          <p className="truncate text-xs text-muted-foreground">
            {hasAny ? `${invoices.length} payment${invoices.length === 1 ? "" : "s"}` : "No payments yet"}
          </p>
        </div>
        {hasAny && (
          <ChevronDown size={16} className={cn("shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        )}
      </button>

      {open && hasAny && (
        <div className="divide-y divide-border border-t border-border bg-muted/20">
          {invoices.map((p) => (
            <Link
              key={p.id}
              href={p.bookingId ? `/bookings/${p.bookingId}` : "#"}
              className="flex items-center justify-between gap-3 px-4 py-3 pl-11 text-sm hover:bg-muted"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{p.businessName ?? p.type.replace(/_/g, " ")}</p>
                <p className="text-xs text-muted-foreground">
                  {TYPE_LABEL[p.type] ?? p.type.replace(/_/g, " ")} · {p.invoiceRef} ·{" "}
                  {new Date(p.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <span className="shrink-0 font-medium">{formatPence(p.amountPence)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
