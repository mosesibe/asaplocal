"use client";

import { useEffect, useState } from "react";
import { Gift, Check, Copy } from "lucide-react";
import { Button, formatPence } from "@asaplocal/ui";

interface ReferralSummary {
  code: string;
  link: string;
  creditBalancePence: number;
  referralCount: number;
  completedCount: number;
}

export function ReferralCard() {
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/account/referral")
      .then((res) => (res.ok ? res.json() : null))
      .then(setSummary)
      .catch(() => setSummary(null));
  }, []);

  async function copyLink() {
    if (!summary) return;
    await navigator.clipboard.writeText(summary.link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      <Gift size={18} className="mt-0.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Refer a friend</p>
        <p className="text-xs text-muted-foreground">
          {summary
            ? `Give £${(summary.creditBalancePence / 100).toFixed(0)} worth of credit each — you've earned ${formatPence(summary.creditBalancePence)} from ${summary.completedCount} referral${summary.completedCount === 1 ? "" : "s"}.`
            : "Share your link — you and your friend both get credit when they book."}
        </p>
        {summary && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
            <code className="min-w-0 flex-1 truncate text-xs">{summary.link}</code>
            <Button type="button" size="sm" variant="outline" onClick={copyLink} className="shrink-0">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
