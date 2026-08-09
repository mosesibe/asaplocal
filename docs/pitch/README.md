# AsapLocal — Pitch Materials

Two self-contained deliverables. No build step, no dependencies, no network
calls — open either file directly in a browser.

| File | What it is | Use it for |
|---|---|---|
| `asaplocal-company-brief.html` | Long-form printable brief, 10 numbered sections | Reading, emailing, printing / saving to PDF as a leave-behind |
| `asaplocal-pitch-deck.html` | 17-slide presentation, keyboard-navigable | Presenting live or over screen share |

## Printing to PDF

Both files are print-tuned and force a light palette when printed regardless
of screen theme.

- **Brief** → `Ctrl/Cmd + P` → A4 portrait. Section blocks and table rows are
  set not to split across pages.
- **Deck** → `Ctrl/Cmd + P` → A4 **landscape**. Each slide prints as its own
  page and the on-screen navigation chrome is hidden.

In the print dialog, enable **Background graphics** so the accent colours,
tier chips and panel fills come through.

## Presenting

| Key | Action |
|---|---|
| `→` / `Space` / `PageDown` | Next slide |
| `←` / `PageUp` | Previous slide |
| `Home` / `End` | First / last slide |

Swipe works on touch devices. The URL hash tracks the slide number, so
`…#7` opens directly on slide 7 — handy for jumping back to the trust ladder
during Q&A.

## Before you circulate these

**Every metric is deliberately left blank.** Anywhere you see a dashed
orange placeholder (`—`, `£ AMOUNT`, `MILESTONE`), fill it from your own
verified data. Nothing was estimated or inferred.

Placeholders live in:

- Brief — section `09 Traction` and section `10 Ask`
- Deck — slides 15 (Traction) and 16 (The ask)

**Also worth a second pass before external use:**

1. **Competitor claims.** The brief characterises category-wide patterns
   (verify-once badges, unlimited lead resale) rather than naming any
   competitor or citing their pricing. If you want to name names or quote
   their fees, source those figures first — they are not in this document
   because they were not verifiable from our side.
2. **Regulatory wording.** Insurance and qualification language should get a
   compliance read before it goes to insurers or letting agents.

## What the narrative is built on

Every capability claim maps to something already implemented in this repo,
not a roadmap item:

| Claim | Where it lives |
|---|---|
| Trust ladder + automatic recomputation | `packages/core/src/trust-tier.ts` |
| Lead pricing, 5-buyer cap, refunds, blur | `packages/core/src/lead-marketplace.ts` |
| Identity / company / insurance verification | `packages/core/src/stripe-identity.ts`, `companies-house.ts`, `apps/provider/app/verification/**` |
| Quote → booking → deposit → payout | `apps/provider/app/api/quotes`, `apps/web/app/api/quotes/[id]/accept`, `packages/core/src/stripe-connect.ts` |
| Job sheets and customer sign-off | `apps/provider/app/api/bookings/[bookingId]/**` |
| Dispatch, approvals, audit trail | `apps/admin/app/dispatch/**`, `apps/admin/app/approvals/**`, `packages/core/src/audit.ts` |
| Plans and allowances | `packages/core/src/stripe.ts` (`PLAN_LEAD_ALLOWANCE`) |
| Categories and emergency tagging | `packages/db/prisma/seed.ts` |

If the product changes, update the brief — the strength of this pitch is that
it describes what runs today.
