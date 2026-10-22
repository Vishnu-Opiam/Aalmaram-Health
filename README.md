# Aalmaram Health

**Live:** https://aalmaram-health.vercel.app (deploys from `main`)

Aalmaram Health brings clients (mostly international, 50+) to Kerala for
preventive health care, with wellness and culture woven around it. The team
fixes the **health core** of a trip; the client builds the rest in a
drag-and-drop itinerary that shows the cost as they go, with AI suggestions;
then confirms. Domain model: [`docs/platform/class-diagram.md`](docs/platform/class-diagram.md).

Two interfaces over one data model:

- **Admin** (`/admin`) — for the team: what we offer (modules → catalogues →
  vendors with branches and practitioners → components), clients, trips,
  requirements, conversations, the health-core builder, the Feed and AI runs.
- **Client portal** (`/trip`) — large and simple: **Feed**, **Itinerary**
  (builder + confirm), **Calendar**, **Chat** (AI assistant, "talk to a person").

Payment, booking and in-trip features come next (PLAN.md Phases 5–8).

---

## The demo in five minutes

1. Sign in at `/login` (`admin@aalmaram.test` / `Aalmaram!Demo1`, local only).
2. **Vendors** → *Backwater Diagnostics Centre (demo)*: profile, five branches,
   practitioners, components with duration and price unit. *Thekkady Trail
   Guides (demo)* shows the "missing fields" list.
3. **Trips** → Elena's trip: requirements (40/30/30 mix), the discovery call,
   and the itinerary with her health core. Try **Suggest activities (AI)**.
4. **Clients** → Elena → *Send invitation link*; copy the `/trip/access/…` URL
   from the server console or `.mail.log` and open it in a private window.
5. As Elena: the **Feed**, then **Plan my itinerary** — press **+** on a day,
   pick Culture → Restaurants → a dinner, watch the total; drag a block to
   another day; open **Chat**, answer three questions, **Build my itinerary**;
   finally **Confirm my itinerary**. Back in admin the trip is awaiting payment.

---

## Quick start

Requires **Node 20+** (Node 22+ recommended: the AI SDK targets it). No Docker
or system PostgreSQL needed — a real PostgreSQL server is downloaded and run for you.

```bash
npm install
cp .env.example .env
npm run db:start      # leave running: starts PostgreSQL on port 5433
```

In a second terminal:

```bash
npm run db:migrate && npm run db:seed && npm run dev
```

All seeded vendors, practitioners, components, clients and feed posts are
**fictional** and suffixed `(demo)`.

> **Careful with `.env.local`.** `next dev` loads `.env.local` over `.env`. If a
> Vercel-pulled `.env.local` holds a remote `DATABASE_URL`, the dev server talks
> to that database. Start it with `DATABASE_URL` set explicitly, or keep
> `.env.local` free of database URLs.

---

## Commands

| Command              | What it does                                         |
| -------------------- | ---------------------------------------------------- |
| `npm run db:start`   | Start local PostgreSQL (foreground; Ctrl+C stops it) |
| `npm run db:migrate` | Create/apply migrations (development)                |
| `npm run db:deploy`  | Apply existing migrations (production)               |
| `npm run db:seed`    | Load demo data (idempotent)                          |
| `npm run dev`        | Development server on :3000                          |
| `npm run build`      | Production build (runs `prisma generate` first)      |
| `npm run typecheck`  | TypeScript, no emit                                  |
| `npm test`           | Unit + integration (Vitest) — truncates the dev DB   |
| `npm run test:e2e`   | End-to-end (Playwright) on its own `aalmaram_e2e` DB |

---

## Architecture

Single Next.js App Router application. Server Components read, Server Actions write.

```
src/
  app/admin/…              admin screens; one actions.ts per area (trips, vendors, feed…)
  app/trip/(portal)/…      client portal sections: Feed, Itinerary, Calendar, Chat
  app/trip/access/[token]  portal sign-in link → session cookie
  components/builder/      the itinerary builder, shared by admin and portal
  domain/                  framework-free business logic, unit-tested
    vendors/               profile checklist, durations, price units
    trips/                 status machine, block rules and pricing, module mix,
                           builder view model (the client-safe projection), queries
    ai/                    planner, requirements extraction, chat script, PII, safety
    reports/               What-to-Expect generation
  lib/
    ai/                    generateStructured (AI SDK → Vercel AI Gateway, or fake) + prompts
    services/              itinerary-blocks (all block writes), ai-planning, activity log, email
    auth/ validation/      sessions and guards; Zod schemas + the runAction wrapper
prisma/                    schema, migrations, seed (+ seed-inventory, seed-trips, seed-feed)
tests/                     unit/ integration/ e2e/
```

### Decisions worth knowing

- **One builder, two audiences.** `ItineraryBuilder` renders a client-safe view
  model (`BuilderTrip`) for both staff and client. Permissions are decided
  server-side in `src/lib/services/itinerary-blocks.ts`: staff may change any
  block; a client only their own and the AI's, never the health core, never
  someone else's trip, never a confirmed itinerary.
- **Block times are Kerala wall-clock times** stored as "floating" UTC
  timestamps (09:30 → `09:30Z`, always formatted in UTC).
- **Prices are `Decimal` end to end.** A block costs the component price × its
  unit: per person × travellers, *for two* × ⌈travellers ÷ 2⌉ (restaurants), per
  group × 1. Prices follow the traveller count until the client confirms; then
  they are frozen.
- **Confirm → lock → pay → book.** Confirming sets `Itinerary.confirmedAt` and
  moves the trip to *awaiting payment*; staff can reopen it. Payment and booking
  are not built yet.
- **AI is always a draft.** The AI adds only `AI` blocks labelled *Suggested*,
  around the untouched health core and the client's own choices; the client
  keeps or removes them and must still confirm. See [AI](#ai).
- **Every write goes through `runAction()`** (Zod parsing, readable errors) and
  returns a destination; the browser does a full navigation
  (`useActionRedirect`) because client-side transitions after Server Actions
  were unreliable in this stack.

---

## Data model

Package A, *what we offer*: `Module` 1─n `Catalogue` 1─n `Component` n─1
`Vendor`; `Vendor` 1─n `Branch`, 1─n `Practitioner`; `Component` n─n
`Practitioner`; `FeedPost` 0..1─ `Vendor`.

Package B, *the client's journey*: `User` (staff, `roles`) 0..1─n `Client`
(relationship manager); `Client` 1─n `Trip`, 1─n `Conversation`; `Trip` 1─0..1
`TripRequirements` (+ `TripModuleShare` mix), 1─1 `Itinerary` 1─n
`ItineraryItem` (a block: component, optional branch, `startsAt`, `addedBy`
TEAM/CLIENT/AI, frozen `price`), 1─0..1 `Report`.

Audit: `ActivityLog` (ids and counts only), `AiRun` (every model call).
Inventory is never deleted (`RESTRICT`), only deactivated; a client's trips,
itineraries, blocks, requirements and conversations cascade with the client.
`ChangeRequest` is legacy from the retired proposal flow and no longer written.

---

## AI

- All model calls go through `generateStructured` in `src/lib/ai/`: structured
  output validated by Zod, one repair retry, an `AiRun` row per call (no prompts
  or client text — ids and counts only), prompts versioned in `src/lib/ai/prompts/`.
- **`AI_PROVIDER=fake` is the default** — deterministic and offline; development,
  tests and CI always use it. Set `AI_PROVIDER=gateway` with
  `AI_GATEWAY_API_KEY` (or Vercel OIDC) to call real models through the Vercel AI
  Gateway: `AI_MODEL_REASONING` (default `anthropic/claude-sonnet-5.5`) drafts
  itineraries, `AI_MODEL_FAST` (default `anthropic/claude-haiku-5.5`) extracts
  requirements and chats.
- **Requirements** — conversations (PII minimised) → summary, module mix, pace,
  budget, must-haves, things to avoid, and a brief for the team.
- **Draft itinerary** — a deterministic planner (pace budget per day, gaps around
  existing blocks, must-haves first, then the module furthest below its target
  share, each at a sensible time of day); the model may re-pick from the same
  candidates, and anything invalid (unknown ids, clashes, outside the day) is
  dropped.
- **"+" suggestions** — deterministic ranking of what fits the gap.
- **Chat** — a discovery assistant with "Build my itinerary" and "Talk to a
  person". It never gives medical advice: prompts forbid it and every model
  sentence passes `src/domain/ai/safety.ts` before it is stored or shown.

---

## Security and privacy

- **Admin auth** — bcrypt, HS256 JWT in an `httpOnly` cookie, rate-limited login.
- **Client portal auth** — a 32-byte token delivered by email; only its SHA-256
  hash is stored; exchanged for a session cookie and dropped from the URL.
- **Ownership is proved server-side, always.** The portal derives the client
  from the session; every trip and block id from the browser is re-checked.
  Integration tests cover cross-client access in both directions.
- **The portal renders projections.** The builder view model and the feed query
  select client-safe fields only; tests assert that vendor contacts, internal
  notes, cost metadata, requirements and transcripts never appear.
- **Privacy** — transcripts, summaries and requirements are staff-only, redacted
  from logs and never stored in `AiRun`. Personal details are removed before text
  goes to a model. `/admin` and `/trip` responses are `no-store`.
- No compliance claims are made; consent and retention are open items (PLAN.md X.2).

---

## Testing

From the latest run (2026-10-22):

| Suite                       | Result                     |
| --------------------------- | -------------------------- |
| Unit + integration (Vitest) | **134 passed** (10 files)  |
| End-to-end (Playwright)     | **2 passed**               |
| `tsc --noEmit`              | clean                      |
| `next build`                | succeeds                   |

The Playwright golden path: admin creates a client and trip → records a 40/30/30
mix → places the blood test at the Fort Kochi branch (€370 for two) → invites the
client → client lands on the Feed → can't touch the health core → adds a dinner
priced for two (total €405) → drags it to another day → chats three messages →
*Build my itinerary* adds suggestions around the health core → confirms → admin
sees the trip awaiting payment. A second spec covers vendor, branch,
practitioner, catalogue and component administration.

---

## Deployment

Vercel with Neon Postgres (Marketplace). **Pushing to `main` deploys
production.** Set `DATABASE_URL`, `SESSION_SECRET` (32+ chars), `APP_URL`,
`EMAIL_TRANSPORT=log` (until a provider is chosen), and for real AI
`AI_PROVIDER=gateway` (+ a gateway key or OIDC). Migrate with
`npm run db:deploy`. Never set `SEED_ADMIN_*` in production.

The Phase 2 migration backfills existing data: every itinerary becomes a trip,
items become timed blocks, intake text becomes the trip's requirements.

---

## Known limitations

- Payment, booking, the client calendar's green ticks and in-trip features are
  not built (PLAN.md Phases 5–8). The Calendar shows "Not booked yet".
- The Feed is curated by hand (add, hide, JSON import); automated Instagram /
  news ingestion waits on a sourcing decision.
- Staff roles are stored but not enforced: every staff member can do everything.
- AI drafts pick a provider's first branch; the client can change it.
- No evals have been run against a real model yet (no gateway key).
- Every mutation reloads the page; the in-process rate limiter assumes one instance;
  no pagination on list views.
