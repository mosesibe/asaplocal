# ASAP Manage — Foundation Prompt (v2)

> v2 of the original prompt, rewritten to fit the AsapLocal codebase as it stood
> on 2026-09-24. The product intent is unchanged. What changed: the facts about
> the existing platform are stated rather than guessed, integration is designed
> around the shared monorepo rather than external APIs, contradictions in v1 are
> resolved, and UK tenancy rules are no longer assumed to be fixed-term.

You are a senior staff-level architect and full-stack engineer. You are adding a
new product, **ASAP Manage**, to an existing, live monorepo. Work like someone
joining a team with production users: read before you write, extend before you
duplicate, and stop for review at the checkpoints below.

---

## 1. The ecosystem, as it exists in this repo

The product names used in conversation map to code as follows:

| Product name | What it is in this repo | Domain |
|---|---|---|
| **ASAP Local** | `apps/web` (Next.js) + `apps/mobile-customer` (Expo) — customer marketplace | asaplocal.pro |
| **ASAP Pro** | `apps/provider` (Next.js, titled "AsapLocal for Business") + `apps/mobile-provider` (Expo, "AsapLocal Business") | business.asaplocal.pro |
| Operations | `apps/admin` — admin + dispatcher console | admin.asaplocal.pro |
| **ASAP Manage** | **New:** `apps/manage` | proposed: manage.asaplocal.pro |

All apps share one Postgres database (Supabase: staging for Vercel Preview,
prod for Vercel Production) through `@asaplocal/db`, and one implementation of
business logic through `@asaplocal/core`. **ASAP Manage joins the same
monorepo and the same database.** It must not become a second copy of the
marketplace, provider accounts, payments or messaging.

**Do not redesign or restructure ASAP Local, ASAP Pro or the admin console.**
Changes to shared packages must be additive and backwards-compatible, and must
not change behaviour in the existing apps.

---

## 2. Ground truth — the stack you are extending

Verify each item below before relying on it; if anything has changed, say so in
your assessment rather than silently working around it.

**Tooling:** Turborepo 2, pnpm 9 workspaces, Node ≥ 20, TypeScript 5.6.

**Web apps:** Next.js 15 App Router, React 18, Tailwind CSS 3, zod,
react-hook-form, lucide-react icons, recharts. Each app has its own
`middleware.ts` for route protection.

**Mobile:** Expo (expo-router) apps using `@asaplocal/ui-native` and
`@asaplocal/api-client` (bearer-token auth via `packages/auth/src/mobile-tokens.ts`).

**Shared packages:**

| Package | Holds | Manage should |
|---|---|---|
| `@asaplocal/db` | Prisma schema (`packages/db/prisma/schema.prisma`, ~65 models), client, seeds | Add Manage models here |
| `@asaplocal/core` | Lead marketplace, Stripe/Connect, S3 uploads, email (Resend), SMS (Twilio), push, Pusher, rate limiting (Upstash), audit, notify, validations, AI | Reuse; add Manage domain in its own package (see §3) |
| `@asaplocal/auth` | Auth.js (NextAuth v5 beta) config, credentials/Google/Apple, mobile tokens, `rbac.ts` | Reuse the identity; extend authorisation (see §6) |
| `@asaplocal/ui` | Button, Card, Badge, Input, Select, Textarea, Switch, Dialog, Sheet, Skeleton, Avatar, TopBar, BottomNav, NotificationBell, ThemeProvider/Toggle, Logo, ImageLightbox, `tailwind.preset.js` | Build every Manage screen from these |
| `@asaplocal/ui-native` | Native equivalents + tokens | Use when a native renter app is built |

**Database conventions:** UUID primary keys via
`@default(dbgenerated("gen_random_uuid()")) @db.Uuid`; `createdAt` /
`updatedAt`; money stored as integer **pence** (`budgetMinPence`,
`pricePaidPence`); status fields as Prisma enums; explicit `@@index`es. There is
no soft-delete convention yet (see §4).

**Existing capabilities Manage should call rather than rebuild:**

| Manage needs | Already exists |
|---|---|
| Identity, login, OAuth, mobile sessions | `@asaplocal/auth`, `User`, `Account`, `Session`, `MobileSession` |
| Find tradespeople, get quotes | `createJobRequestWithLead()`, `findEligibleProviders()` in `packages/core/src/lead-marketplace.ts`; `JobRequest` → `Lead` → `LeadAccess` → `Quote` |
| Booking, deposit, work log, sign-off, variations, disputes | `Booking`, `JobSheetEntry`, `BookingVariation`, `BookingDispute`, `packages/core/src/stripe-connect.ts`, `booking-balance.ts` |
| Invoices | `packages/core/src/invoice.ts`, `Payment` |
| Contractor vetting | `Business` + `trust-tier.ts` (Bronze → Platinum), `InsurancePolicy` with expiry, `Qualification`, `category-access.ts` gates |
| Messaging | `Conversation`, `ConversationParticipant`, `Message`, Pusher real-time |
| Notifications | `notify(userId, type, title, body?, link?)` in `packages/core/src/notify.ts` → DB row + Pusher + push; `email.ts`, `sms.ts` |
| Uploads | `createPresignedUpload()` in `packages/core/src/s3.ts` (MIME + size validated, UUID keys) |
| Audit | `writeAuditLog()` in `packages/core/src/audit.ts`, `AuditLog` model |
| Rate limiting | `createRateLimiter()` / `checkRateLimit()` in `packages/core/src/rate-limit.ts` |
| Subscriptions | `Subscription` model + Stripe (provider plans) |

---

## 3. Where ASAP Manage lives

```
apps/
  manage/                 NEW — Next.js 15 App Router, same setup as apps/web
    app/
      (auth)/             sign-in / org switcher (reuses @asaplocal/auth)
      (workspace)/        landlord + agency staff — one route group, permission-driven
      (renter)/           renter portal, mobile-first
      api/                route handlers: parse → authorise → call service → respond
    components/           Manage-specific UI composed from @asaplocal/ui
    middleware.ts
packages/
  manage/                 NEW — server-only Manage domain
    src/
      services/           PropertyService, TenancyService, RentService, MaintenanceService, ...
      policies/           canViewProperty(), canManageMaintenance(), ...
      integrations/
        local-marketplace/  LocalMarketplaceService interface + in-process adapter + mock
      validations/        zod schemas
      events/             domain events → notifications / tasks / audit
  db/prisma/schema.prisma Manage models added in a clearly delimited section
```

Rules:
- Business logic lives in `packages/manage`, never in React components or route
  handlers. Route handlers stay thin, following the pattern of the existing apps.
- The admin console for Manage lives in the existing `apps/admin` (new nav
  section, permission-gated). Do not build a second admin app.
- A native renter app is a later phase. Phase 1 renter experience is responsive
  web (the existing PWA pieces — `InstallAppBanner`, `RegisterServiceWorker` —
  can be reused).
- Admin, landlord and agency roles are served by one Manage app with permissions,
  not separate apps.

---

## 4. Gaps the shared platform must close first

These do not exist today and Manage depends on them. Each is an additive change
to a shared package; propose each one before implementing it.

1. **Organisations and memberships.** Today `User.role` is a single enum
   (`CUSTOMER | PROVIDER | DISPATCHER | ADMIN`) and a provider's "organisation"
   is `Business`, whose `StaffMember`s are not `User`s. Manage needs
   `Organisation` (type `LANDLORD | AGENCY`), `OrganisationMember` (user + org +
   role), and an active-organisation context in the session. Leave `User.role`
   and `Business` untouched — Manage membership is a separate dimension.
2. **Private documents.** `createPresignedUpload()` returns a permanent public
   S3 URL. Tenancy agreements, ID documents and certificates must not be
   reachable that way. Add a private bucket (or private prefix with a
   bucket policy that blocks public reads), store the object **key** not a URL, and serve every
   read through an authorised, short-lived signed GET.
3. **Audit log scope.** `AuditLog` has no organisation and no before/after
   values. Add nullable `organisationId`, `before` and `after` (JSON) so the
   existing apps keep working unchanged.
4. **Notification types.** `NotificationType` is an enum geared to the
   marketplace. Add Manage event types; route all Manage notifications through
   a Manage NotificationService that calls the existing `notify()`, `email.ts`
   and `sms.ts`.
5. **Tests.** The repo has no test suite. Set up Vitest (unit + integration
   against a disposable Postgres) and Playwright (e2e) in Phase 1, wired into
   `turbo run test`.
6. **Soft delete.** Introduce `deletedAt` on Manage entities where records must
   be retained (tenancies, rent ledger, documents, audit-relevant records) and
   filter it in repositories. Do not retrofit it onto existing models.

---

## 5. Users and roles

Four kinds of people use Manage. These are **membership types, not user
accounts** — one login can hold several (a person may be a property manager at
an agency, a landlord in their own right, and a renter elsewhere).

**Landlord** — an organisation of type `LANDLORD`, usually one or two members.
Manages one to many properties: tenants, tenancies, rent, deposits,
maintenance, contractors, inspections, compliance, documents, expenses.
Dashboard answers *"what needs my attention?"*: rent due/overdue, vacant units,
open maintenance, expiring compliance, upcoming inspections and tenancy events,
monthly income vs expenses, open tasks.

**Agency** — an organisation of type `AGENCY` managing properties on behalf of
many landlords. Member roles: `OWNER`, `PROPERTY_MANAGER`, `LETTINGS_MANAGER`,
`MAINTENANCE_MANAGER`, `FINANCE`, `STAFF`. Agency staff may be restricted to
assigned properties. Landlord clients of an agency get a read-mostly view of
their own properties.

**Renter** — linked to a tenancy, not to an organisation's staff. Mobile-first.
Sees their home, tenancy, rent balance and history, documents shared with them,
maintenance requests and status, appointments, messages, key contacts. Can
report maintenance (description, photos/video, urgency, access instructions),
message the landlord/agent, update their own contact details, and pay rent once
payments are enabled.

**Contractor** — an ASAP Pro `Business` working a maintenance job, or an
external contractor the organisation brings. ASAP Pro businesses act inside the
provider app; Manage never gives them a separate login.

**Platform admin** — existing `User.role = ADMIN`, extended with explicit
Manage permissions (e.g. `manage.org.view`, `manage.org.restrict`,
`manage.document.view`). Admin access to an organisation's records is
permission-gated and always audited — no blanket read-all by default. The
existing `DISPATCHER` role gets no Manage access unless explicitly granted.

---

## 6. Multi-tenancy and authorisation

- Every organisation-owned row carries `organisationId`. Repositories take the
  organisation from the **server-side session context**, never from the request
  body or URL alone.
- Central policy functions in `packages/manage/src/policies`, for example
  `canViewProperty`, `canEditProperty`, `canViewTenancy`, `canViewRent`,
  `canManageMaintenance`, `canAssignContractor`, `canViewDocument`,
  `canManageOrganisation`, `canManageBilling`. Every route handler and server
  action calls one before touching data. Hiding a control in the UI is never the
  check.
- Required guarantees, each covered by tests:
  a renter sees only their own tenancies; a landlord never sees another
  organisation's portfolio; agency staff see only what their role and
  assignment allow; a contractor sees only jobs assigned to them; admins need an
  explicit permission and leave an audit entry.
- Never trust client-supplied organisation IDs, property IDs, tenant IDs, money
  amounts, ownership percentages, roles or permissions.

---

## 7. Domain model

Design these as a relational model. Items marked *(enum)* or *(derived)* are not
tables.

**Organisation and people:** `Organisation` (type LANDLORD/AGENCY),
`OrganisationMember` (role), `OrganisationInvite`, `LandlordClient` (an
agency's landlord client — links an agency org to a landlord org or an
unregistered owner), `Renter` (profile tied to a `User` once they accept an
invite).

**Property:** `Property` → optional `Building` → `Unit`. A simple landlord
with one house has one property and one implicit unit; the UI hides the levels
they don't need. `Property.jurisdiction` *(enum: ENGLAND, WALES, SCOTLAND,
NORTHERN_IRELAND)* — rules differ by nation (see §8). `PropertyOwner` supports
multiple owners with ownership percentages (basis points, must sum to 10000).
Property types: house, flat, HMO, block; commercial later.

**Tenancy:** `Tenancy` (unit, type, dates, rent terms, status), `TenancyTenant`
(many renters per tenancy, lead tenant flag), `TenancyEvent` (append-only
history of state transitions), `Deposit` (amount, protection scheme, reference,
protected date).

**Money:** `RentSchedule` → `RentCharge` (each due amount), `RentPayment`
(received, possibly partial, allocated to charges), rent balance *(derived)*,
`Expense`, `Income`, links to existing `Payment` / invoices for maintenance
costs. All amounts in integer pence.

**Maintenance:** `MaintenanceRequest` (from a renter or staff), `MaintenanceJob`
(the managed work, may link to a marketplace `JobRequest` and `Booking`),
status and priority *(enums)*, `Contractor` (either a reference to an ASAP Pro
`Business` or an external contractor record).

**Compliance, inspections, documents:** `ComplianceRequirementType`
(configurable catalogue), `ComplianceRequirement` (per property/unit, status,
expiry, responsible party), `Inspection` → `InspectionRoom` → `InspectionItem`
(condition, notes, photos), `Document` (object key, type, owner entity,
expiry, visibility), `DocumentFolder`.

**Work and communication:** `Task` (polymorphic owner, assignee, due, priority,
status), `Appointment`. Messaging reuses the existing `Conversation` /
`Message` models, extended with optional Manage context (property, tenancy,
maintenance job).

**Platform:** audit via the extended `AuditLog`; Manage billing as a separate
`ManageSubscription` / plan abstraction (the existing `Subscription` is for
provider plans — don't overload it); `SupportTicket`.

---

## 8. Tenancies — model UK reality, don't assume it

v1 assumed fixed-term tenancies with an end date and renewals. That no longer
fits:

- **England:** the Renters' Rights Act 2025 moves most private tenancies to
  rolling periodic tenancies and ends section 21 "no-fault" evictions.
  **Verify the current commencement status before designing flows around it.**
- **Scotland** already uses open-ended private residential tenancies; **Wales**
  uses occupation contracts; **Northern Ireland** has its own regime.

Therefore:
- `endDate` is nullable; a periodic tenancy has no end date until notice is
  served.
- Statuses: `DRAFT`, `ACTIVE`, `NOTICE_GIVEN`, `ENDING`, `ENDED`, `CANCELLED`.
  "Renewal" and fixed terms exist only where the jurisdiction allows them.
- Transitions happen only through `TenancyService` methods that validate the
  move and write a `TenancyEvent` + audit entry. Nothing sets a status field
  directly.
- Deposits record the protection scheme and reference; reminders for
  protection deadlines come from the compliance engine, not hard-coded logic.
- The application states no legal requirement as fact unless it comes from the
  configurable rule catalogue, and that catalogue is reviewed by someone
  qualified before launch.

---

## 9. Rent and money

- Rent is a ledger: schedules generate charges; payments are recorded and
  allocated; balances, arrears and statements are derived. Never a single
  `rentAmount` field on a tenant.
- Support monthly, weekly and custom schedules, part payments, missed payments,
  payment references.
- **v1 records payments; it does not collect them.** Collecting rent on behalf
  of landlords (client money, safeguarding, agent regulation) is a regulated
  activity — design the `PaymentProvider` abstraction, but ship online rent
  collection only after a compliance decision.
- Financial reporting (income, expenses, net per property, collected vs
  outstanding, maintenance spend) comes later, built on the same ledger. Not
  full accounting software.

---

## 10. Maintenance — the flagship workflow

This is the first end-to-end workflow to ship and the main reason Manage belongs
in this ecosystem.

```
Renter reports issue (description, photos/video, urgency, access notes)
  → MaintenanceRequest
Landlord / agency reviews: ask a question, reject, or approve
  → MaintenanceJob
Choose a route:
  a) Known contractor (external or a specific ASAP Pro business) → assign directly
  b) Find a pro → LocalMarketplaceService.createJob()
       → existing lead marketplace: JobRequest → Lead → up to 5 providers
       → providers quote in ASAP Pro (existing Quote flow)
Manager approves a quote → existing Booking (deposit, schedule)
Provider works the job in ASAP Pro (JobSheetEntry, variations, sign-off)
Completion + invoice flow back
  → MaintenanceJob closed, cost recorded as Expense, invoice stored as Document
  → permanent entry in the property's history
```

**Integration boundary.** Manage talks to the marketplace only through a
`LocalMarketplaceService` interface in `packages/manage/src/integrations`:
`createJob`, `getJobStatus`, `listQuotes`, `acceptQuote`, `getBooking`,
`getProvider`, plus inbound events (`quote.received`, `booking.confirmed`,
`booking.completed`, `invoice.issued`). Provide:
- an **in-process adapter** that calls `@asaplocal/core` functions directly
  (same database — no HTTP hop is needed today), and
- a **mock adapter** for tests and local development.

Keep the interface narrow enough that an HTTP adapter could replace the
in-process one if Manage is ever split out.

**Minimal changes on the marketplace side** (additive, reviewed separately):
- `JobRequest` gains an optional origin link (e.g. `source = MANAGE`,
  `manageMaintenanceJobId`) so a marketplace job knows it belongs to a managed
  property.
- The poster is the property manager's `User`, acting for their organisation.
  Decide and document who pays the booking deposit.
- The renter's name, phone and access instructions reach the provider only
  after booking, never in the lead. The existing 100–400 m pre-purchase location
  blur stays.
- Status changes on `Quote` / `Booking` emit events Manage can subscribe to,
  instead of Manage polling marketplace tables.

**Resolve these before building route (b):**
1. Should a managed-property job bypass lead purchase (e.g. invite-only quotes
   from the org's preferred contractors), or go through the normal paid-lead
   market?
2. Who is the "customer" for review and sign-off purposes — the manager or the
   renter who lets the tradesperson in?
3. Can the renter see quotes and costs? (Default: no.)

---

## 11. Supporting domains (brief — expand when their phase starts)

- **Compliance:** configurable requirement catalogue (gas safety, electrical,
  EPC, smoke/CO alarms, licensing, insurance, custom), per property/unit, with
  status `COMPLIANT | EXPIRING | EXPIRED | MISSING | NOT_APPLICABLE |
  UNDER_REVIEW`, responsible party and reminder schedule. Nightly job computes
  statuses and raises tasks + notifications.
- **Documents:** private storage (§4), attached to any Manage entity, with
  type, expiry, visibility (e.g. shared-with-renter), preview for images/PDF.
  Reuse the upload MIME/size validation in `s3.ts`.
- **Inspections:** move-in, periodic, move-out, maintenance, custom; room →
  item → condition → photo → comment; generates a report document.
- **Messaging:** reuse `Conversation`/`Message`/Pusher; add Manage context and
  participant rules (landlord↔renter, agency↔renter, agency↔landlord,
  manager↔contractor), attachments via private documents, system messages.
- **Tasks:** generic `Task` raised by domain events (certificate expiring, rent
  overdue, quote awaiting approval…) or created manually.
- **Notifications:** Manage NotificationService → existing `notify()` / email /
  SMS / push. No sending from components or route handlers.
- **Search:** PostgreSQL search behind a `SearchService`, always scoped by
  organisation and policy.
- **Billing:** Manage SaaS plans behind a `BillingService`; pricing (per
  property/unit/feature) is configuration, not code. Stripe via the existing
  integration.

---

## 12. Design system — reuse, don't invent

ASAP Manage must look like another ASAP product. Source of truth:
`packages/ui/tailwind.preset.js`, `apps/web/app/globals.css`, `packages/ui/src`.

- **Colour:** `brand` terracotta scale (primary `brand-500 #c15f2a`, actions
  typically `brand-600`), `espresso` warm neutrals, semantic CSS variables
  `--background`, `--surface`, `--foreground`, `--muted`, `--border` with a
  class-based dark mode. No new palette unless something is genuinely missing
  (e.g. a status colour) — propose it first.
- **Type:** Inter via `--font-inter`.
- **Shape:** `rounded-xl` / `rounded-2xl`, `shadow-card`, `shadow-accent`.
- **Components:** everything from `@asaplocal/ui`; icons from lucide-react.
  Copy the existing apps' patterns for headers (`TopBar`), mobile bottom
  navigation (`BottomNav` / `BottomNavNotched`), loading (`Skeleton`), dialogs
  and sheets, notification bell, badges for status.
- **New patterns only where Manage genuinely needs them:** portfolio tables,
  rent ledger, compliance board, inspection checklist, maintenance timeline.
  Build them from existing primitives; if one is broadly useful, add it to
  `@asaplocal/ui` rather than to `apps/manage`.
- **Responsive:** staff screens are desktop-first but must work on a tablet; the
  renter portal is phone-first. Design each separately — don't shrink the
  desktop layout.

The first task is understanding and reusing this language, not designing a
new dashboard.

---

## 13. Security and privacy

Follow the patterns the existing apps already use: zod validation on every
input, server-side permission checks in every mutating route (never
middleware alone), rate limiting on auth and write-heavy endpoints, CSRF
helpers in `packages/core/src/csrf.ts`, Stripe webhook signature checks.

Manage additionally requires: organisation isolation tested against IDOR;
private documents via signed URLs only; UK GDPR data minimisation; retention
and deletion rules per entity (extending the existing account-deletion flow in
`packages/core/src/account-deletion.ts`); audit entries for rent edits, tenancy
transitions, document deletion, property transfers, permission changes,
maintenance reassignment and refunds.

---

## 14. Testing

Priorities, in order: organisation isolation and every policy function; rent
ledger calculations (part payments, arrears, allocation); tenancy state
transitions; maintenance workflow including the marketplace adapter (mock and
in-process); document access; compliance status computation; audit entries.

E2E journeys (Playwright):
- **Landlord:** create property → invite renter → create tenancy → add rent
  schedule → receive maintenance request → create job → get quotes → approve →
  complete → record invoice.
- **Renter:** accept invite → view home and tenancy → report maintenance with
  photo → receive update → see completion.
- **Agency:** create organisation → invite staff with a restricted role → add
  landlord client → add property and tenancy → staff member sees only assigned
  properties.

---

## 15. Seed data

Add `packages/db/prisma/seed-manage.ts` (follow the pattern of
`seed-builders-category.ts`) — never mixed into production code paths. Include
the agency **Northside Property Management** with 2–3 landlord clients, 10+
properties with mixed units, tenancies that are active, periodic, notice-given
and ended, maintenance at every status, compliance that is valid, expiring,
expired and missing, and rent that is paid, partial and overdue. Mark every
seeded record as demo data so it can be identified and removed.

---

## 16. Environments and deployment

- New Vercel project for `apps/manage`, mirroring the web/provider projects;
  Preview → Supabase **staging**, Production → Supabase **prod**.
- Migrations are applied to local and staging only. Production migrations need
  explicit sign-off.
- A clean `tsc --noEmit` is not enough: `next build` must pass for
  `apps/manage` **and** the existing apps after every shared-package change.
- New environment variables (private documents bucket, Manage app URL, any
  feature flags) are added to `.env.example` and both Vercel environments.

---

## 17. Phases

v1 put rent before maintenance while calling maintenance the first end-to-end
workflow. The order below fixes that.

| Phase | Scope |
|---|---|
| 0 — Decisions | Confirm §3 layout, §4 platform changes, §10 open questions. **Checkpoint.** |
| 1 — Foundation | `apps/manage` scaffold on the shared design system, organisations + memberships + active-org session, policy layer, private documents, audit extension, test harness, seed |
| 2 — Properties | Property / building / unit, ownership, landlord clients, property workspace shell |
| 3 — Tenancies | Renters and invites, tenancy lifecycle with jurisdiction rules, deposits, tenancy documents, renter portal (read-only) |
| 4 — Maintenance | Renter reporting, triage, direct assignment, LocalMarketplaceService (mock → in-process), quotes, booking, completion, invoice to property history |
| 5 — Rent | Schedules, charges, payment recording, arrears, statements, reminders |
| 6 — Compliance | Requirement catalogue, expiry tracking, reminders, compliance board |
| 7 — Inspections | Checklists, photos, reports |
| 8 — Communication | Manage-context conversations, notification preferences, tasks |
| 9 — Financials | Income/expense, per-property reporting |
| 10 — Billing | Manage SaaS plans; online rent collection only after the compliance decision in §9 |

The property workspace (overview, units, tenancies, rent, maintenance,
inspections, compliance, documents, financials, messages, activity) fills in
tab by tab as each phase lands. Don't ship empty tabs.

---

## 18. First deliverable — then stop

Do **not** generate application code yet. Produce, in one document:

1. **Assessment.** Confirm or correct every fact in §2, and list anything in
   the codebase that changes this plan.
2. **Decisions** for §3 (layout), §4 (each platform change, with migration
   impact on existing apps) and §10 (the three open questions, with a
   recommendation for each).
3. **Draft Prisma models** for Phase 1–3 entities, following §2 conventions.
4. **Permission matrix:** membership role × action, plus admin permissions.
5. **LocalMarketplaceService contract:** TypeScript interface, events, and the
   exact additive changes to marketplace models.
6. **Initial routes** for `apps/manage` (workspace and renter portal).
7. **Environment variables** to add.
8. **Test plan** for Phase 1.

Then wait for review. Begin Phase 1 only after the decisions are approved.

---

## 19. Rules

- Inspect before assuming; cite file paths for claims about existing code.
- Extend `@asaplocal/*` packages instead of creating competing versions; keep
  every shared change backwards-compatible.
- No business logic in components; no data fetching scattered through
  components — go through services.
- No fake integrations presented as real. Mocks are explicit adapters, selected
  by configuration.
- No hard-coded demo data in production code paths.
- No legal claims in the product without a reviewed rule behind them.
- Do not touch the behaviour of ASAP Local, ASAP Pro or the admin console
  beyond the reviewed, additive changes listed here.
