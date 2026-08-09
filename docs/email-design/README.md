# Email templates

All transactional email lives in `packages/core/src/email.ts`, built on two
shells in `packages/core/src/email-layout.ts`.

| Shell | Used for | Why |
|---|---|---|
| `letter()` | `verifyEmail`, `passwordReset`, `providerAccountInvite` | Security mail. Near-chromeless and personal — heavily-branded auth email reads as phishing, and plainer mail lands in the inbox more reliably. |
| `docket()` | everything else | House style. Hairline header with a status eyebrow, facts in labelled rows. |

## Files here

| File | What it is |
|---|---|
| `email-design-options.html` | The three directions that were reviewed before building (Signal / Docket / Letter). Kept for reference. |
| `rendered-preview.html` | Every template rendered from the real code, each with its plain-text alternative. |
| `generate-preview.ts` | Regenerates `rendered-preview.html`. |

Regenerate the preview after changing any template:

```bash
set -a && source packages/db/.env && set +a
pnpm --filter @asaplocal/db exec tsx ../../docs/email-design/generate-preview.ts
```

## Rules these templates follow

Email clients are not browsers. All markup here is built to survive them:

- **Tables for layout** — Outlook on Windows renders with Word's engine, so flex and grid don't work.
- **Every style inline** — Gmail strips much of what lives in a stylesheet.
- **600px, fluid below** — the width that survives every client.
- **Padded-anchor buttons** — degrade to a solid rectangle rather than breaking.
- **Light-mode only** — dark-mode email support is too inconsistent to rely on.
- **Plain-text alternative always sent** — HTML-only mail looks like bulk to spam filters.

## Adding a template

Compose blocks rather than writing markup, so escaping and spacing stay
consistent:

```ts
myEmail: (name: string, link: string): EmailBody =>
  docket({
    eyebrow: "Short status",
    title: "What happened",
    blocks: [
      { kind: "paragraph", text: `Hi ${name} — here's the thing.` },
      { kind: "data", rows: [["Label", "Value"]] },
    ],
    cta: { label: "Do the thing", url: link },
    footnote: "Why you received this.",
  }),
```

Every dynamic value is escaped inside the block renderers, so a template
can't forget to do it. Put anything that refers back to the CTA (a
paste-this-link fallback) in `afterCta`, not `blocks`, so it reads in order.

## Open item

`insuranceExpiring` is defined and styled but **has no call site** — nothing
sends it. A policy can currently lapse in silence, which automatically drops
the provider's trust tier. It needs a scheduled job that checks
`InsurancePolicy.expiryDate`, or the template should be deleted.
