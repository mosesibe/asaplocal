"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Caprasimo, Figtree } from "next/font/google";
import { Eye, EyeOff, Check } from "lucide-react";
import { AuthHeroPhoto, authInputClass, authInputStyle } from "@/components/auth-hero-photo";

// Scoped to this screen (and /register) only — the rest of the app is Inter
// throughout, and this hero treatment (from Claude Design variant "2c —
// Full-bleed photo, card lifts over it") is a deliberate one-off, not a
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
    // The root layout reads the session server-side (for SiteHeader) — a
    // client-side router.push() here can leave Next.js's client router
    // cache serving the pre-login (signed-out) render of that layout. A
    // full navigation guarantees the layout re-renders with the new session.
    window.location.href = params.get("callbackUrl") ?? "/dashboard";
  }

  return (
    <div className={`${caprasimo.variable} ${figtree.variable} min-h-screen`} style={{ background: "#f5ead8", fontFamily: "var(--font-figtree)" }}>
      <div className="mx-auto w-full max-w-[420px]">
        <AuthHeroPhoto headline="Help, booked by this afternoon." photoSrc="/auth-hero.png" />

        <div className="relative z-[2] mx-[18px] rounded-[28px] bg-[#fffdf8] p-6 shadow-[0_12px_32px_rgba(46,43,37,.22)]" style={{ marginTop: -58 }}>
          {!done ? (
            <form onSubmit={onSubmit} className="flex flex-col gap-3">
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={authInputClass}
                style={authInputStyle}
              />
              <span className="relative block">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                {loading ? "Logging in…" : "Log in"}
              </button>
              <button
                type="button"
                onClick={() => signIn("google", { callbackUrl: params.get("callbackUrl") ?? "/dashboard" })}
                className="flex h-12 items-center justify-center rounded-full border text-[14px] font-semibold"
                style={{ borderColor: "#dcd3c4", color: "#201e1d" }}
              >
                Continue with Google
              </button>
              <Link href="/forgot-password" className="self-center text-[13.5px] font-semibold hover:underline" style={{ color: "#8c491a" }}>
                Forgot password?
              </Link>
            </form>
          ) : (
            <div className="flex items-center gap-3.5 py-2">
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full" style={{ background: "#7a8a5e" }}>
                <Check size={24} strokeWidth={2.75} color="#f9f4ed" />
              </span>
              <span>
                <span className="block" style={{ fontFamily: "var(--font-caprasimo)", fontSize: 19 }}>
                  You&apos;re in
                </span>
                <span className="text-[13px]" style={{ color: "rgba(32,30,29,.6)" }}>
                  Opening your bookings…
                </span>
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 px-6 pt-[22px]">
          <span className="flex">
            <span className="h-[38px] w-[38px] rounded-full border-2 border-[#f5ead8]" style={{ background: "#ffe1d0" }} />
            <span className="-ml-3 h-[38px] w-[38px] rounded-full border-2 border-[#f5ead8]" style={{ background: "#e1eecc" }} />
            <span className="-ml-3 h-[38px] w-[38px] rounded-full border-2 border-[#f5ead8]" style={{ background: "#dcd3c4" }} />
          </span>
          <p className="text-[12.5px] leading-[1.35]" style={{ color: "rgba(32,30,29,.62)" }}>
            Vetted, reviewed and paid securely through AsapLocal.
          </p>
        </div>

        <p className="px-6 pb-[30px] pt-5 text-[13.5px]" style={{ color: "rgba(32,30,29,.6)" }}>
          New here?{" "}
          <Link href="/register" className="font-bold hover:underline" style={{ color: "#8c491a" }}>
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
