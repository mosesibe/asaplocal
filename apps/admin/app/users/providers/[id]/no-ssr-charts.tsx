"use client";

// Client-only for the same reason as app/dashboard/no-ssr-charts.tsx: several
// recharts instances on one page can hydrate with mismatched internal ids.
import dynamic from "next/dynamic";

export const DonutStat = dynamic(() => import("@/components/donut-stat").then((m) => m.DonutStat), { ssr: false });
export const EarningsChart = dynamic(() => import("./charts").then((m) => m.EarningsChart), { ssr: false });
export const ActivityChart = dynamic(() => import("./charts").then((m) => m.ActivityChart), { ssr: false });
export const LoginChart = dynamic(() => import("./charts").then((m) => m.LoginChart), { ssr: false });
