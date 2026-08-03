# Deployment guide — Vercel + Supabase

AsapLocal ships as three separate Next.js apps from one Turborepo:
`apps/web` (customer), `apps/provider` (business), `apps/admin` (admin +
dispatcher). Each deploys as its own Vercel project pointing at the same
repo, with a different "Root Directory". They share one Supabase Postgres
database via `packages/db`.

## 1. Provision infrastructure

1. **Supabase** — create a project, copy the pooled connection string into
   `DATABASE_URL` and the direct connection string into `DIRECT_URL` (Prisma
   needs both: pooled for the app, direct for migrations).
2. **Upstash Redis** — create a database, copy `UPSTASH_REDIS_REST_URL` /
   `UPSTASH_REDIS_REST_TOKEN` (used for rate limiting).
3. **Stripe** — create products/prices for Pro (£29/mo), Premium (£79/mo),
   and two lead-credit top-up packs (5 credits, 20 credits). Note each price
   ID into the relevant `STRIPE_PRICE_*` / `STRIPE_LEAD_CREDIT_PACK_*` env
   vars. Create two webhook endpoints later (step 5).
4. **AWS S3** — create a bucket (e.g. `asaplocal-uploads`), enable CORS
   for `PUT` from your app origins, create an IAM user scoped to that bucket
   only (`s3:PutObject`, `s3:DeleteObject`).
5. **Google Maps** — enable the Geocoding API, restrict the key to your
   server IPs/Vercel.
6. **Pusher** — create an app (Channels), note the app id/key/secret/cluster.
7. **Resend** — verify your sending domain, create an API key.
8. **OpenAI** — create an API key (all AI features degrade gracefully if
   omitted, so this can be added post-launch).

## 2. Run migrations & seed

```bash
pnpm install
pnpm db:generate
pnpm --filter @asaplocal/db exec prisma migrate deploy   # applies packages/db/prisma/migrations
pnpm db:seed                                                 # optional — demo data
```

## 3. Create three Vercel projects

For each app, import the same GitHub repo into a new Vercel project and set:

| App | Root Directory | Build Command | Output |
|---|---|---|---|
| Customer | `apps/web` | `cd ../.. && pnpm turbo run build --filter=@asaplocal/web` | `.next` |
| Provider | `apps/provider` | `cd ../.. && pnpm turbo run build --filter=@asaplocal/provider` | `.next` |
| Admin | `apps/admin` | `cd ../.. && pnpm turbo run build --filter=@asaplocal/admin` | `.next` |

Vercel auto-detects Next.js and pnpm workspaces, so in practice the default
build command usually works once "Root Directory" is set — the table above
is the explicit fallback if auto-detection picks the wrong scope.

Attach a custom domain to each: e.g. `asaplocal.pro` (web),
`business.asaplocal.pro` (provider), `admin.asaplocal.pro` (admin — put
this one behind Vercel's password protection or an IP allowlist in addition
to app-level RBAC, since it's staff-only).

## 4. Environment variables

Copy `.env.example` into each Vercel project's Environment Variables screen
(Production + Preview). All three apps need the full variable set since they
all import `@asaplocal/db` / `@asaplocal/core`. Set these per project:

- `NEXT_PUBLIC_WEB_URL` / `NEXT_PUBLIC_PROVIDER_URL` / `NEXT_PUBLIC_ADMIN_URL`
  — set to the **same three values in all three projects** (each app links
  out to the others, e.g. the customer app links to the provider signup page).
- `NEXTAUTH_URL` — set to **that specific project's own domain**, e.g.
  `https://asaplocal.pro` on the web project, `https://business.asaplocal.pro`
  on the provider project, `https://admin.asaplocal.pro` on the admin
  project. Unlike the `NEXT_PUBLIC_*_URL` vars, this one is *not* shared —
  Auth.js uses it to validate callback URLs for that specific deployment.

## 5. Stripe webhooks

Create two webhook endpoints in the Stripe dashboard:

1. `https://asaplocal.pro/api/webhooks/stripe` — events:
   `checkout.session.completed`, `charge.refunded` (booking payments).
2. `https://business.asaplocal.pro/api/webhooks/stripe` — events:
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted` (lead purchases, credit top-ups,
   subscriptions).

Copy each endpoint's signing secret into that project's
`STRIPE_WEBHOOK_SECRET`.

## 6. Post-deploy checklist

- [ ] Log into the admin app and confirm the seeded `admin@asaplocal.pro`
      account works (change its password / re-seed with a real account for
      production).
- [ ] Verify a test business end-to-end: register on the provider app →
      onboarding → post a job on the customer app → confirm the lead appears
      in `/leads` on the provider app → purchase with a Stripe test card
      (`4242 4242 4242 4242`) → confirm `LeadAccess` is granted via webhook.
- [ ] Confirm dispatcher flow: create a `DISPATCHER` user (via Prisma Studio
      or a seed script), log into the admin app, propose a job assignment,
      confirm it lands in `/approvals` for the admin account, approve it,
      confirm the provider is notified.
- [ ] Point Vercel's cron (or an external scheduler) at a small maintenance
      route to expire `JobRequest`s past `expiresAt` and reset monthly
      `Subscription.leadAllowanceUsed` counters — not included by default
      since it depends on your hosting choice for scheduled jobs.
- [ ] Set up Vercel Analytics / a monitoring provider (Sentry, Axiom) — not
      wired in by default; hook into `next.config.mjs` per app when ready.

## 7. Rollback

Vercel keeps every deployment immutable — use "Instant Rollback" in the
dashboard per-project. Database migrations are the one non-instant part: run
`prisma migrate resolve` or restore a Supabase point-in-time backup if a
migration needs reverting.
