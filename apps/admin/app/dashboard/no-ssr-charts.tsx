"use client";

// recharts assigns each chart instance an incrementing internal id (used for
// gradient/clipPath ids); with several charts on one page that counter can
// differ between the server render and the client's first render, which
// React flags as a hydration mismatch. Rendering client-only sidesteps it.
// `ssr: false` only works inside a Client Component boundary, hence this file.
import dynamic from "next/dynamic";

export const DonutStat = dynamic(() => import("@/components/donut-stat").then((m) => m.DonutStat), { ssr: false });
export const RevenueChart = dynamic(() => import("./revenue-chart").then((m) => m.RevenueChart), { ssr: false });
