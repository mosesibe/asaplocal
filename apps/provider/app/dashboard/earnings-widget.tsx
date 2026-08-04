"use client";
import { Card, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, formatPence } from "@asaplocal/ui";
import { ChevronRight } from "lucide-react";

interface EarningsSummary {
  weekTotalPence: number;
  allTimePence: number;
  dailyBreakdown: { date: string; amountPence: number }[];
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function EarningsWidget({ earnings }: { earnings: EarningsSummary }) {
  const maxDay = Math.max(1, ...earnings.dailyBreakdown.map((d) => d.amountPence));

  return (
    <Dialog>
      <DialogTrigger className="block w-full text-left">
        <Card className="flex items-center justify-between p-5 transition-shadow hover:shadow-card">
          <div>
            <p className="text-xs text-muted-foreground">Earnings this week</p>
            <p className="mt-1 text-3xl font-bold text-brand-600 dark:text-brand-300">{formatPence(earnings.weekTotalPence)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{formatPence(earnings.allTimePence)} all time</p>
          </div>
          <ChevronRight className="text-muted-foreground" />
        </Card>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>This week's earnings</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {earnings.dailyBreakdown.map((d, i) => (
            <div key={d.date} className="flex items-center gap-3">
              <span className="w-8 text-xs text-muted-foreground">{DAY_LABELS[i]}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-brand-500"
                  style={{ width: `${Math.max(4, (d.amountPence / maxDay) * 100)}%` }}
                />
              </div>
              <span className="w-16 text-right text-xs font-medium">{formatPence(d.amountPence)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm">
          <span className="text-muted-foreground">Week total</span>
          <span className="font-semibold">{formatPence(earnings.weekTotalPence)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">All time</span>
          <span className="font-semibold">{formatPence(earnings.allTimePence)}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
