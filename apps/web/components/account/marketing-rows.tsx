"use client";

import { useState } from "react";
import { Mail, MessageSquare } from "lucide-react";
import { SectionRow, Switch } from "./section-row";

/**
 * Marketing toggles. Unlike the language/dark-mode rows beside them (which
 * only touch localStorage), these persist server-side — consent has to be
 * recorded, and withdrawal has to be as easy as giving it.
 */
export function MarketingRows({ initialEmail, initialSms }: { initialEmail: boolean; initialSms: boolean }) {
  const [email, setEmail] = useState(initialEmail);
  const [sms, setSms] = useState(initialSms);
  const [error, setError] = useState<string | null>(null);

  async function save(next: { email?: boolean; sms?: boolean }) {
    setError(null);
    // Optimistic — a failed toggle rolls back below so the UI can't claim a
    // preference that wasn't saved.
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
      if (next.email !== undefined) setEmail(!next.email);
      if (next.sms !== undefined) setSms(!next.sms);
      setError("Couldn't save that — please try again.");
    }
  }

  return (
    <>
      <SectionRow
        icon={Mail}
        label="Marketing emails"
        description="Tips and offers. Booking and payment emails are unaffected."
        right={<Switch checked={email} onChange={() => save({ email: !email })} label="Toggle marketing emails" />}
      />
      <SectionRow
        icon={MessageSquare}
        label="Marketing texts"
        description="Occasional SMS offers"
        right={<Switch checked={sms} onChange={() => save({ sms: !sms })} label="Toggle marketing texts" />}
      />
      {error && <p className="px-4 pb-2 text-xs text-red-600">{error}</p>}
    </>
  );
}
