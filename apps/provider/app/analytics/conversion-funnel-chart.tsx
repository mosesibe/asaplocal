"use client";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

export function ConversionFunnelChart({ byStatus }: { byStatus: Record<string, number> }) {
  const data = Object.entries(byStatus).map(([stage, count]) => ({ stage, count }));
  return (
    <div className="h-72 w-full rounded-2xl border border-border p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ bottom: 16 }}>
          <XAxis dataKey="stage" fontSize={11} angle={-30} textAnchor="end" interval={0} height={40} />
          <YAxis allowDecimals={false} fontSize={11} width={28} />
          <Tooltip />
          <Bar dataKey="count" fill="#1fa96b" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
