"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, Loader2 } from "lucide-react";
import { Badge, Button, Input, Sheet, SheetContent, SheetHeader, SheetTitle } from "@asaplocal/ui";
import { SectionRow } from "./section-row";

export function VerifyPhoneRow({ phone, verified }: { phone: string | null; verified: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phoneInput, setPhoneInput] = useState(phone ?? "");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setOpen(false);
    setStep("phone");
    setCode("");
    router.refresh();
  }

  return (
    <>
      <SectionRow
        icon={Phone}
        label="Verify phone"
        description={phone ?? "No phone number on file"}
        onClick={() => setOpen(true)}
        right={<Badge variant={verified ? "success" : "warning"}>{verified ? "Verified" : "Not verified"}</Badge>}
      />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{step === "phone" ? "Verify your phone" : "Enter the code"}</SheetTitle>
          </SheetHeader>
          {step === "phone" ? (
            <div className="space-y-3">
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
    </>
  );
}
