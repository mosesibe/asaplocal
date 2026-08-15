/**
 * Email layout primitives.
 *
 * Two shells, deliberately built to email-client rules rather than modern web
 * ones: table layout (Outlook renders with Word's engine), every style inline
 * (Gmail strips stylesheets), 600px fluid, and padded-anchor buttons that
 * degrade to a solid rectangle rather than breaking. Light-mode only — dark
 * mode support across clients is too inconsistent to rely on.
 *
 *   docket() — the house style. Hairline header, facts in labelled rows.
 *   letter() — for security mail (verify, reset, invite). Near-chromeless and
 *              personal; heavily-branded auth email reads as phishing, and
 *              plainer mail lands in the inbox more reliably.
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

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,Menlo,Consolas,monospace";

const INK = "#20140c";
const BODY = "#402b1c";
const SOFT = "#5a3f2a";
const MUTED = "#a57f5f";
const RULE = "#e3d0c2";
const HAIR = "#f3eae3";
const BRAND = "#c15f2a";
const BRAND_DEEP = "#9c4a20";
const WASH = "#fcf1e7";

const wordmark = (size: number) =>
  `<span style="font-size:${size}px;font-weight:800;color:${INK};letter-spacing:-0.3px;">Asap<span style="color:${BRAND};">Local</span></span>`;

/* ── Block rendering ──────────────────────────────────────────────── */

function blockHtml(block: Block): string {
  switch (block.kind) {
    case "paragraph":
      return `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.65;color:${BODY};">${escapeHtml(block.text)}</p>`;

    case "highlight":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${WASH};margin:0 0 20px 0;"><tr><td style="padding:16px 18px;">
        <p style="margin:0 0 4px 0;font-size:16px;font-weight:700;color:${INK};">${escapeHtml(block.title)}</p>
        ${block.meta ? `<p style="margin:0;font-size:14px;color:${SOFT};">${escapeHtml(block.meta)}</p>` : ""}
      </td></tr></table>`;

    case "data": {
      const rows = block.rows
        .map(
          ([label, value], i) =>
            `<tr>
              <td style="padding:11px 16px;${i < block.rows.length - 1 ? `border-bottom:1px solid ${RULE};` : ""}font-family:${MONO};font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:${MUTED};width:38%;vertical-align:top;">${escapeHtml(label)}</td>
              <td style="padding:11px 16px;${i < block.rows.length - 1 ? `border-bottom:1px solid ${RULE};` : ""}font-size:14px;color:${INK};">${escapeHtml(value)}</td>
            </tr>`,
        )
        .join("");
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${RULE};margin:0 0 20px 0;">${rows}</table>`;
    }

    case "list": {
      const items = block.items
        .map(
          (item) =>
            `<tr><td style="padding:5px 0;font-size:15px;line-height:1.5;color:${BODY};border-bottom:1px solid ${HAIR};">${escapeHtml(item)}</td></tr>`,
        )
        .join("");
      return `${block.label ? label(block.label) : ""}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px 0;">${items}</table>`;
    }

    case "steps": {
      const items = block.items
        .map(
          (item, i) =>
            `<tr>
              <td valign="top" style="width:26px;padding:6px 0;font-size:15px;font-weight:700;color:${BRAND};">${i + 1}</td>
              <td style="padding:6px 0;font-size:15px;line-height:1.6;color:${BODY};">${escapeHtml(item)}</td>
            </tr>`,
        )
        .join("");
      return `${block.label ? label(block.label) : ""}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px 0;">${items}</table>`;
    }

    case "timeline": {
      const rows = block.entries
        .map(
          (entry, i) =>
            `<tr>
              <td valign="top" style="width:10px;padding:6px 10px 6px 0;">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${BRAND};margin-top:6px;"></span>
                ${i < block.entries.length - 1 ? `<div style="width:1px;height:100%;min-height:18px;background:${RULE};margin:2px auto 0 3px;"></div>` : ""}
              </td>
              <td style="padding:6px 0;">
                <p style="margin:0;font-size:14px;font-weight:600;color:${INK};">${escapeHtml(entry.label)}</p>
                <p style="margin:1px 0 0 0;font-size:12px;color:${MUTED};">${escapeHtml(formatTimelineDate(entry.at))}</p>
              </td>
            </tr>`,
        )
        .join("");
      return `${block.label ? label(block.label) : ""}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px 0;">${rows}</table>`;
    }

    case "fallbackLink":
      return `<p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:${MUTED};">${escapeHtml(block.intro)}<br /><span style="color:${BRAND_DEEP};word-break:break-all;">${escapeHtml(block.url)}</span></p>`;
  }
}

function formatTimelineDate(date: Date): string {
  return date.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function label(text: string): string {
  return `<p style="margin:0 0 8px 0;font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:${MUTED};">${escapeHtml(text)}</p>`;
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

const shell = (inner: string) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#efedea;margin:0;padding:0;"><tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-collapse:collapse;font-family:${FONT};">
      ${inner}
    </table>
  </td></tr></table>`;

/* ── Shells ───────────────────────────────────────────────────────── */

/** House style — hairline header with a status eyebrow, facts in labelled rows. */
export function docket(opts: {
  eyebrow: string;
  title: string;
  blocks: Block[];
  cta?: Cta;
  /** Rendered below the CTA — for anything that refers back to it, like a paste-this-link fallback. */
  afterCta?: Block[];
  footnote?: string;
}): EmailBody {
  const html = shell(`
    <tr><td style="border-top:4px solid ${INK};padding:20px 32px;border-bottom:1px solid ${RULE};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td>${wordmark(15)}</td>
        <td align="right" style="font-family:${MONO};font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:${BRAND};">${escapeHtml(opts.eyebrow)}</td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:34px 32px 14px 32px;">
      <h1 style="margin:0 0 14px 0;font-size:22px;line-height:1.3;color:${INK};font-weight:800;letter-spacing:-0.4px;">${escapeHtml(opts.title)}</h1>
      ${opts.blocks.map(blockHtml).join("")}
      ${
        opts.cta
          ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 0 0;"><tr><td style="border:2px solid ${INK};">
              <a href="${escapeHtml(opts.cta.url)}" style="display:inline-block;padding:11px 24px;font-size:14px;font-weight:700;color:${INK};text-decoration:none;">${escapeHtml(opts.cta.label)} &rarr;</a>
            </td></tr></table>`
          : ""
      }
      ${opts.afterCta?.length ? `<div style="margin-top:20px;">${opts.afterCta.map(blockHtml).join("")}</div>` : ""}
    </td></tr>
    <tr><td style="padding:26px 32px 28px 32px;">
      <p style="margin:0;font-family:${MONO};font-size:10px;line-height:1.7;letter-spacing:0.5px;color:${MUTED};text-transform:uppercase;">${
        opts.footnote ? `${escapeHtml(opts.footnote)}<br />` : ""
      }AsapLocal &middot; United Kingdom</p>
    </td></tr>`);

  return { html, text: buildText(opts) };
}

/** Security mail — near-chromeless, personal, text-forward. */
export function letter(opts: {
  title: string;
  greeting?: string;
  blocks: Block[];
  cta?: Cta;
  /** Rendered below the CTA — for anything that refers back to it, like a paste-this-link fallback. */
  afterCta?: Block[];
  footnote?: string;
}): EmailBody {
  const html = shell(`
    <tr><td style="padding:40px 40px 0 40px;">${wordmark(14)}</td></tr>
    <tr><td style="padding:26px 40px 0 40px;">
      <h1 style="margin:0 0 18px 0;font-size:26px;line-height:1.2;color:${INK};font-weight:800;letter-spacing:-0.6px;">${escapeHtml(opts.title)}</h1>
      ${opts.greeting ? `<p style="margin:0 0 16px 0;font-size:16px;line-height:1.65;color:${BODY};">${escapeHtml(opts.greeting)}</p>` : ""}
      ${opts.blocks.map(blockHtml).join("")}
      ${
        opts.cta
          ? `<p style="margin:6px 0 22px 0;"><a href="${escapeHtml(opts.cta.url)}" style="font-size:16px;font-weight:700;color:${BRAND_DEEP};text-decoration:underline;">${escapeHtml(opts.cta.label)} &rarr;</a></p>`
          : ""
      }
      ${opts.afterCta?.map(blockHtml).join("") ?? ""}
    </td></tr>
    <tr><td style="padding:0 40px 40px 40px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid ${RULE};padding-top:20px;">
        <p style="margin:0;font-size:13px;line-height:1.65;color:${MUTED};">${opts.footnote ? `${escapeHtml(opts.footnote)}<br />` : ""}AsapLocal, United Kingdom</p>
      </td></tr></table>
    </td></tr>`);

  return { html, text: buildText(opts) };
}
