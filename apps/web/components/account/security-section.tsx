"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getCsrfToken } from "next-auth/react";
import { KeyRound, Fingerprint, Loader2 } from "lucide-react";
import { SectionCard, SectionRow, Switch } from "./section-row";

// Drives the WebAuthn REST contract directly instead of next-auth/react's
// signIn("webauthn") helper: that wrapper hard-redirects to the sign-in page
// on any failure (ignoring `redirect: false`) — a rough edge in Auth.js's
// still-experimental WebAuthn client integration. This keeps failures
// (unsupported device, cancelled prompt) as an inline error instead.
async function registerPasskey() {
  const { startRegistration } = await import("@simplewebauthn/browser");
  const optionsRes = await fetch("/api/auth/webauthn-options/webauthn?action=register");
  if (!optionsRes.ok) throw new Error("Could not start passkey registration");
  const { options } = await optionsRes.json();
  const webAuthnResponse = await startRegistration(options);
  const csrfToken = await getCsrfToken();
  const res = await fetch("/api/auth/callback/webauthn", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Auth-Return-Redirect": "1" },
    body: new URLSearchParams({ data: JSON.stringify(webAuthnResponse), action: "register", csrfToken: csrfToken ?? "", callbackUrl: window.location.href }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || (typeof data.url === "string" && data.url.includes("error="))) {
    throw new Error("Registration failed");
  }
}

export function SecuritySection({ signInMethods, hasPasskey }: { signInMethods: string[]; hasPasskey: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleBiometric() {
    setError(null);
    setLoading(true);
    try {
      if (hasPasskey) {
        await fetch("/api/account/webauthn", { method: "DELETE" });
      } else {
        await registerPasskey();
      }
      router.refresh();
    } catch {
      setError("Your device doesn't support biometric unlock, or the request was cancelled.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SectionCard title="Security">
      <SectionRow icon={KeyRound} label="Sign-in methods" description={signInMethods.join(", ") || "None"} />
      <div className="flex items-center gap-3 px-4 py-3.5">
        <Fingerprint size={18} className="shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Biometric unlock</p>
          <p className="text-xs text-muted-foreground">
            {error ?? (hasPasskey ? "Enabled on this device via passkey" : "Use Face ID, Touch ID, or your device PIN to sign in")}
          </p>
        </div>
        {loading ? <Loader2 size={18} className="animate-spin text-muted-foreground" /> : <Switch checked={hasPasskey} onChange={toggleBiometric} label="Toggle biometric unlock" />}
      </div>
    </SectionCard>
  );
}
