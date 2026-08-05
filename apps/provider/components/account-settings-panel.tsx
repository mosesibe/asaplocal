"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@asaplocal/ui";

interface AccountSettingsPanelProps {
  firstName: string;
  lastName: string;
  email: string;
}

export function AccountSettingsPanel({ firstName, lastName, email }: AccountSettingsPanelProps) {
  const router = useRouter();
  const [form, setForm] = useState({ firstName, lastName });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setLoading(true);
    setSaved(false);
    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">First name</label>
        <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="mt-1" />
      </div>
      <div>
        <label className="text-sm font-medium">Last name</label>
        <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="mt-1" />
      </div>
      <div>
        <label className="text-sm font-medium">Email</label>
        <Input value={email} disabled className="mt-1" />
      </div>
      {saved && <p className="text-sm text-emerald-700">Saved.</p>}
      <Button onClick={save} disabled={loading}>
        {loading ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}
