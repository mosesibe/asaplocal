"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Caprasimo, Figtree } from "next/font/google";
import { Eye, EyeOff } from "lucide-react";
import { AuthHero, authInputClass, authInputStyle, authLabelClass, authLabelStyle } from "@/components/auth-hero";

const caprasimo = Caprasimo({ subsets: ["latin"], weight: "400", variable: "--font-caprasimo" });
const figtree = Figtree({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-figtree" });

type Phase = "form" | "confirm-existing";

export default function RegisterPage() {
  const router = useRouter();
  const ref = useSearchParams().get("ref");
  const [phase, setPhase] = useState<Phase>("form");
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  // Separate and unticked — must not be bundled with the terms checkbox.
  const [marketingEmail, setMarketingEmail] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    submit({ ...form, termsAccepted, marketingEmail }, form.password);
  }

  function onSubmitConfirm(e: React.FormEvent) {
    e.preventDefault();
    submit({ ...form, confirmPassword, termsAccepted, marketingEmail }, confirmPassword);
  }

  return (
    <div
      className={`${caprasimo.variable} ${figtree.variable} min-h-screen`}
      style={{ background: "#17161a", fontFamily: "var(--font-figtree)" }}
    >
      <div className="mx-auto w-full max-w-[420px]">
        <AuthHero />

        <div className="px-6 pb-10" style={{ marginTop: -26, position: "relative" }}>
          {phase === "confirm-existing" ? (
            <>
              <h1 style={{ fontFamily: "var(--font-caprasimo)", fontSize: 32, lineHeight: 1.08, margin: "0 0 6px", color: "#f9f4ed" }}>
                Welcome back.
              </h1>
              <p className="mb-5 text-sm" style={{ color: "rgba(249,244,237,.62)" }}>
                You already have a customer account with <span className="font-semibold">{form.email}</span>. Confirm your password to
                add provider access to it.
              </p>
              <form onSubmit={onSubmitConfirm} className="flex flex-col gap-3">
                <label className="block">
                  <span className={authLabelClass} style={authLabelStyle}>
                    Password
                  </span>
                  <span className="relative block">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      placeholder="Your existing password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`${authInputClass} pr-[54px]`}
                      style={authInputStyle}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      className="absolute right-1.5 top-[5px] flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/[.08] hover:text-[#f6a06b]"
                      style={{ color: "rgba(249,244,237,.6)" }}
                    >
                      {showConfirmPassword ? <EyeOff size={20} strokeWidth={2.75} /> : <Eye size={20} strokeWidth={2.75} />}
                    </button>
                  </span>
                </label>
                {error && (
                  <p className="ml-[18px] mt-0.5 text-[12.5px] font-semibold" style={{ color: "#f6a06b" }}>
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1.5 flex h-14 items-center justify-center gap-2.5 rounded-full text-[17px] disabled:opacity-70"
                  style={{ background: "#c67139", color: "#fff9f2", fontFamily: "var(--font-caprasimo)" }}
                >
                  {loading && (
                    <span className="h-[17px] w-[17px] animate-spin rounded-full border-[2.5px] border-white/40" style={{ borderTopColor: "#fff9f2" }} />
                  )}
                  {loading ? "Confirming…" : "Confirm and continue"}
                </button>
              </form>
              <button
                type="button"
                className="mt-4 text-[13.5px] font-semibold underline"
                style={{ color: "rgba(249,244,237,.7)" }}
                onClick={() => {
                  setPhase("form");
                  setError(null);
                }}
              >
                Use a different email instead
              </button>
            </>
          ) : (
            <>
              <h1 style={{ fontFamily: "var(--font-caprasimo)", fontSize: 32, lineHeight: 1.08, margin: "0 0 6px", color: "#f9f4ed" }}>
                List your business.
              </h1>
              <p className="mb-5 text-sm" style={{ color: "rgba(249,244,237,.62)" }}>
                Get booked by your neighbours — join AsapLocal Business.
              </p>

              <form onSubmit={onSubmitForm} className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className={authLabelClass} style={authLabelStyle}>
                      First name
                    </span>
                    <input
                      required
                      placeholder="First name"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      className={authInputClass}
                      style={authInputStyle}
                    />
                  </label>
                  <label className="block">
                    <span className={authLabelClass} style={authLabelStyle}>
                      Last name
                    </span>
                    <input
                      required
                      placeholder="Last name"
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      className={authInputClass}
                      style={authInputStyle}
                    />
                  </label>
                </div>
                <label className="block">
                  <span className={authLabelClass} style={authLabelStyle}>
                    Email
                  </span>
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    placeholder="you@yourbusiness.co.uk"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={authInputClass}
                    style={authInputStyle}
                  />
                </label>
                <label className="block">
                  <span className={authLabelClass} style={authLabelStyle}>
                    Phone number
                  </span>
                  <input
                    required
                    type="tel"
                    autoComplete="tel"
                    placeholder="07…"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className={authInputClass}
                    style={authInputStyle}
                  />
                </label>
                <label className="block">
                  <span className={authLabelClass} style={authLabelStyle}>
                    Password
                  </span>
                  <span className="relative block">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      placeholder="Min 8 characters"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className={`${authInputClass} pr-[54px]`}
                      style={authInputStyle}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-1.5 top-[5px] flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/[.08] hover:text-[#f6a06b]"
                      style={{ color: "rgba(249,244,237,.6)" }}
                    >
                      {showPassword ? <EyeOff size={20} strokeWidth={2.75} /> : <Eye size={20} strokeWidth={2.75} />}
                    </button>
                  </span>
                </label>

                <label className="flex items-start gap-2 text-[13px]" style={{ color: "rgba(249,244,237,.6)" }}>
                  <input
                    type="checkbox"
                    required
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5"
                    style={{ accentColor: "#c67139" }}
                  />
                  <span>
                    I agree to the{" "}
                    <a
                      href={`${process.env.NEXT_PUBLIC_WEB_URL}/terms`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold hover:underline"
                      style={{ color: "#f6a06b" }}
                    >
                      Terms
                    </a>{" "}
                    &{" "}
                    <a
                      href={`${process.env.NEXT_PUBLIC_WEB_URL}/privacy`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold hover:underline"
                      style={{ color: "#f6a06b" }}
                    >
                      Privacy Policy
                    </a>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-[13px]" style={{ color: "rgba(249,244,237,.6)" }}>
                  <input
                    type="checkbox"
                    checked={marketingEmail}
                    onChange={(e) => setMarketingEmail(e.target.checked)}
                    className="mt-0.5"
                    style={{ accentColor: "#c67139" }}
                  />
                  <span>Email me product news, lead-generation tips and offers. Optional — job and payout emails are unaffected.</span>
                </label>

                {error && (
                  <p className="ml-[18px] mt-0.5 text-[12.5px] font-semibold" style={{ color: "#f6a06b" }}>
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1.5 flex h-14 items-center justify-center gap-2.5 rounded-full text-[17px] disabled:opacity-70"
                  style={{ background: "#c67139", color: "#fff9f2", fontFamily: "var(--font-caprasimo)" }}
                >
                  {loading && (
                    <span className="h-[17px] w-[17px] animate-spin rounded-full border-[2.5px] border-white/40" style={{ borderTopColor: "#fff9f2" }} />
                  )}
                  {loading ? "Creating account…" : "Sign up as a provider"}
                </button>
              </form>

              <div className="mt-5 flex flex-col items-center gap-3">
                <p className="text-[13.5px]" style={{ color: "rgba(249,244,237,.55)" }}>
                  Already listed?{" "}
                  <Link href="/login" className="font-bold hover:underline" style={{ color: "#f6a06b" }}>
                    Log in
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
