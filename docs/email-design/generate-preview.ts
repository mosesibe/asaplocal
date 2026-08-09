import { emailTemplates } from "@asaplocal/core";
import fs from "node:fs";

const L = "https://app.asaplocal.pro/verify-email?token=8f2c1d9e4b7a";
const samples: [string, string, { html: string; text: string }][] = [
  ["verifyEmail", "Letter · auth", emailTemplates.verifyEmail(L)],
  ["passwordReset", "Letter · auth", emailTemplates.passwordReset(L)],
  ["providerAccountInvite", "Letter · auth", emailTemplates.providerAccountInvite(L)],
  ["newLeadAvailable", "Docket", emailTemplates.newLeadAvailable("FlowFix Plumbing", "Leaking kitchen tap, needs replacing", "Manchester", L)],
  ["quoteReceived", "Docket", emailTemplates.quoteReceived("Leaking kitchen tap, needs replacing", L)],
  ["bookingConfirmed", "Docket", emailTemplates.bookingConfirmed(L)],
  ["referenceRequest", "Docket", emailTemplates.referenceRequest("FlowFix Plumbing", "Dan Whitfield", L)],
  ["insuranceExpiring", "Docket", emailTemplates.insuranceExpiring("FlowFix Plumbing", "Public Liability", "12 September 2026", L)],
  ["diyFixGuide", "Docket", emailTemplates.diyFixGuide({
    summary: "That's a classic DIY fix — here's the plan for your slow-draining bathroom sink.",
    toolkit: ["Plunger", "Baking soda & white vinegar", "Bucket and rubber gloves"],
    steps: [
      "Remove any visible hair or debris from the drain opening.",
      "Block the overflow with a wet cloth, then plunge hard for 30 seconds.",
      "Pour half a cup of baking soda, then vinegar. Leave for 15 minutes.",
    ],
    ctaUrl: "https://app.asaplocal.pro/jobs/new",
  })],
];

const page = `<title>AsapLocal — Rendered Emails</title>
<style>body{margin:0;background:#efedea;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif}
.lbl{font:600 11px ui-monospace,Menlo,monospace;letter-spacing:1.5px;text-transform:uppercase;color:#7a6a5c;padding:26px 0 8px;text-align:center}
.txt{max-width:600px;margin:0 auto 8px;background:#fff;border:1px dashed #c7bcb2;padding:12px;font:12px/1.5 ui-monospace,Menlo,monospace;color:#5a3f2a;white-space:pre-wrap}
.intro{max-width:600px;margin:0 auto;padding:36px 12px 8px;color:#402b1c}
.intro h1{margin:0 0 10px;font-size:26px;letter-spacing:-.6px;color:#20140c}
.intro p{margin:0 0 10px;font-size:14px;line-height:1.6}</style>
<div class="intro"><h1>Rendered emails</h1><p>All nine templates, generated from <code>packages/core/src/email.ts</code> — this is the real output, not a mockup. Auth mail uses the <b>Letter</b> shell; everything else uses <b>Docket</b>.</p><p>Each is followed by the plain-text alternative that ships alongside it.</p></div>
${samples.map(([n, style, b]) => `<div class="lbl">${n} — ${style}</div>${b.html}<div class="txt">PLAIN TEXT ALTERNATIVE\n\n${b.text.replace(/</g, "&lt;")}</div>`).join("")}`;

fs.writeFileSync(new URL("rendered-preview.html", import.meta.url).pathname, page);

// sanity checks on the generated markup
const all = samples.map(([, , b]) => b);
console.log("templates rendered:", all.length);
console.log("all have text:", all.every((b) => b.text.trim().length > 20));
console.log("all use tables:", all.every((b) => b.html.includes("<table")));
console.log("all 600px capped:", all.every((b) => b.html.includes("max-width:600px")));
console.log("no flex/grid:", !all.some((b) => /display:\s*(flex|grid)/.test(b.html)));
console.log("no <style> blocks:", !all.some((b) => b.html.includes("<style")));
