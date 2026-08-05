import { Card, cn } from "@asaplocal/ui";

export function MetricCard({
  title,
  subtitle,
  stats,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  stats?: { label: string; value: string; color: string }[];
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("flex flex-col rounded-none border-border p-5 shadow-none", className)}>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {stats && stats.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={cn("h-2 w-2 rounded-full", s.color)} />
                {s.label}
              </div>
              <p className="mt-0.5 text-lg font-bold">{s.value}</p>
            </div>
          ))}
        </div>
      )}
      <div className="mt-4 flex-1">{children}</div>
    </Card>
  );
}
