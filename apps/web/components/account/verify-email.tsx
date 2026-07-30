"use client";

import { useState } from "react";
import { Mail, Loader2 } from "lucide-react";
import { Badge, Button } from "@asaplocal/ui";
import { SectionRow } from "./section-row";

export function VerifyEmailRow({ email, verified }: { email: string; verified: boolean }) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/account/email/resend", { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message ?? "Couldn't send the email");
      return;
    }
    setSent(true);
  }

  return (
    <SectionRow
      icon={Mail}
      label="Email address"
      description={sent ? `New link sent to ${email}` : error ?? email}
      right={
        verified ? (
          <Badge variant="success">Verified</Badge>
        ) : (
          <Button size="sm" variant="outline" onClick={resend} disabled={loading || sent}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : sent ? "Sent" : "Verify email"}
          </Button>
        )
      }
    />
  );
}
