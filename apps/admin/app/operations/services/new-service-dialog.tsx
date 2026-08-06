"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@asaplocal/ui";

export function NewServiceDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isRegulatedTrade, setIsRegulatedTrade] = useState(false);
  const [suggestedQualifications, setSuggestedQualifications] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        isRegulatedTrade,
        suggestedQualifications: suggestedQualifications.split(",").map((s) => s.trim()).filter(Boolean),
      }),
    });
    setLoading(false);
    setName("");
    setIsRegulatedTrade(false);
    setSuggestedQualifications("");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus size={15} /> Add new
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New service</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Service name"
              className="w-full rounded-lg border border-border bg-background p-2.5 text-sm"
            />
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={isRegulatedTrade} onChange={(e) => setIsRegulatedTrade(e.target.checked)} />
              Regulated trade (prompts providers for qualifications)
            </label>
            {isRegulatedTrade && (
              <input
                value={suggestedQualifications}
                onChange={(e) => setSuggestedQualifications(e.target.value)}
                placeholder="Suggested qualifications, comma-separated"
                className="w-full rounded-lg border border-border bg-background p-2.5 text-sm"
              />
            )}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <DialogClose asChild>
              <Button size="sm" variant="outline">Cancel</Button>
            </DialogClose>
            <Button size="sm" onClick={submit} disabled={loading || name.trim().length < 2}>
              {loading ? "Adding…" : "Add"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
