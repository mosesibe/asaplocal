import { LogoMark } from "@asaplocal/ui";

/**
 * Full-bleed photo hero shared by /login and /register — Claude Design
 * variant "2c". `photoSrc` is optional: until a real photo is dropped in
 * (see apps/web/public/auth-hero.jpg), this renders a gradient wash in its
 * place so the page still looks intentional rather than showing a broken
 * image — swap the src in once the asset lands, nothing else changes.
 */
export function AuthHeroPhoto({ headline, photoSrc }: { headline: string; photoSrc?: string }) {
  return (
    <div className="relative h-[360px] flex-none">
      {photoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element -- static local hero photo, not a Next/Image candidate
        <img src={photoSrc} alt="" className="h-full w-full object-cover" />
      ) : (
        <div
          className="h-full w-full"
          style={{ background: "linear-gradient(135deg, #ffe1d0 0%, #e1eecc 55%, #dcd3c4 100%)" }}
        />
      )}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(180deg, rgba(32,30,29,.62) 0%, rgba(32,30,29,.18) 45%, rgba(245,234,216,.98) 100%)" }}
      />
      <div className="pointer-events-none absolute inset-0 flex flex-col px-6 pt-4" style={{ color: "#f9f4ed" }}>
        <div className="mt-[22px] flex items-center gap-2.5">
          <LogoMark className="h-[30px] w-[30px]" srcLight="/logo-mark-dark.png" srcDark="/logo-mark-dark.png" />
          <span style={{ fontFamily: "var(--font-caprasimo)", fontSize: 19, color: "#f9f4ed" }}>
            Asap<span style={{ color: "#f6a06b" }}>Local</span>
          </span>
        </div>
        <h1
          className="mt-auto max-w-[290px]"
          style={{ fontFamily: "var(--font-caprasimo)", fontSize: 34, lineHeight: 1.04, marginBottom: 72, color: "#fff9f2", textShadow: "0 2px 18px rgba(32,30,29,.45)" }}
        >
          {headline}
        </h1>
      </div>
    </div>
  );
}

/** Shared light pill-input class for the customer auth screens (login/register). */
export const authInputClass =
  "h-[52px] w-full rounded-full border px-5 text-[15px] outline-none focus:border-[#c67139] focus:ring-[3px] focus:ring-[rgba(198,113,57,.18)]";
export const authInputStyle = { background: "#f9f4ed", borderColor: "#dcd3c4", color: "#201e1d" } as const;

