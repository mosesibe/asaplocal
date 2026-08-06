import { Pagination } from "@/components/pagination";
import { JobCard } from "./job-card";
import type { DispatchJob } from "./lib";

export function JobList({
  jobs,
  page,
  totalPages,
  totalCount,
  isAdmin,
  businesses,
  searchParams,
}: {
  jobs: DispatchJob[];
  page: number;
  totalPages: number;
  totalCount: number;
  isAdmin: boolean;
  businesses: { id: string; name: string; city: string }[];
  searchParams: Record<string, string | undefined>;
}) {
  return (
    <div className="mt-4">
      <div className="space-y-3">
        {jobs.map((j) => (
          <JobCard key={j.id} job={j} isAdmin={isAdmin} businesses={businesses} />
        ))}
        {jobs.length === 0 && <p className="text-sm text-muted-foreground">No jobs here.</p>}
      </div>
      <div className="mt-4">
        <Pagination page={page} totalPages={totalPages} totalCount={totalCount} basePath="/dispatch" searchParams={searchParams} />
      </div>
    </div>
  );
}
