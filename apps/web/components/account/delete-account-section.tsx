"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, Textarea } from "@asaplocal/ui";
import { SectionCard, SectionRow } from "./section-row";

export function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit() {
    setLoading(true);
    const res = await fetch("/api/account/deletion-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() || undefined }),
    });
    setLoading(false);
    if (res.ok) setSubmitted(true);
  }

  return (
    <SectionCard title="Danger zone">
      <SectionRow
        icon={Trash2}
        label="Delete my account"
        description="Submit a request for our team to close your account"
        onClick={() => setOpen(true)}
      />
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSubmitted(false); }}>
        <DialogContent>
          {submitted ? (
            <>
              <DialogHeader>
                <DialogTitle>Request received</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                We've received your account deletion request and will action it shortly. You can keep using your account until then.
              </p>
              <div className="mt-5 flex justify-end">
                <DialogClose asChild>
                  <Button size="sm" variant="outline">Close</Button>
                </DialogClose>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Delete your account?</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                This sends a request to our team to close your account. It isn't instant — we review each request before it's actioned.
              </p>
              <Textarea
                className="mt-4"
                placeholder="Tell us why you're leaving (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
              />
              <div className="mt-5 flex justify-end gap-2">
                <DialogClose asChild>
                  <Button size="sm" variant="outline">Cancel</Button>
                </DialogClose>
                <Button size="sm" variant="destructive" onClick={onSubmit} disabled={loading}>
                  {loading ? "Submitting…" : "Submit request"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}
