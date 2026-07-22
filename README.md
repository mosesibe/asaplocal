# AsapLocal

A local-services marketplace SaaS (Thumbtack/Bark-style): customers post jobs
or browse providers, providers buy/claim leads and get booked and paid,
admins and dispatchers run the operation. Three deployed apps, one shared
database.

## Architecture

Turborepo monorepo, pnpm workspaces.

```
apps/
  web/        customer app        (asaplocal.app)            — Next.js 15, port 3000
  provider/   business app        (business.asaplocal.app)   — Next.js 15, port 3001
  admin/      admin + dispatcher  (admin.asaplocal.app)       — Next.js 15, port 3002
packages/
  db/         Prisma schema, client singleton, seed data
  core/       shared business logic: lead marketplace engine, Stripe, S3,
              email, Pusher, rate limiting, AI (OpenAI), validation, audit log
  auth/       Auth.js (NextAuth v5) config + RBAC matrix
  ui/         shared design system (Button, Card, Badge, StarRating, Tailwind preset)
  config/     shared tsconfig/eslint
```

All three apps read/write the same Postgres database via `@asaplocal/db`
and share business logic via `@asaplocal/core` — there's exactly one
implementation of "how does a lead get priced/purchased/refunded", not three.

## The business model, in code

- **Subscriptions** (`Subscription` model, Stripe subscriptions) — Free /
  Pro £29/mo / Premium £79/mo / Enterprise custom. Pro/Premium include a
  monthly lead allowance.
- **Featured listings** — `Business.isFeatured` + `featuredUntil`, surfaced
  on the homepage and search ranking.
- **Lead sales** — the core mechanic. See below.
- **Commission** — booking payments flow through Stripe Checkout; the schema
  and payment records are commission-ready (add a Stripe Connect application
  fee on the booking PaymentIntent when you're ready to take a cut of
  provider payouts).

## Lead marketplace (the "post a job without picking a provider" flow)

1. Customer fills in `/jobs/new` with no provider chosen — description,
   photos, budget, preferred date, location.
2. `createJobRequestWithLead()` (`packages/core/src/lead-marketplace.ts`)
   computes a price in the £5–£20 band from the budget, opens a `Lead`, and
   notifies every eligible provider (matching category + within their
   service-area radius).
3. Providers browse `/leads` in the provider app and either:
   - **buy** the lead outright (Stripe Checkout, card charge), or
   - **claim** it against their monthly subscription allowance, or
   - **spend a purchased lead credit** from their wallet.
   Whichever they use, `LeadAccess` records who has it and how they paid;
   a DB-level unique constraint stops double-acquisition under concurrency.
4. Each provider works their own pipeline on that lead — `NEW → CONTACTED →
   QUOTED → WON/LOST` — independently of other providers who also bought it.
5. If a lead turns out bogus (wrong area, spam, duplicate, unresponsive
   customer), the provider requests a refund; an admin approves/rejects it
   in `/refunds`. Approval reverses the exact payment method used (Stripe
   refund, credit returned to wallet, or subscription allowance restored)
   and re-opens a slot on the lead.
6. `/analytics` in the provider app shows the funnel, spend, and estimated
   ROI per business, computed by `getLeadConversionAnalytics()`.

## Roles

Four roles, enforced in `packages/auth/src/rbac.ts` and in each app's
`middleware.ts` *and* again inside every mutating API route (never just one
layer):

- **Customer** — the web app.
- **Provider** — the provider app.
- **Dispatcher** — the admin app, restricted nav. Can track every job and
  *propose* an assignment/edit/cancellation, but every proposal is written
  as a pending `ApprovalRequest` — it has zero direct write access to
  `JobRequest`. See `/dispatcher` and the admin's `/approvals` queue.
- **Admin** — full access, including applying (or rejecting) dispatcher
  proposals, verifying businesses, moderating reviews/reports, managing
  categories/subscriptions, and the financial dashboard (MRR/ARR/churn).

## AI features (OpenAI, all optional/degrade gracefully without a key)

| Feature | Where |
|---|---|
| Job auto-categorisation | `api/jobs` (web) — cross-checks the customer's chosen category |
| Quote template generator | Provider lead detail page — pre-fills the quote form |
| Review moderation | `api/reviews` (web) — flags suspicious reviews for `/moderation` |
| Chat assistant | Provider messages thread — "✨ AI reply" drafts a response |

## What's deep vs. scaffolded

Per the agreed build priority, these are full production-quality
implementations: RBAC/auth (all 4 roles), the entire lead marketplace
lifecycle, bookings + Stripe payments (deposits, full payment, refunds),
messaging (Pusher real-time chat with presence via read timestamps), the
dispatcher/approval workflow, and the provider/admin dashboards.

Lighter but functional: Google Calendar sync (UI stub, no OAuth flow wired),
image upload UI (the S3 presigned-upload endpoint is real; the picker
component that calls it isn't built — paste a URL for now), and the
financial dashboard's churn/MRR math (correct methodology, simplified
plan-price lookup rather than reading live Stripe price data).

## Local development

```bash
pnpm install
cp .env.example .env   # fill in Stripe/S3/Maps/Pusher/Resend/OpenAI keys
pnpm db:generate
pnpm --filter @asaplocal/db exec prisma migrate dev --name init
pnpm db:seed            # demo categories, businesses, jobs, a completed booking+review
pnpm dev                 # runs all three apps via Turborepo (web:3000, provider:3001, admin:3002)
```

Seeded logins (password not set — use `prisma studio` to set a bcrypt hash,
or sign up fresh and re-seed): `admin@asaplocal.app`,
`dispatcher@asaplocal.app`, `customer1@example.com`,
`sparkle.cleaning@example.com` (provider).

Docker: `docker compose up` brings up Postgres + Redis + all three apps.
See `DEPLOYMENT.md` for the Vercel + Supabase production path and
`SECURITY.md` for the OWASP-mapped control list.

## Repo map for reviewers

- `packages/db/prisma/schema.prisma` — the full data model (25+ models):
  users/profiles/businesses/services/categories, the lead-marketplace
  models (`JobRequest`, `Lead`, `LeadAccess`, `LeadCreditWallet`,
  `RefundRequest`), bookings/quotes/reviews/favourites, messaging,
  payments/subscriptions, notifications/reports/audit logs, and the
  dispatcher approval models (`ApprovalRequest`, `DispatcherAssignment`).
- `packages/core/src/lead-marketplace.ts` — the lead engine described above.
- `apps/admin/app/api/approvals/[id]/decide/route.ts` — where a dispatcher's
  proposed change actually gets applied once an admin approves it.
- `apps/web/app/[slug]/page.tsx` — the local-SEO landing pages
  (`/electricians-manchester`, `/plumbers-london`, …) with `generateStaticParams`,
  per-page metadata/OG tags, and JSON-LD structured data.
