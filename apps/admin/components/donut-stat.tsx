"use client";

import { PieChart, Pie, Cell } from "recharts";
import { Card } from "@asaplocal/ui";

export function DonutStat({
  title,
  subtitle,
  centerValue,
  centerLabel,
  segments,
}: {
  title: string;
  subtitle?: string;
  centerValue: string;
  centerLabel: string;
  segments: { label: string; value: number; color: string }[];
}) {
  return (
    <Card className="flex h-full flex-col p-5">
      <h3 className="text-sm font-semibold">{title}</h3>
      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      <div className="relative mx-auto mt-4 h-36 w-36">
        <PieChart width={144} height={144}>
          <Pie
            data={segments}
            dataKey="value"
            nameKey="label"
            innerRadius={52}
            outerRadius={68}
            startAngle={90}
            endAngle={-270}
            stroke="none"
            isAnimationActive={false}
          >
            {segments.map((s) => (
              <Cell key={s.label} fill={s.color} />
            ))}
          </Pie>
        </PieChart>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold">{centerValue}</span>
          <span className="text-[10px] text-muted-foreground">{centerLabel}</span>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {segments.map((s) => (
          <div key={s.label}>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
            </label>
            <p className="mt-0.5 text-base font-bold">{s.value.toLocaleString()}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
