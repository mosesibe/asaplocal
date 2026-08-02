"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button, Card, Input } from "@asaplocal/ui";

export default function VerifyPage() {
  const router = useRouter();
  const { data: session, update, status } = useSession();
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendingPhone, setResendingPhone] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const emailVerified = session?.user?.isEmailVerified ?? false;
  const phoneVerified = session?.user?.isPhoneVerified ?? false;

  useEffect(() => {
    if (status !== "authenticated") return;
    if (emailVerified && phoneVerified) {
      router.replace("/onboarding");
      return;
    }
    // Email verification happens out-of-band (a link click, possibly in
    // another tab) — poll the session so we notice as soon as it lands.
    pollRef.current = setInterval(() => update(), 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [status, emailVerified, phoneVerified, router, update]);

  async function onVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setVerifying(true);
    setVerifyError(null);
    try {
      const res = await fetch("/api/auth/phone/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setVerifyError(data.message ?? "Something went wrong");
        return;
      }
      await update();
    } finally {
      setVerifying(false);
    }
  }

  async function onResendPhone() {
    setResendingPhone(true);
    setNotice(null);
    try {
      const res = await fetch("/api/auth/phone/resend-code", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      setNotice(res.ok ? "New code sent." : (data.message ?? "Something went wrong"));
    } finally {
      setResendingPhone(false);
    }
  }

  async function onResendEmail() {
    setResendingEmail(true);
    setNotice(null);
    try {
      const res = await fetch("/api/auth/resend-verification-email", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      setNotice(res.ok ? "Verification email sent." : (data.message ?? "Something went wrong"));
    } finally {
      setResendingEmail(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold">Verify your account</h1>
      <p className="mt-2 text-muted-foreground">Confirm your email and phone to unlock your dashboard.</p>

      <Card className="mt-6 space-y-2 p-6">
        <div className="flex items-center gap-2">
          {emailVerified ? <CheckCircle2 size={18} className="text-brand-600" /> : <span className="h-[18px] w-[18px] rounded-full border-2 border-muted-foreground" />}
          <span className="font-medium">Email {emailVerified ? "verified" : "not verified"}</span>
        </div>
        {!emailVerified && (
          <>
            <p className="text-sm text-muted-foreground">
              We sent a link to {session?.user?.email}. Click it, then come back — this page updates automatically.
            </p>
            <Button variant="outline" size="sm" onClick={onResendEmail} disabled={resendingEmail}>
              {resendingEmail ? "Sending…" : "Resend email"}
            </Button>
          </>
        )}
      </Card>

      <Card className="mt-4 space-y-3 p-6">
        <div className="flex items-center gap-2">
          {phoneVerified ? <CheckCircle2 size={18} className="text-brand-600" /> : <span className="h-[18px] w-[18px] rounded-full border-2 border-muted-foreground" />}
          <span className="font-medium">Phone {phoneVerified ? "verified" : "not verified"}</span>
        </div>
        {!phoneVerified && (
          <>
            <p className="text-sm text-muted-foreground">Enter the 6-digit code we texted you.</p>
            <form onSubmit={onVerifyCode} className="flex gap-2">
              <Input
                required
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
              <Button type="submit" disabled={verifying || code.length !== 6}>
                {verifying ? <Loader2 size={16} className="animate-spin" /> : "Verify"}
              </Button>
            </form>
            {verifyError && <p className="text-sm text-red-600">{verifyError}</p>}
            <Button variant="outline" size="sm" onClick={onResendPhone} disabled={resendingPhone}>
              {resendingPhone ? "Sending…" : "Resend code"}
            </Button>
          </>
        )}
      </Card>

      {notice && <p className="mt-3 text-sm text-muted-foreground">{notice}</p>}
    </div>
  );
}
