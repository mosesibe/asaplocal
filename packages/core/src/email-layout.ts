/**
 * Email layout primitives.
 *
 * One shell, built to email-client rules rather than modern web ones: table
 * layout (Outlook renders with Word's engine), every style inline (Gmail
 * strips stylesheets), 600px fluid, a rounded white card floating on a tinted
 * page background, and pill-shaped buttons/badges that degrade to a solid
 * rounded rectangle rather than breaking. Light-mode only — dark mode support
 * across clients is too inconsistent to rely on.
 *
 * A single shell for every email, security mail included: it used to be
 * split (a near-chromeless "letter" shell for auth mail, on the theory that
 * heavy branding reads as phishing), but the current design uses the same
 * branded card everywhere and just varies the header badge — matched here.
 *
 * Every dynamic value is escaped inside the block renderers so an individual
 * template can't forget to do it.
 */
import { escapeHtml } from "./validations";

export interface EmailBody {
  html: string;
  text: string;
}

export interface Cta {
  label: string;
  url: string;
}

export type Block =
  | { kind: "paragraph"; text: string }
  | { kind: "data"; rows: [string, string][] }
  | { kind: "highlight"; title: string; meta?: string }
  | { kind: "list"; label?: string; items: string[] }
  | { kind: "steps"; label?: string; items: string[] }
  | { kind: "timeline"; label?: string; entries: { label: string; at: Date }[] }
  | { kind: "fallbackLink"; intro: string; url: string };

const FONT = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";

const PAGE_BG = "#e9eef6";
const CARD_BG = "#ffffff";
const INK = "#002059"; // headings, primary values
const BODY = "#33415c"; // paragraph text
const MUTED = "#5a6b8c"; // labels, meta
const BRAND = "#ff5a00"; // CTA fill
const ACCENT = "#c94600"; // links, urgent text — darker than BRAND for AA contrast on white
const PANEL_BG = "#f7f9fc";
const RULE = "#eaeff6";
const RULE_STRONG = "#dde4ee";
const PILL_NEUTRAL_BG = "#eef2f8";
const PILL_NEUTRAL_TEXT = "#5a6b8c";
const PILL_SUCCESS_BG = "#e8f3ec";
const PILL_SUCCESS_TEXT = "#1f6b46";
const STEP_BADGE_BG = "#fff0e8";
const STEP_BADGE_TEXT = "#c94600";

const LOGO_MARK_URL = "https://app.asaplocal.pro/logo-mark-dark.png";

const wordmark = () =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td valign="middle" style="padding-right:8px;"><img src="${LOGO_MARK_URL}" width="26" height="26" alt="" style="display:block;width:26px;height:26px;border:0;"></td>
    <td valign="middle" style="font-family:${FONT};font-weight:800;letter-spacing:-0.4px;font-size:22px;line-height:28px;mso-line-height-rule:exactly;"><span style="color:${INK};">Asap</span><span style="color:${BRAND};">Local</span></td>
  </tr></table>`;

/* ── Block rendering ──────────────────────────────────────────────── */

function blockHtml(block: Block): string {
  switch (block.kind) {
    case "paragraph":
      return `<p style="margin:0 0 16px 0;font-family:${FONT};font-size:16px;line-height:27px;mso-line-height-rule:exactly;color:${BODY};">${escapeHtml(block.text)}</p>`;

    case "highlight":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${PANEL_BG}" style="width:100%;background-color:${PANEL_BG};border-radius:20px;margin:0 0 20px 0;"><tr><td style="padding:22px 24px;">
        <p style="margin:0 0 4px 0;font-family:${FONT};font-weight:800;letter-spacing:-0.4px;font-size:18px;line-height:25px;mso-line-height-rule:exactly;color:${INK};">${escapeHtml(block.title)}</p>
        ${block.meta ? `<p style="margin:0;font-family:${FONT};font-size:14px;line-height:22px;mso-line-height-rule:exactly;color:${MUTED};">${escapeHtml(block.meta)}</p>` : ""}
      </td></tr></table>`;

    case "data": {
      const rows = block.rows
        .map(
          ([label, value], i) =>
            `<tr>
              <td width="150" valign="top" style="padding:10px 0;${i > 0 ? `border-top:1px solid ${RULE};` : ""}font-family:${FONT};font-size:13px;line-height:20px;mso-line-height-rule:exactly;color:${MUTED};">${escapeHtml(label)}</td>
              <td valign="top" style="padding:10px 0;${i > 0 ? `border-top:1px solid ${RULE};` : ""}font-family:${FONT};font-size:15px;line-height:20px;mso-line-height-rule:exactly;color:${INK};">${escapeHtml(value)}</td>
            </tr>`,
        )
        .join("");
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${PANEL_BG}" style="width:100%;background-color:${PANEL_BG};border-radius:20px;margin:0 0 20px 0;"><tr><td style="padding:20px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
      </td></tr></table>`;
    }

    case "list": {
      const items = block.items
        .map(
          (item, i) =>
            `<tr><td style="padding:10px 0;${i > 0 ? `border-top:1px solid ${RULE};` : ""}font-family:${FONT};font-size:15px;line-height:22px;mso-line-height-rule:exactly;color:${BODY};">${escapeHtml(item)}</td></tr>`,
        )
        .join("");
      return `${block.label ? label(block.label) : ""}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${PANEL_BG}" style="width:100%;background-color:${PANEL_BG};border-radius:20px;margin:0 0 20px 0;"><tr><td style="padding:6px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${items}</table>
      </td></tr></table>`;
    }

    case "steps": {
      const items = block.items
        .map(
          (item, i) =>
            `<tr>
              <td width="34" valign="top" style="padding:${i === 0 ? "0" : "12px"} 0 0 0;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="24" height="24" bgcolor="${STEP_BADGE_BG}" align="center" valign="middle" style="width:24px;height:24px;border-radius:999px;font-family:${FONT};font-size:12px;line-height:24px;mso-line-height-rule:exactly;color:${STEP_BADGE_TEXT};font-weight:700;">${i + 1}</td></tr></table>
              </td>
              <td valign="top" style="padding:${i === 0 ? "0" : "12px"} 0 0 0;font-family:${FONT};font-size:15px;line-height:24px;mso-line-height-rule:exactly;color:${BODY};">${escapeHtml(item)}</td>
            </tr>`,
        )
        .join("");
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${PANEL_BG}" style="width:100%;background-color:${PANEL_BG};border-radius:20px;margin:0 0 20px 0;"><tr><td style="padding:22px 24px;">
        ${block.label ? `<p style="margin:0 0 12px 0;font-family:${FONT};font-weight:800;letter-spacing:-0.4px;font-size:16px;line-height:23px;mso-line-height-rule:exactly;color:${INK};">${escapeHtml(block.label)}</p>` : ""}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${items}</table>
      </td></tr></table>`;
    }

    case "timeline": {
      const rows = block.entries
        .map(
          (entry, i) =>
            `<tr>
              <td valign="top" width="18" style="padding:6px 10px 6px 0;">
                <span style="display:inline-block;width:8px;height:8px;border-radius:999px;background-color:${BRAND};margin-top:6px;"></span>
                ${i < block.entries.length - 1 ? `<div style="width:1px;height:100%;min-height:18px;background-color:${RULE};margin:2px auto 0 3px;"></div>` : ""}
              </td>
              <td style="padding:6px 0;">
                <p style="margin:0;font-family:${FONT};font-weight:700;font-size:14px;line-height:20px;mso-line-height-rule:exactly;color:${INK};">${escapeHtml(entry.label)}</p>
                <p style="margin:1px 0 0 0;font-family:${FONT};font-size:12px;line-height:18px;mso-line-height-rule:exactly;color:${MUTED};">${escapeHtml(formatTimelineDate(entry.at))}</p>
              </td>
            </tr>`,
        )
        .join("");
      return `${block.label ? label(block.label) : ""}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px 0;">${rows}</table>`;
    }

    case "fallbackLink":
      return `<p style="margin:0 0 16px 0;font-family:${FONT};font-size:13px;line-height:22px;mso-line-height-rule:exactly;color:${MUTED};">${escapeHtml(block.intro)}<br /><span style="color:${ACCENT};word-break:break-all;">${escapeHtml(block.url)}</span></p>`;
  }
}

function formatTimelineDate(date: Date): string {
  return date.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function label(text: string): string {
  return `<p style="margin:0 0 10px 0;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${MUTED};">${escapeHtml(text)}</p>`;
}

function blockText(block: Block): string {
  switch (block.kind) {
    case "paragraph":
      return block.text;
    case "highlight":
      return block.meta ? `${block.title}\n${block.meta}` : block.title;
    case "data":
      return block.rows.map(([k, v]) => `${k}: ${v}`).join("\n");
    case "list":
      return [block.label, ...block.items.map((i) => `- ${i}`)]
        .filter(Boolean)
        .join("\n");
    case "steps":
      return [block.label, ...block.items.map((i, n) => `${n + 1}. ${i}`)]
        .filter(Boolean)
        .join("\n");
    case "timeline":
      return [block.label, ...block.entries.map((e) => `- ${e.label} (${formatTimelineDate(e.at)})`)]
        .filter(Boolean)
        .join("\n");
    case "fallbackLink":
      return `${block.intro}\n${block.url}`;
  }
}

function buildText(parts: {
  title: string;
  greeting?: string;
  blocks: Block[];
  cta?: Cta;
  afterCta?: Block[];
  footnote?: string;
}): string {
  return [
    parts.title,
    parts.greeting,
    ...parts.blocks.map(blockText),
    parts.cta ? `${parts.cta.label}: ${parts.cta.url}` : undefined,
    ...(parts.afterCta ?? []).map(blockText),
    parts.footnote,
    "AsapLocal · United Kingdom",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/* ── Shell ────────────────────────────────────────────────────────── */

/**
 * The one shell every email uses. `badgeVariant` picks the header pill's
 * color — "success" for money/good-news (payouts, digests), "neutral"
 * (default) for everything else, security notices included.
 */
export function card(opts: {
  badge: string;
  badgeVariant?: "neutral" | "success";
  title: string;
  /** Preview text shown in the inbox list, before the email is opened. Falls back to the title if omitted. */
  preheader?: string;
  greeting?: string;
  blocks: Block[];
  cta?: Cta;
  /** Rendered below the CTA — for anything that refers back to it, like a paste-this-link fallback. */
  afterCta?: Block[];
  footnote?: string;
}): EmailBody {
  const badgeBg = opts.badgeVariant === "success" ? PILL_SUCCESS_BG : PILL_NEUTRAL_BG;
  const badgeText = opts.badgeVariant === "success" ? PILL_SUCCESS_TEXT : PILL_NEUTRAL_TEXT;
  const preheader = opts.preheader ?? opts.title;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>AsapLocal</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  @media only screen and (max-width: 620px) {
    .wrap { width: 100% !important; }
    .pad { padding-left: 24px !important; padding-right: 24px !important; }
    .h1 { font-size: 28px !important; line-height: 34px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${PAGE_BG};">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${PAGE_BG};">${escapeHtml(preheader)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${PAGE_BG};"><tr><td align="center" style="padding:30px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="wrap" style="width:600px;max-width:600px;background-color:${CARD_BG};border-radius:20px;">

  <tr><td class="pad" style="padding:26px 40px 0 40px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td align="left">${wordmark()}</td>
      <td align="right"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${badgeBg}" style="padding:6px 14px;border-radius:999px;font-family:${FONT};font-size:11px;line-height:16px;mso-line-height-rule:exactly;color:${badgeText};font-weight:700;letter-spacing:0.8px;text-transform:uppercase;">${escapeHtml(opts.badge)}</td></tr></table></td>
    </tr></table>
  </td></tr>

  <tr><td class="pad h1" style="padding:26px 40px 0 40px;font-family:${FONT};font-weight:800;letter-spacing:-0.4px;font-size:34px;line-height:40px;mso-line-height-rule:exactly;color:${INK};" align="left">
    ${escapeHtml(opts.title)}
  </td></tr>
  ${opts.greeting ? `<tr><td class="pad" style="padding:16px 40px 0 40px;font-family:${FONT};font-size:16px;line-height:27px;mso-line-height-rule:exactly;color:${BODY};" align="left">${escapeHtml(opts.greeting)}</td></tr>` : ""}

  <tr><td class="pad" style="padding:${opts.greeting ? "20" : "20"}px 40px 0 40px;">
    ${opts.blocks.map(blockHtml).join("")}
  </td></tr>

  ${
    opts.cta
      ? `<tr><td class="pad" style="padding:8px 40px 0 40px;" align="left">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${BRAND}" style="border-radius:999px;" align="center">
            <a href="${escapeHtml(opts.cta.url)}" style="display:block;padding:15px 34px;font-family:${FONT};font-size:16px;line-height:20px;mso-line-height-rule:exactly;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">${escapeHtml(opts.cta.label)}</a>
          </td></tr></table>
        </td></tr>`
      : ""
  }
  ${opts.afterCta?.length ? `<tr><td class="pad" style="padding:18px 40px 0 40px;">${opts.afterCta.map(blockHtml).join("")}</td></tr>` : ""}

  <tr><td class="pad" style="padding:34px 40px 32px 40px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
    <td style="border-top:1px solid ${RULE_STRONG};padding-top:22px;font-family:${FONT};font-size:12px;line-height:21px;mso-line-height-rule:exactly;color:${MUTED};" align="left">
      AsapLocal · United Kingdom · <a href="mailto:info@asaplocal.pro" style="color:${ACCENT};text-decoration:underline;">info@asaplocal.pro</a>${opts.footnote ? `<br>${escapeHtml(opts.footnote)}` : ""}
    </td>
  </tr></table></td></tr>
</table>
</td></tr></table>
</body>
</html>`;

  return { html, text: buildText(opts) };
}
