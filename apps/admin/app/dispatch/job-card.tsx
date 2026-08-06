import { Badge, Card, formatPence } from "@asaplocal/ui";
import { Clock, CalendarClock, MapPin, PoundSterling } from "lucide-react";
import { DispatchJobRow } from "./dispatch-job-row";
import { deriveJobView, type DispatchJob } from "./lib";

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "outline"> = {
  OPEN: "outline",
  MATCHING: "warning",
  QUOTED: "warning",
  ASSIGNED: "warning",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  CANCELLED: "destructive",
  EXPIRED: "destructive",
};

export function JobCard({
  job,
  isAdmin,
  businesses,
}: {
  job: DispatchJob;
  isAdmin: boolean;
  businesses: { id: string; name: string; city: string }[];
}) {
  const { assignedBusiness, expectedCostPence, distanceMiles, scheduledDate, isPaid } = deriveJobView(job);
  const customerName = job.customer.profile ? `${job.customer.profile.firstName} ${job.customer.profile.lastName}` : job.customer.email;

  return (
    <Card className="rounded-none border-border p-4 shadow-none">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">{job.title}</p>
        <Badge variant="outline">{job.category.name}</Badge>
        <Badge variant={STATUS_VARIANT[job.status] ?? "outline"}>{job.status.replace(/_/g, " ")}</Badge>
        {isPaid && <Badge variant="success">Paid</Badge>}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {customerName}
        {job.customer.phone && ` · ${job.customer.phone}`} · {job.city}
        {job.postcode ? ` (${job.postcode})` : ""}
      </p>
      {assignedBusiness && <p className="mt-0.5 text-xs text-muted-foreground">Assigned: {assignedBusiness.name}</p>}

      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs sm:grid-cols-4">
        <div>
          <p className="flex items-center gap-1 text-muted-foreground"><Clock size={12} /> Requested</p>
          <p className="mt-0.5 font-medium">{job.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
        </div>
        <div>
          <p className="flex items-center gap-1 text-muted-foreground"><CalendarClock size={12} /> Scheduled</p>
          <p className="mt-0.5 font-medium">
            {scheduledDate ? scheduledDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "Flexible"}
          </p>
        </div>
        <div>
          <p className="flex items-center gap-1 text-muted-foreground"><MapPin size={12} /> Distance</p>
          <p className="mt-0.5 font-medium">{distanceMiles !== null ? `${distanceMiles.toFixed(1)} mi` : "—"}</p>
        </div>
        <div>
          <p className="flex items-center gap-1 text-muted-foreground"><PoundSterling size={12} /> Expected cost</p>
          <p className="mt-0.5 font-medium">{expectedCostPence ? formatPence(expectedCostPence) : "—"}</p>
        </div>
      </div>

      <DispatchJobRow jobId={job.id} isAdmin={isAdmin} businesses={businesses} currentStatus={job.status} />
    </Card>
  );
}
