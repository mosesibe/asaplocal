import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { ACTIVE_SUB_STATUSES, type DispatchTab } from "./lib";

export function DispatchFilters({
  tab,
  view,
  q,
  region,
  subStatus,
  regions,
}: {
  tab: DispatchTab;
  view: string;
  q?: string;
  region?: string;
  subStatus?: string;
  regions: string[];
}) {
  return (
    <form action="/dispatch" className="mt-4 flex flex-wrap items-center gap-2">
      <input type="hidden" name="tab" value={tab} />
      {view !== "list" && <input type="hidden" name="view" value={view} />}
      <input
        name="q"
        defaultValue={q}
        placeholder="Search by phone, postcode, customer name…"
        className="h-11 min-w-[240px] flex-1 rounded-lg border border-border bg-background px-4 text-sm"
      />
      {tab === "active" && (
        <AutoSubmitSelect name="subStatus" defaultValue={subStatus ?? ""} className="h-11 w-auto">
          <option value="">All active statuses</option>
          {ACTIVE_SUB_STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </AutoSubmitSelect>
      )}
      <AutoSubmitSelect name="region" defaultValue={region ?? ""} className="h-11 w-auto">
        <option value="">All regions</option>
        {regions.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </AutoSubmitSelect>
    </form>
  );
}
