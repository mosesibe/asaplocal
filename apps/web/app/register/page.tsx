"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button, Card, Input, PasswordInput } from "@asaplocal/ui";

export default function RegisterPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const isPostJob = params.get("reason") === "post-job";
  const ref = params.get("ref");

  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "" });
  const [termsAccepted, setTermsAccepted] = useState(false);
  // Unticked by default and never required — a pre-ticked or mandatory box
  // makes the consent invalid.
  const [marketingEmail, setMarketingEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<"signed-in" | "needs-login" | false>(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, ref, termsAccepted, marketingEmail }) });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message ?? "Something went wrong");
      setLoading(false);
      return;
    }

    // Sign the new account straight in so we can carry the customer back to
    // whatever they were doing (e.g. resuming a job post) — email
    // verification happens in the background and isn't required to sign in.
    const signInRes = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
    setLoading(false);
    setDone(signInRes?.ok ? "signed-in" : "needs-login");
  }

  if (done) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold">Check your inbox</h1>
        <p className="mt-3 text-muted-foreground">
          We've sent a verification link to {form.email}. You can confirm it anytime — no need to wait, let's get you started.
        </p>
        <Button
          className="mt-6 w-full"
          onClick={() => router.push(done === "signed-in" ? next : `/login?callbackUrl=${encodeURIComponent(next)}`)}
        >
          Continue
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold">Create your account</h1>
      {isPostJob && (
        <p className="mt-2 text-sm text-muted-foreground">
          Create a free account to finish posting your job — we've saved what you entered and you'll pick up right where you left off.
        </p>
      )}
      <Card className="mt-6 p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input required placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <Input required placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <Input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input required type="tel" placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <PasswordInput required placeholder="Password (min 8 characters)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <label className="flex items-start gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              required
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              I agree to the{" "}
              <a href="/terms" target="_blank" rel="noreferrer" className="font-medium text-brand-700 hover:underline">Terms</a>{" "}
              &amp;{" "}
              <a href="/privacy" target="_blank" rel="noreferrer" className="font-medium text-brand-700 hover:underline">Privacy Policy</a>
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={marketingEmail}
              onChange={(e) => setMarketingEmail(e.target.checked)}
              className="mt-0.5"
            />
            <span>Email me occasional tips and offers. Optional — you can change this any time, and it never affects booking updates.</span>
          </label>

          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creating account…" : "Sign up"}</Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account? <Link href={`/login?callbackUrl=${encodeURIComponent(next)}`} className="font-medium text-brand-700 hover:underline">Log in</Link>
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Are you a service provider? <a href={process.env.NEXT_PUBLIC_PROVIDER_URL} className="hover:underline">List your business →</a>
        </p>
      </Card>
    </div>
  );
}
