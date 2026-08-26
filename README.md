# Aalmaram Health — Pre-Journey MVP

**Live:** https://aalmaram-health.vercel.app

A working product for the **Pre-Journey** half of Aalmaram Health: an internal team
member records a client's intake, curates Kerala health, wellness and heritage
components into a dated itinerary, generates a What-to-Expect report, and
publishes it; the client opens a secure personal link, reads the proposal, and
either approves it or asks for changes.

Two interfaces over one canonical data model:

- **Admin** (`/admin`) — dense, operational, for the Aalmaram team.
- **Client portal** (`/trip`) — calm and editorial, showing only presentation-safe data.

Booking, vendor confirmation, live trip coordination and post-journey history are
deliberately **out of scope** (see [Known limitations](#known-limitations)).

---

## Quick start

Requires **Node 20+**. No Docker or system PostgreSQL needed — a real PostgreSQL
server is downloaded and run for you.

```bash
npm install
cp .env.example .env
npm run db:start      # leave running: starts PostgreSQL on port 5433
```

In a second terminal:

```bash
npm run db:migrate && npm run db:seed && npm run dev
```

Open <http://localhost:3000> and sign in.

### Demo account

| Field    | Value                |
| -------- | -------------------- |
| Email    | `admin@aalmaram.test` |
| Password | `Aalmaram!Demo1`      |

Development credentials only, created by the seed from `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD`. Never set those variables in production.

### Seeing the client portal locally

The client's link is emailed. In development the email transport prints to the
server console and appends to `.mail.log`. To try the portal:

1. Open a client → **Portal access** → *Send invitation link*.
2. Copy the `/trip/access/<token>` URL from the terminal or `.mail.log`.
3. Open it in a private window. Publishing a proposal also issues a link
   automatically if the client has never been invited.

All seeded vendors, components and clients are **fictional** and suffixed
`(demo)`.

---

## Commands

| Command                | What it does                                              |
| ---------------------- | --------------------------------------------------------- |
| `npm run db:start`     | Start local PostgreSQL (foreground; Ctrl+C stops it)      |
| `npm run db:stop`      | Stop it                                                    |
| `npm run db:migrate`   | Create/apply migrations (development)                      |
| `npm run db:deploy`    | Apply existing migrations (production)                     |
| `npm run db:seed`      | Load demo data                                             |
| `npm run db:reset`     | Drop, re-migrate and re-seed                               |
| `npm run dev`          | Development server on :3000                                |
| `npm run build`        | Production build (runs `prisma generate` first)            |
| `npm start`            | Serve the production build                                 |
| `npm run typecheck`    | TypeScript, no emit                                        |
| `npm test`             | Unit + integration (Vitest)                                |
| `npm run test:e2e`     | End-to-end (Playwright)                                    |

---

## Architecture

Single full-stack Next.js App Router application. No microservices, no separate
API — Server Components read, Server Actions write.

```
src/
  app/
    admin/…            Admin screens; one actions.ts per domain area
    trip/…             Client portal (+ /trip/access/[token] route handler)
    login/…            Admin authentication
    middleware.ts      no-store headers for /admin and /trip
  domain/              Business logic, framework-free and unit-testable
    itineraries/       status machine, validation, pricing, queries, client projection
    reports/           What-to-Expect generation
    components/        component search shared by admin + builder
    shared/            calendar-date helpers
  lib/
    auth/              password hashing, JWT sessions, guards, portal tokens
    services/          activity log, email, recommendation stub
    validation/        Zod schemas + the Server Action wrapper
  components/ui/       Accessible primitives (button, field, table, badge…)
prisma/                schema.prisma, migrations, seed.ts
tests/                 unit/ integration/ e2e/
```

### Decisions worth knowing

**Domain logic is separate from the framework.** `validateItineraryForPublication`,
the status machine, pricing and report generation take plain objects and return
plain objects. They are unit-tested without a database, and the same validator
powers both the "why can't I publish?" panel and the publish action itself.

**Every write goes through one wrapper.** `runAction()` parses `FormData` with a
Zod schema, converts failures into field-level messages, maps unique-constraint
violations to readable text, and logs technical detail server-side only. No
Server Action trusts client input; the actor always comes from the session.

**Actions report where to go; the client navigates.** Server Actions return
`FormState.redirectTo` and `useActionRedirect` performs the navigation once the
action has settled. This is a deliberate departure from calling `redirect()`
inside the action — see [Known limitations](#known-limitations).

**Draft/published separation is explicit.** An itinerary is only visible to the
client in `PUBLISHED`, `CHANGES_REQUESTED` or `APPROVED`. Editing is only allowed
in `DRAFT` or `READY_FOR_REVIEW`, and those two sets never overlap (there is a
unit test asserting exactly that). To revise a live proposal the admin must pull
it back to Draft, which removes it from the client's view while it is being
changed — the client never sees a half-edited itinerary.

**The client portal renders a projection, not the model.** `loadClientItinerary`
selects only presentation-safe fields. Internal notes, admin notes, cost status,
source records and vendor contact details are never fetched, so they cannot leak
through a careless template edit later. An integration test asserts their absence.

**Prices are `Decimal` end to end.** No float arithmetic; `0.10 + 0.20` is
exactly `0.30`, and there is a test for it.

---

## Database

PostgreSQL via Prisma. Migrations live in `prisma/migrations`.

| Entity            | Purpose                                                              |
| ----------------- | -------------------------------------------------------------------- |
| `User`            | Internal admin. `ADMIN` role only for now.                            |
| `Vendor`          | A provider. May supply components across several modules.             |
| `Module`          | Top-level category (Health & Medical, Wellness & Spa, Heritage…).     |
| `Catalogue`       | Sub-grouping inside one module.                                       |
| `Component`       | The granular sellable unit. One vendor, one catalogue.                |
| `Client`          | Contact, trip window, intake, and the hashed portal token.            |
| `Itinerary`       | One proposal for one client, with a lifecycle status.                 |
| `ItineraryItem`   | A component **proposed** for a date — not a confirmed appointment.    |
| `Report`          | The What-to-Expect document. One per itinerary.                       |
| `ChangeRequest`   | A client's request, optionally about one item.                        |
| `ActivityLog`     | Lightweight audit trail.                                              |

```
Module 1─n Catalogue 1─n Component n─1 Vendor
                              │
Client 1─n Itinerary 1─n ItineraryItem
              │  1─1 Report
              └─ 1─n ChangeRequest ──0..1 ItineraryItem
```

Notes:

- **A component's module is derived through its catalogue.** There is no
  duplicate `moduleId` column, so the hierarchy has a single source of truth.
- **Inventory cannot be deleted out from under a proposal.** Module→Catalogue,
  Catalogue→Component, Vendor→Component and ItineraryItem→Component are
  `RESTRICT`. Deleting an itinerary cascades to its items, report and change
  requests; the components themselves survive.
- **`ChangeRequest.itineraryItemId` is `SET NULL`,** so removing an item keeps
  the client's message rather than destroying it.
- **`Client.accessTokenHash` is unique** — only a SHA-256 digest is stored, never
  the token itself.
- `tripDuration` is derived on write so lists can sort on it cheaply.

### Itinerary lifecycle

```
DRAFT ──► READY_FOR_REVIEW ──► PUBLISHED ──► APPROVED
  ▲                │               │
  └────────────────┴───────────────┴──► (back to DRAFT to edit) ──► re-publish
                                  └──► CHANGES_REQUESTED ──► DRAFT ──► re-publish
```

Publishing runs the full validation suite and refuses on any failure, listing
every problem. Nothing is silently repaired. It checks: a client exists, a title
and both trip dates are set, the end date is not before the start, at least one
item exists, every item references an existing **active** component, every item
has a proposed date, and every date falls inside the trip window.

---

## Security and privacy

- **Admin auth** — bcrypt (cost 12), HS256 JWT in an `httpOnly`, `SameSite=Lax`
  cookie (`secure` in production), 8-hour expiry. Login failures are generic and
  timing-equalised so the form cannot enumerate accounts. Rate limited per IP and
  per account.
- **Client portal auth** — a 32-byte CSPRNG token delivered by email. Only its
  SHA-256 hash is stored, so a database read yields no working links. The token
  is exchanged for a session cookie and immediately dropped from the URL, keeping
  it out of history and `Referer`. Links expire after 60 days; re-issuing
  invalidates the previous one.
- **Ownership is proved server-side, always.** The portal derives `clientId` from
  the session and never from the URL. Itinerary and item ids arriving from the
  browser are re-checked against that client. *Client A cannot reach Client B's
  itinerary* — covered by integration tests in both directions.
- **CSRF** — Next.js Server Actions verify Origin/Host; cookies are `SameSite=Lax`.
- **Report content is sanitised.** The Markdown renderer escapes all HTML first,
  then re-introduces a fixed tag whitelist, so admin-authored text cannot inject
  script into the client portal.
- **Privacy** — intake asks only what curation needs; it is not a medical record.
  The logger redacts intake fields, tokens and message bodies. The audit log
  stores ids, counts and status names — never intake text or change-request
  messages. `/admin` and `/trip` responses are `no-store`.
- **No secrets in the repo.** `.env` is gitignored; `.env.example` documents every
  variable.

---

## Testing

All figures below are from an actual run on this machine.

| Suite                     | Result                        |
| ------------------------- | ----------------------------- |
| Unit + integration (Vitest) | **103 passed** (7 files)    |
| End-to-end (Playwright)     | **2 passed**                |
| `tsc --noEmit`              | clean                       |
| `next build`                | succeeds                    |

**Unit** — itinerary validation (every rule, plus boundary dates and the
"all items removed" case), status transitions and the editable/visible
invariant, pricing with `Decimal` (overrides, removed items, mixed currencies),
calendar-date helpers, report generation (including that it makes no medical
claim), Markdown XSS escaping, portal-token generation/hashing/expiry, password
hashing, and rate limiting.

**Integration** (real PostgreSQL) — client creation and derived duration, unique
email, module-through-catalogue derivation, `RESTRICT` and cascade behaviour,
publication blocked for an empty itinerary / out-of-range date / deactivated
component, pricing totals, report generation from stored data, the full
publish → change request → withdraw → revise → republish → approve cycle with
its audit trail, and the authorization suite (cross-client access returns null,
drafts are invisible, unpublished reports are hidden, internal fields never
appear in the client projection, token hashes are unique).

**End-to-end** — the golden path, in one test:

> admin signs in → creates a client with intake → creates an itinerary →
> searches the library and adds components from **three different modules** →
> is blocked from publishing while items lack dates → schedules each item →
> reviews pricing (€312.00) → generates the What-to-Expect report → edits it →
> publishes → **client** opens the emailed `/trip/access/<token>` link → reads
> the overview, day-by-day itinerary and report → sees no internal data →
> an unauthenticated visitor and a forged token are both turned away →
> client requests a change to a specific item → **admin** sees the request and
> which item it refers to → withdraws to Draft → changes the date → resolves the
> request → republishes → **client** sees the revision and approves →
> status is `APPROVED`, the client is `CONFIRMED`, and the activity feed shows
> created / published / withdrawn / republished / approved.

A second E2E test covers inventory administration: vendor CRUD, activate and
deactivate, catalogue creation, component creation with tags and price,
deactivation warning, list filtering, and module reordering.

Run them:

```bash
npm run db:start   # in another terminal
npm test
npm run test:e2e
```

The E2E suite uses its **own** database (`aalmaram_e2e`), created, migrated and
reseeded on every run, so it never touches development data. The unit/integration
suite truncates the development database — re-run `npm run db:seed` afterwards.

---

## Deployment

**Currently deployed on Vercel** at https://aalmaram-health.vercel.app, with a
Neon Postgres database provisioned through the Vercel Marketplace and
`DATABASE_URL` injected automatically. Pushing to `main` redeploys.

Production admin credentials are **not** in this repository — the demo password
below is for local development only.

The app is a standard Next.js server application; anywhere that runs Node 20+
works (Vercel, Fly, Render, a container).

1. **Provision PostgreSQL** and set `DATABASE_URL`.
2. **Set environment variables** (see `.env.example`):
   - `DATABASE_URL`
   - `SESSION_SECRET` — 32+ random characters:
     ```bash
     node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
     ```
   - `APP_URL` — the public origin; invitation links are built from it.
   - `EMAIL_TRANSPORT=log` until a provider is wired in, plus `EMAIL_FROM`.
   - Do **not** set `SEED_ADMIN_*`.
3. **Migrate**: `npm run db:deploy` (never `migrate dev` in production).
4. **Build and start**: `npm run build && npm start`.
5. **Create the first admin.** There is no public sign-up. Either run the seed
   once against a staging database, or insert a user with a bcrypt hash:
   ```bash
   node -e "require('bcryptjs').hash(process.argv[1],12).then(console.log)" 'your-password'
   ```

Environment misconfiguration fails fast at boot with a readable message rather
than at the first request.

### Before real clients

- Wire a real email provider (implement `SmtpTransport` in
  `src/lib/services/notifications.ts` — the call sites do not change).
- Change `opsInbox()` in `src/app/trip/actions.ts` from the placeholder address.
- Replace the in-process rate limiter with a shared store if you run more than
  one instance.
- Decide whether clients should see prices (`SHOW_PRICES_TO_CLIENT`, currently
  `false`).

---

## Known limitations

Honest list of what is deliberately absent or imperfect.

**Deliberately out of scope (MVP boundary).** No vendor portal or self-service,
no automated booking or appointment scheduling, no live journey coordination, no
post-journey history or longitudinal record, no AI recommendations, no payments,
no multi-tenancy, no complex RBAC, no native apps. `ItineraryRecommendationService`
exists as an interface with a null implementation that production never calls —
the human admin is the recommendation engine, on purpose.

**Post-action navigation is a full page load.** Next's client-side router did not
reliably complete transitions started from a Server Action in this stack: the
write would commit and the server would serve the destination while the browser
sat on the old screen with the button stuck on "Saving…". `revalidatePath`,
`router.refresh()` and `redirect()` inside an action were all affected, and it was
intermittent — which is worse than consistently broken, because an admin could be
looking at a stale itinerary without knowing. Every mutation therefore returns a
destination and the client navigates with `window.location.assign`. It costs one
page load per mutation on internal screens, and it is always correct. Worth
revisiting on a future Next.js release; the fix would be localised to
`useActionRedirect`.

**Link prefetching is off in the admin app.** Every admin route runs database
queries, and prefetching a screen like the itinerary builder (one link per
catalogue entry) fired dozens of speculative renders that competed with real work.

**Single-currency assumption.** Totals add raw amounts. A mixed-currency itinerary
is flagged in the UI rather than converted.

**The component library is loaded whole** (capped at 500 active components) and
filtered in the browser. Right for an MVP catalogue of tens to low hundreds;
revisit if the catalogue grows large.

**Catalogue status is changed on its edit form**, not inline in the list, unlike
Modules. **No pagination** on list views. **No soft delete** — records are
deactivated, never removed. **Notifications are fire-and-forget**: a mail failure
is logged and never fails the operation that triggered it, so a publish always
succeeds even if email is down. **Report versioning** does not exist — regenerating
overwrites admin edits (with a confirmation prompt).

**Local database convenience.** `embedded-postgres` is a development aid only.
Production points `DATABASE_URL` at a managed instance.

---

## Recommended Phase 2

Based on what this MVP actually does, not speculation:

1. **Vendor confirmation tracking.** The gap between "proposed" and "confirmed"
   is the biggest manual burden. The model already separates them
   (`ItineraryItem.status`) — add a `Booking`/`Appointment` domain beside it
   rather than overloading the item.
2. **Real email plus a delivery record.** Swap `LogTransport` for a provider and
   store what was sent to whom and when; today it is fire-and-forget.
3. **Itinerary duplication / templates.** After a handful of clients the team will
   be rebuilding similar journeys by hand. "Duplicate this itinerary" is cheap
   and immediately useful.
4. **Report versioning.** Keep prior published versions so a client can be told
   exactly what changed between revisions.
5. **A change-request conversation.** One message per request is enough today,
   but a thread will be wanted before an internal messaging system is.
6. **Sharper pricing.** Per-person vs per-group units, optional items, and a
   decision on what the client sees.
7. **Only then, matching.** Once there are real itineraries, historical selections
   become training signal for `ItineraryRecommendationService` — which is why
   components already carry tags, structured descriptions and a catalogue.
