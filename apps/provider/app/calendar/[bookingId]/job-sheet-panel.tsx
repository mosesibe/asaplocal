"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Textarea } from "@asaplocal/ui";

interface Props {
  bookingId: string;
  status: string;
  entryCount: number;
}

export function JobSheetPanel({ bookingId, status, entryCount }: Props) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState<"start" | "add" | "finish" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function post(path: string, body?: unknown) {
    const res = await fetch(`/api/bookings/${bookingId}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "Something went wrong");
  }

  async function onStart() {
    setLoading("start");
    setError(null);
    try {
      await post("start");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  async function onAddEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    setLoading("add");
    setError(null);
    try {
      await post("job-sheet", { description: description.trim() });
      setDescription("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  async function onFinish() {
    setLoading("finish");
    setError(null);
    try {
      await post("finish");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  if (status === "CONFIRMED") {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">Ready to head out? Start the job to begin logging your work.</p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <Button className="mt-4" onClick={onStart} disabled={loading !== null}>
          {loading === "start" ? "Starting…" : "Start job"}
        </Button>
      </Card>
    );
  }

  if (status === "IN_PROGRESS") {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">Log what you're doing as you go — the customer will see this list.</p>
        <form onSubmit={onAddEntry} className="mt-3 flex gap-2">
          <Textarea
            placeholder="e.g. Replaced the fuse box wiring"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-0 flex-1"
            rows={2}
          />
          <Button type="submit" disabled={loading !== null || !description.trim()}>
            {loading === "add" ? "Adding…" : "Add"}
          </Button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-5 border-t border-border pt-4">
          <Button onClick={onFinish} disabled={loading !== null || entryCount === 0}>
            {loading === "finish" ? "Finishing…" : "Finish job"}
          </Button>
          {entryCount === 0 && <p className="mt-2 text-xs text-muted-foreground">Add at least one action before you can finish.</p>}
        </div>
      </Card>
    );
  }

  if (status === "AWAITING_APPROVAL") {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">Job marked as done — waiting for the customer to confirm completion.</p>
      </Card>
    );
  }

  if (status === "COMPLETED") {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">The customer has confirmed this job as complete.</p>
      </Card>
    );
  }

  return null;
}
