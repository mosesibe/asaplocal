"use client";

import { useState } from "react";
import { Switch } from "@asaplocal/ui";

/** Persisted marketing toggles — withdrawal must be as easy as consenting. */
export function MarketingPreferences({ initialEmail, initialSms }: { initialEmail: boolean; initialSms: boolean }) {
  const [email, setEmail] = useState(initialEmail);
  const [sms, setSms] = useState(initialSms);
  const [error, setError] = useState<string | null>(null);

  async function save(next: { email?: boolean; sms?: boolean }) {
    setError(null);
    if (next.email !== undefined) setEmail(next.email);
    if (next.sms !== undefined) setSms(next.sms);
    try {
      const res = await fetch("/api/account/marketing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error();
    } catch {
      // roll back so the UI never shows a preference that wasn't saved
      if (next.email !== undefined) setEmail(!next.email);
      if (next.sms !== undefined) setSms(!next.sms);
      setError("Couldn't save that — please try again.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Marketing emails</p>
          <p className="text-xs text-muted-foreground">Product news, lead tips and offers.</p>
        </div>
        <Switch checked={email} onChange={() => save({ email: !email })} label="Toggle marketing emails" />
      </div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Marketing texts</p>
          <p className="text-xs text-muted-foreground">Occasional SMS offers.</p>
        </div>
        <Switch checked={sms} onChange={() => save({ sms: !sms })} label="Toggle marketing texts" />
      </div>
      <p className="text-xs text-muted-foreground">
        These only affect promotional messages. Job, payment and payout emails always send.
      </p>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
