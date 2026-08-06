"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@asaplocal/ui";

export function DispatchJobRow({
  jobId,
  isAdmin,
  businesses,
  currentStatus,
}: {
  jobId: string;
  isAdmin: boolean;
  businesses: { id: string; name: string; city: string }[];
  currentStatus: string;
}) {
  const router = useRouter();
  const [assignTo, setAssignTo] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  async function assign() {
    if (!assignTo) return;
    setLoading("assign");
    const res = await fetch(`/api/dispatcher/jobs/${jobId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId: assignTo, note }),
    });
    setLoading(null);
    const data = await res.json();
    setSent(isAdmin ? "Assigned." : `Submitted for admin approval (request ${data.id?.slice(0, 8) ?? ""}).`);
    router.refresh();
  }

  async function cancelJob() {
    setLoading("delete");
    const res = await fetch(`/api/dispatcher/jobs/${jobId}/delete`, { method: "POST" });
    setLoading(null);
    const data = await res.json();
    setSent(isAdmin ? "Job cancelled." : `Cancellation submitted for admin approval (request ${data.id?.slice(0, 8) ?? ""}).`);
    router.refresh();
  }

  if (currentStatus === "CANCELLED" || currentStatus === "COMPLETED") return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
      <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} className="rounded-lg border border-border bg-background p-2 text-xs">
        <option value="">Assign to provider…</option>
        {businesses.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.city})</option>)}
      </select>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="w-40 rounded-lg border border-border bg-background p-2 text-xs" />
      <Button size="sm" onClick={assign} disabled={!assignTo || loading !== null}>
        {loading === "assign" ? "Sending…" : isAdmin ? "Assign now" : "Propose assignment"}
      </Button>
      <Button size="sm" variant="destructive" onClick={cancelJob} disabled={loading !== null}>
        {loading === "delete" ? "Sending…" : isAdmin ? "Cancel job" : "Propose cancellation"}
      </Button>
      {sent && <p className="w-full text-xs text-emerald-700">{sent}</p>}
    </div>
  );
}
