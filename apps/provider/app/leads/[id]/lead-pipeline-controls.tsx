"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, Textarea } from "@asaplocal/ui";

const STAGES = ["CONTACTED", "QUOTED", "WON", "LOST"] as const;

export function LeadPipelineControls({ leadId, leadAccessId, currentStatus }: { leadId: string; leadAccessId: string; currentStatus: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [lostSheetOpen, setLostSheetOpen] = useState(false);
  const [lostReason, setLostReason] = useState("");

  async function updateStatus(status: string, reason?: string) {
    setLoading(status);
    await fetch(`/api/leads/${leadId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadAccessId, status, lostReason: reason }),
    });
    setLoading(null);
    router.refresh();
  }

  function setStatus(status: string) {
    if (status === "LOST") {
      setLostSheetOpen(true);
      return;
    }
    updateStatus(status);
  }

  async function confirmLost() {
    await updateStatus("LOST", lostReason || undefined);
    setLostSheetOpen(false);
    setLostReason("");
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {STAGES.map((s) => (
          <Button key={s} size="sm" variant={currentStatus === s ? "default" : "outline"} disabled={loading !== null} onClick={() => setStatus(s)}>
            {loading === s ? "Updating…" : s}
          </Button>
        ))}
      </div>

      <Sheet open={lostSheetOpen} onOpenChange={setLostSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Why was this lead lost?</SheetTitle>
          </SheetHeader>
          <Textarea
            value={lostReason}
            onChange={(e) => setLostReason(e.target.value)}
            rows={3}
            placeholder="Optional — helps us improve lead quality"
          />
          <SheetFooter>
            <Button onClick={confirmLost} disabled={loading !== null}>
              {loading === "LOST" ? "Updating…" : "Confirm"}
            </Button>
            <Button variant="outline" onClick={() => setLostSheetOpen(false)}>
              Cancel
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
