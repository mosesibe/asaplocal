"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Caprasimo, Figtree } from "next/font/google";
import { Eye, EyeOff, Check } from "lucide-react";
import { AuthHero, authInputClass, authInputStyle, authLabelClass, authLabelStyle } from "@/components/auth-hero";

// Scoped to this screen (and /register) only — the rest of the app is Inter
// throughout, and this hero treatment (from Claude Design variant "1a —
// Dark, cleaned up — live job map") is a deliberate one-off, not a
// typography change for the whole app.
const caprasimo = Caprasimo({ subsets: ["latin"], weight: "400", variable: "--font-caprasimo" });
const figtree = Figtree({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-figtree" });

export default function LoginPage() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) {
      setLoading(false);
      setError("Incorrect email or password");
      return;
    }
    setDone(true);
    // The root layout reads the session server-side (for ProviderShell) — a
    // client-side router.push() here can leave Next.js's client router
    // cache serving the pre-login (shell-less) render of that layout. A
    // full navigation guarantees the layout re-renders with the new session.
    window.location.href = params.get("callbackUrl") ?? "/dashboard";
  }

  return (
    <div
      className={`${caprasimo.variable} ${figtree.variable} min-h-screen`}
      style={{ background: "#17161a", fontFamily: "var(--font-figtree)" }}
    >
      <div className="mx-auto w-full max-w-[420px]">
        <AuthHero />

        <div className="px-6 pb-10" style={{ marginTop: -26, position: "relative" }}>
          <h1 style={{ fontFamily: "var(--font-caprasimo)", fontSize: 32, lineHeight: 1.08, margin: "0 0 6px", color: "#f9f4ed" }}>
            Back to work.
          </h1>
          <p className="mb-5 text-sm" style={{ color: "rgba(249,244,237,.62)" }}>
            Log in to manage bookings, quotes and your subscription.
          </p>

          {!done ? (
            <form onSubmit={onSubmit} className="flex flex-col gap-3">
              <label className="block">
                <span className={authLabelClass} style={authLabelStyle}>
                  Email
                </span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@yourbusiness.co.uk"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                {loading && <span className="h-[17px] w-[17px] animate-spin rounded-full border-[2.5px] border-white/40" style={{ borderTopColor: "#fff9f2" }} />}
                {loading ? "Logging in…" : "Log in"}
              </button>
            </form>
          ) : (
            <div className="flex flex-col items-center gap-3.5 py-8 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "#7a8a5e" }}>
                <Check size={30} strokeWidth={2.75} color="#f9f4ed" />
              </span>
              <p style={{ fontFamily: "var(--font-caprasimo)", fontSize: 21, margin: 0, color: "#f9f4ed" }}>You&apos;re in</p>
              <p className="text-[13.5px]" style={{ color: "rgba(249,244,237,.6)", margin: 0 }}>
                Opening your job board…
              </p>
            </div>
          )}

          <div className="mt-5 flex flex-col items-center gap-3">
            <Link href="/forgot-password" className="text-[13.5px] font-semibold hover:text-[#f6a06b]" style={{ color: "rgba(249,244,237,.7)" }}>
              Forgot password?
            </Link>
            <p className="text-[13.5px]" style={{ color: "rgba(249,244,237,.55)" }}>
              New provider?{" "}
              <Link href="/register" className="font-bold hover:underline" style={{ color: "#f6a06b" }}>
                List your business
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
