"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@asaplocal/ui";

export function ServiceRowActions({
  category,
}: {
  category: { id: string; name: string; isActive: boolean; isFeatured: boolean; isRegulatedTrade: boolean };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(category.name);
  const [isActive, setIsActive] = useState(category.isActive);
  const [isFeatured, setIsFeatured] = useState(category.isFeatured);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveEdit() {
    setLoading(true);
    await fetch(`/api/categories/${category.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, isActive, isFeatured }),
    });
    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  async function onDelete() {
    if (!confirm(`Delete "${category.name}"? This can't be undone.`)) return;
    setError(null);
    const res = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message ?? "Couldn't delete");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label="Edit"
        onClick={() => setOpen(true)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Pencil size={15} />
      </button>
      <button
        type="button"
        aria-label="Delete"
        onClick={onDelete}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
      >
        <Trash2 size={15} />
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit service</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border bg-background p-2.5 text-sm"
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
              Featured
            </label>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <DialogClose asChild>
              <Button size="sm" variant="outline">Cancel</Button>
            </DialogClose>
            <Button size="sm" onClick={saveEdit} disabled={loading || name.trim().length < 2}>
              {loading ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
