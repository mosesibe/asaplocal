import { LogoMark } from "@asaplocal/ui";

/**
 * Dark hero shared by /login and /register — stylized live-jobs map,
 * illustrative only (no real geodata), from Claude Design variant "1a".
 */
export function AuthHero() {
  return (
    <div className="relative h-[290px] overflow-hidden" style={{ background: "#1b1a20" }}>
      <svg viewBox="0 0 420 290" width="100%" height="290" className="absolute inset-0" preserveAspectRatio="xMidYMid slice">
        <rect width="420" height="290" fill="#1b1a20" />
        <g stroke="#2b2a33" strokeWidth="16" strokeLinecap="round">
          <path d="M-20 96 H440" />
          <path d="M-20 210 H440" />
          <path d="M106 -20 V310" />
          <path d="M288 -20 V310" />
        </g>
        <g stroke="#232229" strokeWidth="7" strokeLinecap="round">
          <path d="M-20 150 H440" />
          <path d="M194 -20 V310" />
          <path d="M364 -20 V310" />
          <path d="M-20 258 H440" />
        </g>
        <g fill="#201f26">
          <rect x="122" y="112" width="52" height="22" rx="6" />
          <rect x="210" y="108" width="56" height="30" rx="6" />
          <rect x="122" y="166" width="46" height="30" rx="6" />
          <rect x="210" y="170" width="56" height="24" rx="6" />
          <rect x="306" y="112" width="40" height="26" rx="6" />
          <rect x="306" y="222" width="40" height="24" rx="6" />
          <rect x="30" y="222" width="56" height="24" rx="6" />
        </g>
        <g fill="#7a8a5e" opacity=".22">
          <circle cx="65" cy="60" r="44" />
          <circle cx="378" cy="188" r="34" />
        </g>
        <rect width="420" height="290" fill="url(#authHeroFade)" />
        <defs>
          <linearGradient id="authHeroFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#17161a" stopOpacity=".35" />
            <stop offset=".55" stopColor="#17161a" stopOpacity="0" />
            <stop offset="1" stopColor="#17161a" stopOpacity=".95" />
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute left-6 top-6 flex items-center gap-2.5">
        <LogoMark className="h-[30px] w-[30px]" srcLight="/logo-mark-dark.png" srcDark="/logo-mark-dark.png" />
        <span style={{ fontFamily: "var(--font-caprasimo)", fontSize: 19, letterSpacing: "-0.01em", color: "#f9f4ed" }}>
          Asap<span style={{ color: "#f6a06b" }}>Local</span>
        </span>
        <span
          className="rounded-full border px-2 py-[3px] text-[11px] font-bold uppercase tracking-[0.1em]"
          style={{ color: "#8fa073", borderColor: "rgba(143,160,115,.45)" }}
        >
          Business
        </span>
      </div>

      <div
        className="absolute h-14 w-14 animate-ping rounded-full"
        style={{ left: "calc(50% - 20px)", top: 118, background: "rgba(198,113,57,.5)" }}
      />
      <div
        className="absolute h-5 w-5 rounded-full border-[3px]"
        style={{ left: "calc(50% - 2px)", top: 136, background: "#c67139", borderColor: "#f9f4ed", boxShadow: "0 0 18px rgba(198,113,57,.9)" }}
      />
      <div className="absolute h-3.5 w-3.5 rounded-full border-2" style={{ left: 88, top: 196, background: "#8fa073", borderColor: "#f9f4ed" }} />
      <div className="absolute h-3.5 w-3.5 rounded-full border-2" style={{ left: 330, top: 158, background: "#8fa073", borderColor: "#f9f4ed" }} />

      <div
        className="asl-float absolute flex items-center gap-[7px] rounded-full border px-[11px] py-1.5 text-[11.5px] font-semibold"
        style={{ left: 226, top: 96, background: "rgba(23,22,26,.86)", borderColor: "rgba(249,244,237,.14)", color: "#f9f4ed" }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#8fa073" }} />
        4 new jobs nearby
      </div>
    </div>
  );
}

/** Shared dark pill-input class for the auth screens (login/register). */
export const authInputClass =
  "h-[54px] w-full rounded-full border px-5 text-[15px] outline-none focus:border-[#c67139] focus:ring-[3px] focus:ring-[rgba(198,113,57,.22)]";
export const authInputStyle = { background: "#1f1e24", borderColor: "rgba(249,244,237,.16)", color: "#f9f4ed" } as const;
export const authLabelClass = "mb-1.5 ml-4 block text-[11.5px] font-bold uppercase tracking-[0.06em]";
export const authLabelStyle = { color: "rgba(249,244,237,.5)" } as const;
