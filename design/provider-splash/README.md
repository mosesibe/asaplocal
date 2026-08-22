# Provider app splash — design canvas

Working files for the animated loading/splash screen of the **provider** app
(`apps/provider`). Counterpart to `design/customer-splash/`.

| File | Artboard |
| --- | --- |
| `Main.dc.html` | **A · Lead feed** — three real leads deal in, then resolve to the mark |
| `Earnings.dc.html` | **B · Earnings** — bars build, the split resolves, then the mark |
| `Handoff.dc.html` | Static resting frame — where both directions land |
| `canvas.json` | Layout, titles and the annotations |

All three are 390×844 phone frames on a 5-second loop.

## Why this doesn't reuse the customer palette

The two apps genuinely differ. `apps/provider/app/globals.css` runs a **cool
slate** scale (`--background: 222 47% 7%`, `--surface: 222 40% 10%`);
`apps/web/app/globals.css` runs **warm espresso** (`20 35% 7%` / `20 28% 11%`).
Only Inter and the terracotta brand scale are shared, through
`packages/ui/tailwind.preset.js`. The lockup mirrors
`apps/provider/components/auth-brand.tsx` — mark, wordmark, and "Business"
baseline-aligned beside it at `text-sm`/`font-normal`.

Card anatomy in `Main.dc.html` follows the marketplace card in
`apps/provider/app/leads/page.tsx`. The lead prices shown (£6.50 / £13.50 /
£7.50) are what `computeLeadPrice()` in `packages/core/src/lead-marketplace.ts`
actually returns for those budgets, not invented figures. The earnings figures
reconcile at the platform's real 10% commission.

`logo-mark.svg` is deliberately **not** copied here — it is taken from
`apps/provider/public/logo-mark.svg` at seed time so it cannot drift.

## Two deviations from the app, both deliberate

Both are app bugs found while matching tokens, flagged on the canvas and **not
fixed here**:

1. **`--muted-foreground` is never defined for the provider app.** Its
   `globals.css` sets `--background`, `--foreground`, `--surface`, `--muted` and
   `--border` in both `:root` and `.dark`, but not `--muted-foreground` — while
   the compiled CSS still emits `.text-muted-foreground{color:hsl(var(--muted-foreground))}`.
   That is invalid at computed-value time, so `color` falls back to `inherit`:
   secondary text across 67 provider files renders at full foreground weight.
   These artboards use `hsl(215 20% 65%)`, the slate counterpart to what
   `apps/web` sets.
2. **`text-brand-700` has no dark-mode variant.** The lead price and the
   dashboard links use it; on `--surface` in dark mode it is 2.1:1. The artboards
   use `brand-300` (`#e6975d`) instead — 7.8:1 on the same surface.

## Re-seeding

```bash
node "<design skill dir>/seed-canvas.mjs" \
  --template "<design skill dir>/payload.template.html" \
  --out /path/to/asaplocal-business-splash.html \
  --title "AsapLocal Business Splash" \
  --artboard Main.dc.html --artboard Earnings.dc.html --artboard Handoff.dc.html \
  --image ../../apps/provider/public/logo-mark.svg \
  --canvas canvas.json
```
