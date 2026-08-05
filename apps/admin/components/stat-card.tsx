"use client";

import * as React from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { Card, cn } from "@asaplocal/ui";

const ACCENTS = {
  brand: { badge: "bg-brand-500 text-white", hex: "#c15f2a" },
  violet: { badge: "bg-violet-500 text-white", hex: "#8b5cf6" },
  emerald: { badge: "bg-emerald-500 text-white", hex: "#10b981" },
  sky: { badge: "bg-sky-500 text-white", hex: "#0ea5e9" },
  amber: { badge: "bg-amber-500 text-white", hex: "#f59e0b" },
  rose: { badge: "bg-rose-500 text-white", hex: "#f43f5e" },
} as const;

export function StatCard({
  icon,
  label,
  value,
  delta,
  accent = "brand",
  sparkline,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta?: { direction: "up" | "down"; label: string };
  accent?: keyof typeof ACCENTS;
  sparkline?: number[];
}) {
  const gradientId = React.useId();
  const { badge, hex } = ACCENTS[accent];
  const points = sparkline?.map((value) => ({ value })) ?? [];

  return (
    <Card className="relative overflow-hidden rounded-none border-border p-5 shadow-none">
      <div className="relative z-10 flex items-start gap-3">
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full", badge)}>{icon}</div>
        <div className="min-w-0 pt-0.5">
          <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
            <p className="text-[26px] font-bold leading-none tracking-tight">{value}</p>
            {delta && (
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-semibold text-white",
                  delta.direction === "up" ? "bg-emerald-600" : "bg-red-600"
                )}
              >
                {delta.direction === "up" ? "+" : ""}
                {delta.label}
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
      {points.length > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 opacity-25">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={hex} stopOpacity={0.7} />
                  <stop offset="100%" stopColor={hex} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={hex}
                strokeWidth={1.5}
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
