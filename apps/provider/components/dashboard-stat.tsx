import { Card } from "@asaplocal/ui";
import type { ReactNode } from "react";

export function DashboardStat({ label, value, sub }: { label: string; value: string; sub?: ReactNode }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-xs">{sub}</p>}
    </Card>
  );
}
