"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button, Input, Sheet, SheetContent, SheetHeader, SheetTitle } from "@asaplocal/ui";

/**
 * Send-code → enter-code flow, shared by the account page's phone row and the
 * job-posting forms (which require a verified number before a job goes live).
 */
export function PhoneVerificationSheet({
  open,
  onOpenChange,
  initialPhone,
  intro,
  onVerified,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPhone: string | null;
  /** Optional line explaining why we're asking, shown above the phone field. */
  intro?: string;
  onVerified: () => void;
}) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phoneInput, setPhoneInput] = useState(initialPhone ?? "");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep("phone");
    setPhoneInput(initialPhone ?? "");
    setCode("");
    setError(null);
  }, [open, initialPhone]);

  async function sendCode() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/account/phone/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phoneInput }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message ?? "Couldn't send a code");
      return;
    }
    setStep("code");
  }

  async function verifyCode() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/account/phone/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message ?? "Incorrect code");
      return;
    }
    onOpenChange(false);
    onVerified();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{step === "phone" ? "Verify your phone" : "Enter the code"}</SheetTitle>
        </SheetHeader>
        {step === "phone" ? (
          <div className="space-y-3">
            {intro && <p className="text-sm text-muted-foreground">{intro}</p>}
            <Input type="tel" placeholder="Phone number" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button className="w-full" onClick={sendCode} disabled={loading || !phoneInput}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : "Send code"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">We sent a 6-digit code to {phoneInput}.</p>
            <Input inputMode="numeric" maxLength={6} placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button className="w-full" onClick={verifyCode} disabled={loading || code.length !== 6}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : "Verify"}
            </Button>
            <button type="button" className="text-xs text-muted-foreground underline" onClick={() => setStep("phone")}>
              Use a different number
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
