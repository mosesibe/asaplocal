"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button, Card, Input, PasswordInput } from "@asaplocal/ui";

type Phase = "form" | "confirm-existing";

export default function RegisterPage() {
  const router = useRouter();
  const ref = useSearchParams().get("ref");
  const [phase, setPhase] = useState<Phase>("form");
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "" });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(body: Record<string, string | boolean>, signInPassword: string) {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, ref }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (data.code === "EXISTING_CUSTOMER") {
        setPhase("confirm-existing");
        setError(null);
      } else {
        setError(data.message ?? "Something went wrong");
      }
      setLoading(false);
      return;
    }

    // Sign the account straight in so we can check verification status —
    // email + phone verification is required before the dashboard unlocks.
    const signInRes = await signIn("credentials", { email: form.email, password: signInPassword, redirect: false });
    setLoading(false);
    router.push(signInRes?.ok ? "/verify" : "/login");
  }

  function onSubmitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!termsAccepted) {
      setError("You must agree to the Terms & Privacy Policy");
      return;
    }
    submit({ ...form, termsAccepted }, form.password);
  }

  function onSubmitConfirm(e: React.FormEvent) {
    e.preventDefault();
    submit({ ...form, confirmPassword, termsAccepted }, confirmPassword);
  }

  if (phase === "confirm-existing") {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <Card className="mt-6 p-6">
          <p className="text-sm text-muted-foreground">
            You already have a customer account with <span className="font-medium">{form.email}</span>. Confirm your password to add
            provider access to it.
          </p>
          <form onSubmit={onSubmitConfirm} className="mt-4 space-y-4">
            <PasswordInput
              required
              placeholder="Your existing password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Confirming…" : "Confirm and continue"}</Button>
          </form>
          <button type="button" className="mt-4 text-sm text-muted-foreground underline" onClick={() => { setPhase("form"); setError(null); }}>
            Use a different email instead
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold">List your business on AsapLocal</h1>
      <Card className="mt-6 p-6">
        <form onSubmit={onSubmitForm} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input required placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <Input required placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <Input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input required type="tel" placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <PasswordInput required placeholder="Password (min 8 characters)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
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
              <a href={`${process.env.NEXT_PUBLIC_WEB_URL}/terms`} target="_blank" rel="noreferrer" className="font-medium text-brand-700 hover:underline">
                Terms
              </a>{" "}
              &{" "}
              <a href={`${process.env.NEXT_PUBLIC_WEB_URL}/privacy`} target="_blank" rel="noreferrer" className="font-medium text-brand-700 hover:underline">
                Privacy Policy
              </a>
            </span>
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creating account…" : "Sign up as a provider"}</Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already listed? <Link href="/login" className="font-medium text-brand-700 hover:underline">Log in</Link>
        </p>
      </Card>
    </div>
  );
}
