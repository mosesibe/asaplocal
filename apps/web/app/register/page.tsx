"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Caprasimo, Figtree } from "next/font/google";
import { Eye, EyeOff, Check } from "lucide-react";
import { AuthHeroPhoto, authInputClass, authInputStyle } from "@/components/auth-hero-photo";

const caprasimo = Caprasimo({ subsets: ["latin"], weight: "400", variable: "--font-caprasimo" });
const figtree = Figtree({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-figtree" });

export default function RegisterPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const isPostJob = params.get("reason") === "post-job";
  const ref = params.get("ref");

  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  // Unticked by default and never required — a pre-ticked or mandatory box
  // makes the consent invalid.
  const [termsAccepted, setTermsAccepted] = useState(false);
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

  return (
    <div className={`${caprasimo.variable} ${figtree.variable} min-h-screen`} style={{ background: "#f5ead8", fontFamily: "var(--font-figtree)" }}>
      <div className="mx-auto w-full max-w-[420px]">
        <AuthHeroPhoto headline="Get help, booked in minutes." photoSrc="/auth-hero.png" />

        <div className="relative z-[2] mx-[18px] rounded-[28px] bg-[#fffdf8] p-6 shadow-[0_12px_32px_rgba(46,43,37,.22)]" style={{ marginTop: -58 }}>
          {done ? (
            <div className="flex items-center gap-3.5 py-2">
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full" style={{ background: "#7a8a5e" }}>
                <Check size={24} strokeWidth={2.75} color="#f9f4ed" />
              </span>
              <span>
                <span className="block" style={{ fontFamily: "var(--font-caprasimo)", fontSize: 19 }}>
                  Check your inbox
                </span>
                <span className="text-[13px]" style={{ color: "rgba(32,30,29,.6)" }}>
                  We&apos;ve sent a link to {form.email}
                </span>
              </span>
              <button
                type="button"
                onClick={() => router.push(done === "signed-in" ? next : `/login?callbackUrl=${encodeURIComponent(next)}`)}
                className="ml-auto flex h-11 flex-none items-center justify-center rounded-full px-5 text-[14px] font-semibold"
                style={{ background: "#c67139", color: "#fff9f2" }}
              >
                Continue
              </button>
            </div>
          ) : (
            <>
              {isPostJob && (
                <p className="mb-3 text-[13px]" style={{ color: "rgba(32,30,29,.6)" }}>
                  Create a free account to finish posting your job — we&apos;ve saved what you entered.
                </p>
              )}
              <form onSubmit={onSubmit} className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    required
                    placeholder="First name"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className={authInputClass}
                    style={authInputStyle}
                  />
                  <input
                    required
                    placeholder="Last name"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className={authInputClass}
                    style={authInputStyle}
                  />
                </div>
                <input
                  required
                  type="email"
                  autoComplete="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={authInputClass}
                  style={authInputStyle}
                />
                <input
                  required
                  type="tel"
                  autoComplete="tel"
                  placeholder="Phone number"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={authInputClass}
                  style={authInputStyle}
                />
                <span className="relative block">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    placeholder="Password (min 8 characters)"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className={`${authInputClass} pr-[54px]`}
                    style={authInputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full text-[#645c50] hover:bg-[#ffe1d0] hover:text-[#8c491a]"
                  >
                    {showPassword ? <EyeOff size={20} strokeWidth={2.75} /> : <Eye size={20} strokeWidth={2.75} />}
                  </button>
                </span>

                <label className="flex items-start gap-2 text-[13px]" style={{ color: "rgba(32,30,29,.6)" }}>
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
                    <a href="/terms" target="_blank" rel="noreferrer" className="font-semibold hover:underline" style={{ color: "#8c491a" }}>
                      Terms
                    </a>{" "}
                    &amp;{" "}
                    <a href="/privacy" target="_blank" rel="noreferrer" className="font-semibold hover:underline" style={{ color: "#8c491a" }}>
                      Privacy Policy
                    </a>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-[13px]" style={{ color: "rgba(32,30,29,.6)" }}>
                  <input
                    type="checkbox"
                    checked={marketingEmail}
                    onChange={(e) => setMarketingEmail(e.target.checked)}
                    className="mt-0.5"
                    style={{ accentColor: "#c67139" }}
                  />
                  <span>Email me occasional tips and offers. Optional — you can change this any time, and it never affects booking updates.</span>
                </label>

                {error && (
                  <p className="ml-[18px] text-[12.5px] font-semibold" style={{ color: "#8c491a" }}>
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-0.5 flex h-14 items-center justify-center gap-2.5 rounded-full text-[17px] shadow-[0_1px_2px_rgba(46,43,37,.14)] disabled:opacity-70"
                  style={{ background: "#c67139", color: "#fff9f2", fontFamily: "var(--font-caprasimo)" }}
                >
                  {loading && <span className="h-[17px] w-[17px] animate-spin rounded-full border-[2.5px] border-white/40" style={{ borderTopColor: "#fff9f2" }} />}
                  {loading ? "Creating account…" : "Sign up"}
                </button>
              </form>

              <p className="mt-4 text-center text-[13.5px]" style={{ color: "rgba(32,30,29,.6)" }}>
                Already have an account?{" "}
                <Link href={`/login?callbackUrl=${encodeURIComponent(next)}`} className="font-bold hover:underline" style={{ color: "#8c491a" }}>
                  Log in
                </Link>
              </p>
              <p className="mt-1 text-center text-[12px]" style={{ color: "rgba(32,30,29,.5)" }}>
                Are you a service provider?{" "}
                <a href={process.env.NEXT_PUBLIC_PROVIDER_URL} className="hover:underline">
                  List your business →
                </a>
              </p>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 px-6 pt-[22px]">
          <span className="flex">
            <span className="h-[38px] w-[38px] rounded-full border-2 border-[#f5ead8]" style={{ background: "#ffe1d0" }} />
            <span className="-ml-3 h-[38px] w-[38px] rounded-full border-2 border-[#f5ead8]" style={{ background: "#e1eecc" }} />
            <span className="-ml-3 h-[38px] w-[38px] rounded-full border-2 border-[#f5ead8]" style={{ background: "#dcd3c4" }} />
          </span>
          <p className="pb-[30px] text-[12.5px] leading-[1.35]" style={{ color: "rgba(32,30,29,.62)" }}>
            Vetted, reviewed and paid securely through AsapLocal.
          </p>
        </div>
      </div>
    </div>
  );
}
