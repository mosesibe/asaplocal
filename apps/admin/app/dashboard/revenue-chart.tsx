"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export function RevenueChart({ data }: { data: { month: string; revenue: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <XAxis dataKey="month" fontSize={12} />
        <YAxis fontSize={12} width={44} />
        <Tooltip formatter={(v: number) => `£${v.toFixed(2)}`} />
        <Line type="monotone" dataKey="revenue" stroke="#c15f2a" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
