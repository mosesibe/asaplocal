"use client";

import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const AXIS = { fontSize: 11, stroke: "#9a8f85", tickLine: false, axisLine: false } as const;
const GRID = <CartesianGrid vertical={false} stroke="#e5e0da" strokeDasharray="3 3" />;
const gbp = (v: number) => `£${v.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;

export type EarningsPoint = { month: string; gross: number; net: number; paidOut: number };

export function EarningsChart({ data }: { data: EarningsPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        {GRID}
        <XAxis dataKey="month" {...AXIS} />
        <YAxis {...AXIS} width={52} tickFormatter={gbp} />
        <Tooltip formatter={(v: number) => `£${v.toFixed(2)}`} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="gross" name="Job value" fill="#e8c3a8" radius={[3, 3, 0, 0]} isAnimationActive={false} />
        <Bar dataKey="net" name="Net earnings" fill="#c15f2a" radius={[3, 3, 0, 0]} isAnimationActive={false} />
        <Line dataKey="paidOut" name="Paid out" type="monotone" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export type ActivityPoint = { month: string; leads: number; quotes: number; bookings: number; completed: number };

export function ActivityChart({ data }: { data: ActivityPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        {GRID}
        <XAxis dataKey="month" {...AXIS} />
        <YAxis {...AXIS} width={32} allowDecimals={false} />
        <Tooltip />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="leads" name="Leads acquired" fill="#0ea5e9" radius={[3, 3, 0, 0]} isAnimationActive={false} />
        <Bar dataKey="quotes" name="Quotes sent" fill="#8b5cf6" radius={[3, 3, 0, 0]} isAnimationActive={false} />
        <Bar dataKey="bookings" name="Bookings" fill="#f59e0b" radius={[3, 3, 0, 0]} isAnimationActive={false} />
        <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[3, 3, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export type LoginPoint = { day: string; web: number; mobile: number };

export function LoginChart({ data }: { data: LoginPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        {GRID}
        <XAxis dataKey="day" {...AXIS} interval="preserveStartEnd" minTickGap={24} />
        <YAxis {...AXIS} width={28} allowDecimals={false} />
        <Tooltip />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="web" name="Web" stackId="l" fill="#c15f2a" isAnimationActive={false} />
        <Bar dataKey="mobile" name="Mobile app" stackId="l" fill="#0ea5e9" radius={[2, 2, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
