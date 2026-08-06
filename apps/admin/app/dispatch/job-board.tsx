import { JobCard } from "./job-card";
import type { DispatchJob } from "./lib";

export function JobBoard({
  columns,
  isAdmin,
  businesses,
}: {
  columns: { id: string; label: string; jobs: DispatchJob[]; total: number }[];
  isAdmin: boolean;
  businesses: { id: string; name: string; city: string }[];
}) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-4">
      {columns.map((col) => (
        <div key={col.id} className="min-w-0">
          <div className="flex items-center justify-between rounded-t-lg border border-b-0 border-border bg-muted/40 px-3 py-2.5">
            <h3 className="text-sm font-semibold">{col.label}</h3>
            <span className="text-xs text-muted-foreground">{col.total}</span>
          </div>
          <div className="max-h-[70vh] space-y-2 overflow-y-auto rounded-b-lg border border-border p-2">
            {col.jobs.map((j) => (
              <JobCard key={j.id} job={j} isAdmin={isAdmin} businesses={businesses} />
            ))}
            {col.jobs.length === 0 && <p className="p-2 text-xs text-muted-foreground">Nothing here.</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
