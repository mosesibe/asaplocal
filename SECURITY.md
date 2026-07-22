# Security — OWASP-aligned controls

This maps AsapLocal's actual implementation to OWASP Top 10 categories.
Every control referenced below exists in the codebase today, not as a TODO.

## A01 — Broken access control

- RBAC is centralised in `packages/auth/src/rbac.ts` (role hierarchy, permission
  matrix, `requireRole`/`requirePermission` helpers) and enforced twice: at the
  edge in each app's `middleware.ts` (redirects unauthenticated/wrong-role
  users before a page renders) and again inside every API route handler
  (`session.user.role !== "..."` checks), since middleware alone can be
  bypassed if a route is misconfigured.
- Dispatchers never get direct write access to `JobRequest` — every mutation
  they submit becomes a pending `ApprovalRequest` (see
  `apps/admin/app/api/dispatcher/**`) that only an Admin can apply
  (`apps/admin/app/api/approvals/[id]/decide/route.ts`). This is enforced
  server-side, not just hidden in the UI.
- Row-level ownership checks on every resource fetch (e.g. a booking is only
  returned if `booking.customerId === session.user.id`) rather than trusting
  IDs alone.

## A02 — Cryptographic failures

- Passwords hashed with bcrypt, cost factor 12 (`apps/*/app/api/auth/register/route.ts`).
- All cookies are `Secure`/`HttpOnly` via NextAuth defaults in production; JWT
  session tokens signed with `NEXTAUTH_SECRET`.
- Stripe secret keys, DB credentials, and API keys are only ever read from
  `process.env` server-side — never exposed to the client bundle (verified by
  only prefixing genuinely public values with `NEXT_PUBLIC_`).

## A03 — Injection

- All database access goes through Prisma's parameterised query builder —
  no raw string-concatenated SQL anywhere in the codebase.
- Every mutating API route validates its input with a Zod schema
  (`packages/core/src/validations.ts`) before it touches the database.
- Free-text fields (job descriptions, messages, reviews, business
  descriptions) are passed through `stripHtml()` before being persisted, and
  React's default JSX escaping handles output encoding on render.

## A04 — Insecure design

- Money amounts are always re-derived server-side from the database record
  (`Booking.totalAmountPence`, `JobRequest.leadPricePence`) inside Stripe
  Checkout Session creation — the client can never submit an amount.
- Lead access is gated by a DB-level unique constraint
  (`@@unique([leadId, businessId])`) so a provider cannot double-acquire the
  same lead even under concurrent requests; acquisition runs inside a Prisma
  `$transaction`.
- Refunds reverse the exact payment method used (Stripe refund vs. credit
  wallet increment vs. subscription allowance decrement) rather than a
  generic "give money back" path, so state always stays consistent.

## A05 — Security misconfiguration

- Security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options:
  nosniff`, `Referrer-Policy`, `Content-Security-Policy` on the customer app)
  set in each app's `next.config.mjs`.
- The provider and admin apps ship `robots.ts` disallowing all indexing —
  these are internal tools, not public marketing pages.
- `.env.example` documents every required variable; real secrets are never
  committed (`.gitignore` excludes `.env*`).

## A06 — Vulnerable & outdated components

- Dependencies are pinned to specific minor versions in each `package.json`;
  the CI workflow (`.github/workflows/ci.yml`) runs `npm audit`-equivalent
  checks via `pnpm audit` as part of the pipeline.

## A07 — Identification & authentication failures

- Auth.js (NextAuth v5) with Credentials + Google OAuth providers; email
  verification required before a `CUSTOMER`/`PROVIDER` account is marked
  `ACTIVE`.
- Rate limiting via Upstash Redis sliding-window limiter
  (`packages/core/src/rate-limit.ts`), applied to login-adjacent and
  high-value endpoints: registration (8/hour/IP), job posting (5/5min/user),
  lead acquisition (20/min/user), message sending (30/min/user).
- Suspended/deactivated accounts are blocked at the middleware level even
  with a still-valid session token (`user.status` is re-checked from the DB
  on every JWT refresh in `packages/auth/src/auth.ts`).

## A08 — Software & data integrity failures

- Stripe webhook handlers verify the HMAC signature
  (`stripe.webhooks.constructEvent`) against the raw request body before
  processing any event — this is the only way payment/subscription state
  changes are ever written, so a forged webhook call cannot mutate billing
  state.
- Every privileged action (suspend user, verify business, approve refund,
  approve dispatcher change) writes an immutable `AuditLog` row via
  `writeAuditLog()`.

## A09 — Security logging & monitoring failures

- `AuditLog` captures actor, role, action, target, metadata, IP and
  user-agent for every admin/dispatcher mutation — queryable by admins for
  incident review.
- Stripe webhook signature failures and rate-limit rejections are logged
  server-side with enough context to investigate abuse patterns.

## A10 — Server-side request forgery

- The only server-initiated outbound calls to user-influenced URLs are the
  Google Maps geocoding call (`geocodeAddress`), which sends a query string
  parameter, not a full URL, to a fixed Google endpoint — there is no
  "fetch this URL the user gave us" code path anywhere in the app.

## Additional controls

- **CSRF**: `packages/core/src/csrf.ts` exposes `verifyOrigin()` for
  mutating routes as defence in depth on top of SameSite session cookies;
  Stripe webhook routes are intentionally exempt (authenticated by HMAC
  signature instead of cookies).
- **File uploads**: never proxied through our servers. `createPresignedUpload()`
  (`packages/core/src/s3.ts`) issues a short-lived (120s) presigned S3 PUT
  URL, validates content-type against an allow-list, enforces a 10MB ceiling,
  and generates a random UUID object key so user input never reaches the S3
  key (no path traversal).
- **XSS**: `stripHtml()` on all free-text input at write time; React's JSX
  auto-escaping on read; CSP header restricts script sources on the
  customer-facing app.
