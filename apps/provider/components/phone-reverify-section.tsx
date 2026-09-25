"use client";

// TEMPORARY — added 2026-09-25 to test the "ASAPLocal" alphanumeric sender ID
// end to end without going through a fresh signup. Sends a real verification
// SMS on demand so the sender shown on the handset can be checked.
//
// To remove: delete this file and the <PhoneReverifySection /> usage in
// app/account/page.tsx. Nothing else references it, and the two API routes it
// calls are part of the normal signup flow, so they stay.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquare } from "lucide-react";
import { Button, Card, Input } from "@asaplocal/ui";

export function PhoneReverifySection({ phone }: { phone: string | null }) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSend() {
    setSending(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/auth/phone/resend-code", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Covers the 5-per-hour rate limit and "no phone number on file".
        setError(data.message ?? "Something went wrong sending the code");
        return;
      }
      setSent(true);
      setNotice(`Code sent to ${data.phone ?? phone}. Check which sender it came from.`);
    } finally {
      setSending(false);
    }
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setVerifying(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/phone/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "Something went wrong");
        return;
      }
      setCode("");
      setSent(false);
      setNotice("Phone verified.");
      router.refresh();
    } finally {
      setVerifying(false);
    }
  }

  return (
    <Card className="mt-6 max-w-lg p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-medium">Re-verify my phone</p>
          <p className="text-xs text-muted-foreground">
            {phone ? `Sends a new code to ${phone}` : "No phone number on file"}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onSend} disabled={sending || !phone}>
          {sending ? <Loader2 size={14} className="animate-spin" /> : <MessageSquare size={14} />}
          {sending ? "Sending…" : "Send code"}
        </Button>
      </div>

      {sent && (
        <form onSubmit={onVerify} className="mt-4 flex gap-2">
          <Input
            required
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
          <Button type="submit" size="sm" disabled={verifying || code.length !== 6}>
            {verifying ? <Loader2 size={16} className="animate-spin" /> : "Verify"}
          </Button>
        </form>
      )}

      {notice && <p className="mt-3 text-sm text-muted-foreground">{notice}</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </Card>
  );
}
