# Aalmaram Health Care Platform — Implementation Plan

> Sources: product call with Nivedith (Sept 2026); product call (14 Oct 2026) and class-diagram review
> (15 Oct 2026), distilled in [`inputs/2026-10-14-product-notebook.md`](inputs/2026-10-14-product-notebook.md)
> §8 and §12. **Revised 15 Oct 2026** to match the agreed domain model,
> [`class-diagram.md`](class-diagram.md) (v1). Every change from the Sept plan is listed in
> `PROGRESS.md → Decisions` (2026-10-15). Anything marked **[PENDING INPUT]** waits on a human answer
> listed under `PROGRESS.md → Blockers`.

---

## 1. The product in one picture

```
   ┌────────────────────────────┐          ┌────────────────────────────┐
   │ A · WHAT WE OFFER          │          │ B · THE CLIENT'S JOURNEY   │
   │ Module → Catalogue →       │          │ Client → Trip →            │
   │ Component ← Vendor         │          │ TripRequirements,          │
   │ (Branch, Practitioner)     │          │ Itinerary, HealthDossier   │
   │ kept by the team           │          │ one itinerary per trip     │
   └─────────────┬──────────────┘          └──────────────┬─────────────┘
                 └──── meet at ItineraryItem (a "block") ─┘
                                     ▼
  ┌──────────────────────────────────────────────────────────────────────┐
  │ STAGE 1  INTAKE & CURATION                                           │
  │  conversation (AI chat or staff) → trip requirements (module mix) →  │
  │  team fixes the HEALTH CORE → client builds the rest in the          │
  │  drag-and-drop builder with AI suggestions, watching the cost →      │
  │  client CONFIRMS (itinerary locks) → client PAYS                     │
  ├──────────────────────────────────────────────────────────────────────┤
  │ STAGE 2  BOOKING     one booking per block; AI agent drafts the      │
  │                      scheduling emails, staff send; the client sees  │
  │                      a green tick on each confirmed block            │
  ├──────────────────────────────────────────────────────────────────────┤
  │ STAGE 3  IN-TRIP     calendar / today view of the confirmed blocks;  │
  │                      changes only through the relationship manager   │
  ├──────────────────────────────────────────────────────────────────────┤
  │ STAGE 4  POST-TRIP   health dossier for the trip; lasting client     │
  │                      preferences carried into the next trip          │
  └──────────────────────────────────────────────────────────────────────┘
```

**The moat, in Nivedith's words:** how well an AI can understand a client conversation and plan from
the components it has access to. That quality is capped by how good the **vendor profiles** are, so
vendor profiling is built first.

**Who uses it:** clients (portal; mostly international, 50+, so big and simple) and the internal team
(admin). **No vendor view** until a vendor sends ~100 clients a month; vendors are reached by email and
phone.

### Terminology (important — avoid naming collisions)

| Term in the calls | Term in this codebase | Meaning |
| --- | --- | --- |
| "modules" (health / wellness / culture) | **Module** (existing) | Content category: `Module → Catalogue → Component`. Exactly three. |
| "categories" (client-facing) | **Catalogue** (existing) | e.g. Diagnostics, Specialists, Food. |
| "components", "experiences" | **Component** (existing) | The sellable unit a vendor provides: a blood test, a massage, a walking tour, a dinner. |
| "the 4 modules of the system" | **Stage** | Platform lifecycle: Intake & Curation, Booking, In-Trip, Post-Trip. Never call these "modules" in code. |
| "vendor profile" | **Vendor profile** | `Vendor` fields + its `Branch`es + its `Practitioner`s + its components' fields (Phase 1). |
| "trips" | **Trip** | One visit by one client. Owns its requirements, its one itinerary and its health dossier. Replaces the Sept plan's `Journey`. |
| "requirements" | **TripRequirements** | What the client wants for *this* trip, from the discovery conversation. |
| "client record", "preferences" | **ClientPreference** | What the client always wants, across trips (diet, allergies, likes…). |
| "blocks", "itinerary items" | **ItineraryItem** | One component placed in time (optionally at a branch). `addedBy` = `TEAM` / `CLIENT` / `AI`. |
| "health core" | `ItineraryItem` with `addedBy = TEAM` | The health blocks the team fixes; the client builds around them. |
| "green tick" | `Booking.status = CONFIRMED` | What the client sees of a booking. |
| "health dossier" | **HealthDossier** | The post-trip output of a trip (reports, summary). |
| "relationship person" | **Staff** with role `RELATIONSHIP_MANAGER` | The client's human contact. `Staff` is the existing Prisma `User` model. |

---

## 2. Where we are today (baseline)

Already built and tested (see `README.md`):

- Admin: vendors, modules, catalogues, components CRUD; clients with free-text intake
  fields (`healthInterests`, `wellnessInterests`, `culturalInterests`, …) and trip dates on the client.
- Manual itinerary builder (many itineraries per client), pricing (Decimal, single currency per
  itinerary), validation, What-to-Expect report.
- Proposal lifecycle `DRAFT → READY_FOR_REVIEW → PUBLISHED → CHANGES_REQUESTED/APPROVED` with
  `ChangeRequest`s.
- Client portal (`/trip`) via hashed magic-link token; approve / request change. Prices hidden
  (`SHOW_PRICES_TO_CLIENT = false`).
- Activity log, email abstraction (log transport only), rate limiting.
- `ItineraryRecommendationService` interface with a null implementation — the intended seam for AI
  suggestions.
- Deployed on Vercel + Neon Postgres. **Pushing to `main` deploys production.**

How today's models map onto the class diagram: see
[`class-diagram.md` → Relation to the current code](class-diagram.md#relation-to-the-current-code-prismaschemaprisma).

Gaps against the vision:

| Area | Gap |
| --- | --- |
| Vendor profile | Name / contact / one `location` string / one `accreditation` string. No branches, practitioners, description, languages, socials, equipment. |
| Component | No duration, recovery time; price unit is free text. |
| Clients & trips | No `Trip`; trip dates and interests are free text on the client. No conversations, no structured requirements, no relationship manager. |
| Itinerary | Several per client, proposal/approval statuses; no start times, no origin (`addedBy`), no branch. |
| Client portal | Read-and-approve only. No feed, no builder, no prices, no chat. |
| AI | None. |
| Payment, booking | None (item status `CONFIRMED` exists but is manual and unused). |
| In-trip, post-trip | None. |
| Platform | Single ADMIN role, no real email, no file storage, no consent/retention handling for health-adjacent data. |

---

## 3. Guiding principles (apply to every phase)

1. **The class diagram is the domain model.** [`class-diagram.md`](class-diagram.md) is the source of
   truth for classes, attributes and multiplicities; the Prisma sketches below follow it. The diagram
   lists the domain minimum, so existing columns it doesn't mention (`tags`, `costStatus`, `notes`,
   `internalNotes`, …) stay unless a phase retires them. Refine freely during implementation (CLAUDE.md
   §8) and record the change in Decisions.
2. **Human in the loop for anything client- or vendor-facing.** AI drafts; a person acts. Nothing
   AI-generated is sent to a vendor, paid for or booked without an explicit human action. The client's
   own Confirm is that action for their itinerary; staff send every vendor email (until a phase
   introduces a configurable auto-send flag, default off). The MVP chatbot's instant itinerary is a
   visible draft — see Phase 4.
3. **Deterministic where possible, LLM where necessary.** Pricing, module-mix math, block placement
   rules, validation and status machines are plain TypeScript in `src/domain/`, unit-tested. The LLM
   handles language understanding and judgement-based selection, always via schema-validated structured
   output, always constrained to IDs we supplied.
4. **Every AI call is auditable.** Model, prompt version, token counts, cost, latency, outcome and the
   entity it touched are recorded (`AiRun`). The AI agent is not a domain class; it acts on the model.
5. **No medical claims, no diagnosis.** We curate experiences and coordinate providers. Extend the
   existing "report makes no medical claim" test pattern to all AI output.
6. **The client portal renders projections, never models.** Every new internal field (vendor contacts,
   transcripts, conversation summaries, booking events, AI rationale, payment references) must be added
   to the "never appears in client projection" integration test.
7. **Simple fields first.** Vendor and component profiles are plain typed fields chosen with Nivedith
   (notebook §6.1, §12.1 #11), tested against three examples: a **blood test**, a **Swedish massage**
   and a **Fort Kochi walking tour**. "Start with the basics and learn as we add data" — add a field
   when real data shows it is needed, not before.
8. **Built for 50+ clients.** Big type and touch targets, few choices per screen, plain words. Desktop
   first; a phone app comes later.
9. **Ship vertical slices.** Each phase ends with schema + domain + admin/portal UI + tests + seed data
   + README section, and the app still builds and deploys.

---

## 4. Phases

Order follows Nivedith's build order (15 Oct): **vendor profile first**, then the client's side.
Booking depends on payment, payment on a confirmed itinerary.

| Phase | Name | Depends on | Priority | MVP |
| --- | --- | --- | --- | --- |
| 0 | Foundations (baseline, AI gateway, AiRun, fake provider, evals) | — | Must | ✅ |
| 1 | **What we offer — vendor profile** (Vendor, Branch, Practitioner, Component fields) | P0.1 (P1.5 needs P0.2–P0.4) | **Top — build first** | ✅ |
| 2 | Clients & trips (Staff roles, Trip, TripRequirements, Conversation, Itinerary 1:1 Trip) | 1 | Must | ✅ |
| 3 | Client portal — Feed + drag-and-drop itinerary builder with cost | 1, 2 | Must — the demo | ✅ |
| 4 | AI — conversation to requirements to itinerary; slot suggestions; client chat | 0, 2, 3 | Must — the moat | ✅ |
| 5 | Confirm, lock & pay (Payment) | 3 | Must | — |
| 6 | Booking (one Booking per block, internal BookingEvents, green tick) | 5 | Must | — |
| 7 | In-trip (calendar / today view, trip status) | 6 | Should | — |
| 8 | Post-trip & continuity (HealthDossier, ClientPreference, next trip) | 6 | Must | — |
| X | Cross-cutting hardening (email, consent, retention, observability) | runs alongside | Must before real clients | — |

Task IDs (e.g. `P1.3`) are tracked in `docs/platform/PROGRESS.md`.

### MVP and build order (Nivedith, 15 Oct)

**MVP** = the internal tool to add vendors and components by hand, and the client app's **Feed**
(scraped Instagram) and **drag-and-drop itinerary builder showing cost**, plus an **AI chatbot** that
builds an immediate itinerary from a conversation. Desktop first. In model terms: all of package A
(`Module`, `Catalogue`, `Component`, `Vendor`, `Branch`, `Practitioner`) + `FeedPost`, and `Staff`,
`Client`, `Conversation`, `Trip`, `TripRequirements`, `Itinerary`, `ItineraryItem`. `Payment`,
`Booking`, `BookingEvent`, `HealthDossier` and `ClientPreference` follow after the MVP.

Build order:

1. **P0.1** baseline health check.
2. **Phase 1 without AI** (all but P1.5; P1.8 is human data entry) — the admin flow *module →
   catalogue → vendor → component (+ practitioner)*, so Nivedith can start entering vendors.
3. **P0.2–P0.4**, then **P1.5** (draft a vendor profile from its website).
4. **Phase 2 → Phase 3 → Phase 4.** That completes the MVP demo.
5. After the demo: **5 → 6 → 7 → 8**, with **X** done before real clients.

Not now: a public landing page (Nivedith is still shaping the pitch), a vendor view, a phone app — see
§5 Backlog.

---

### Phase 0 — Foundations

**Goal:** everything later phases need to add AI safely, without touching product behaviour.

**P0.1 Baseline health check.** Start local DB, run `npm run typecheck`, `npm test`,
`npm run build`, `npm run test:e2e`. Record results in PROGRESS.md. Fix anything already
broken before building on it.

**P0.2 AI gateway module — `src/lib/ai/`.**
- Use the Vercel **AI SDK** through **Vercel AI Gateway** (the app is on Vercel). Load
  the `vercel:ai-sdk` and `vercel:ai-gateway` skills first and follow current APIs —
  do not code from memory.
- Default models are Anthropic Claude via the gateway, configured by env, never hard-coded
  at call sites: `AI_MODEL_REASONING` (planning; e.g. Claude Sonnet 5, or Opus 5 for
  hardest planning) and `AI_MODEL_FAST` (extraction/classification). Verify the exact
  gateway model slugs against the gateway's model list.
- Public surface (sketch):
  ```ts
  generateStructured<T>({ task, schema: ZodType<T>, system, prompt, promptVersion,
                          entity?: {type,id}, actorUserId? }): Promise<{ data: T; runId: string }>
  ```
  Handles: schema validation, one repair retry that feeds validation errors back,
  timeout, `AiRun` persistence, logger redaction.
- Provider selection by `AI_PROVIDER=gateway|fake`. **`fake` is the default when no key
  is present** so dev, CI and all tests work offline. The fake provider returns
  deterministic fixtures registered per task.
- Prompts live in `src/lib/ai/prompts/<task>.ts`, each exporting `PROMPT_VERSION`
  (bump on any change) and a builder function. No prompt strings inline in actions.
- Add env vars to `src/lib/env.ts` (optional, validated) and `.env.example`.

**P0.3 `AiRun` model.** `id, task (enum), model, promptVersion, status (SUCCEEDED |
FAILED | INVALID_OUTPUT), inputTokens, outputTokens, costUsd Decimal?, latencyMs,
entityType?, entityId?, actorUserId?, output Json?, errorCode?, createdAt`. Do **not**
store raw prompts containing transcripts or client PII; store references (ids) and the
structured output. Admin page `/admin/ai-runs` (list + detail) for debugging.

**P0.4 Evals harness.** `npm run eval` (separate from `npm test`, needs a real key):
runs fixtures in `evals/<task>/*.json` through the real model and scores them with
deterministic checks (schema valid, constraints met, expected properties). Prints a table
and writes `evals/results/<date>.json` (gitignored). CI never runs it.

Moved out of Phase 0: staff roles → **P2.1** (they arrive with the relationship manager); the file
storage seam → **P8.1** (first needed by health-dossier documents).

**Acceptance:** all existing tests still green; a unit test exercises `generateStructured`
with the fake provider including the repair-retry path; `AiRun` rows appear; `/admin/ai-runs`
renders; no behaviour change for existing screens.

---

### Phase 1 — What we offer: vendor profile (BUILD FIRST)

**Goal:** a vendor profile that answers the questions a *client* asks about a provider (notebook §6.1)
and gives the *AI* what it needs to place components — using simple typed fields, entered through the
admin flow **create module → catalogue → vendor → component (+ optional practitioner)**.

Test every field against three components: **blood test** (health: practitioner, deliverable = the
report), **Swedish massage** (wellness: therapist optional, no deliverable), **Fort Kochi walking tour**
(culture: guide, no deliverable). Restaurants have no practitioner and are priced from Google's
"average for two".

Examples straight from the calls:
- Client: *"If I do this diagnostic test, who is the physician who will read my report?"* →
  practitioners linked to the component.
- Client: *"There are 100 branches — which one do I go to?"* → the client picks the branch near where
  they stay.
- Client: *"How long is it, what do I get afterwards, what does it cost?"* → duration, deliverable,
  price + price unit.

#### Data model (Prisma sketch — refine during implementation)

```prisma
// Module, Catalogue — unchanged. Diagram: id + name; existing description/sortOrder/status stay.

// Vendor — ADD (keep existing columns):
//   description String?                           // client-facing "about"
//   hqLine, hqCity, hqPostcode, hqCountry String? // Address datatype as columns; replaces `location`
//   website String?, socialLinks String[]          // socials also feed the client Feed (Phase 3)
//   accreditations String[]                        // replaces `accreditation` text — VendorCredential folded in
//   languages String[], yearEstablished Int?, staffCount Int?
//   equipment String[], owners String[]
// Existing contactName (= contactPerson), email, phone and notes are INTERNAL, never client-visible.
// Phone is required by the vendor form (diagram: phone 1..1); the column stays nullable for old rows.

model Branch {                          // a vendor's location; the client picks one per block
  id, vendorId, name
  addressLine, city, postcode, country  // Address datatype
  status RecordStatus                   // inventory: deactivate, never delete
  @@unique([vendorId, name])
}

model Practitioner {                    // doctor, therapist, instructor, guide, performer
  id, vendorId, name
  role String                           // "Consultant Physician", "Kathakali performer", "Walking-tour guide"
  qualifications String[], achievements String[]
  yearsOfExperience Int?, languages String[]
  status RecordStatus
}

model ComponentPractitioner {           // "delivered by" — optional; health always, restaurants never
  componentId, practitionerId
  @@id([componentId, practitionerId])
}
// invariant (domain-validated): a component's practitioners work for that component's vendor

enum PriceUnit { PER_PERSON FOR_TWO PER_GROUP }   // FOR_TWO = restaurants, Google's average for two

// Component — ADD:
//   durationMinutes Int                   // required; backfill existing rows, then NOT NULL
//   recoveryTimeMinutes Int?              // few medical cases need it
//   priceUnit PriceUnit @default(PER_PERSON)   // replaces free-text `unit`
// Existing clientFacingDescription = description, clientDeliverable = deliverable (physical only,
// e.g. the blood-test report), price + currency = Money. /module stays derived through Catalogue.
```

Dropped from the Sept sketch (add back only if real data or AI evals show the need): `VendorType`,
`ServiceTier`, `VerificationStatus`, `VendorCredential`, `ProfileQuestion` / `VendorProfileAnswer`
(question bank), amenities, booking channel / lead time, coordinates, practitioner registration
numbers, practitioner roles per component, component intensity / time of day / group size /
dependencies.

#### Tasks

- **P1.1 Schema + migration** for the above. Data migration: `Vendor.accreditation` text → one element
  of `accreditations[]`; `Vendor.location` → `hqCity`; `Component.unit` text → `priceUnit`
  (`"per person"` → `PER_PERSON`, anything unrecognised → `PER_PERSON` and listed in the migration
  output for a human to check). Must be idempotent. Drop the old columns in a follow-up migration once
  nothing reads them.
- **P1.2 Domain `src/domain/vendors/`:** validation (practitioners and branches belong to the
  component's vendor); `missingProfileFields(vendor)` — a plain list of empty fields from the §6.1
  checklist, so humans can fill the gaps; `vendorClientProjection()` (client-safe fields only);
  `vendorPlannerProjection()` (compact representation for the LLM). Unit tests for all.
- **P1.3 Admin vendor profile editor** at `/admin/vendors/[id]`: sections *About* (description,
  year established, staff count, owners, languages), *Trust* (accreditations, equipment), *Contact*
  (internal: contact person, email, phone, HQ address), *Online* (website, socials); **Branches**
  sub-list (CRUD, deactivate); **Practitioners** sub-list (CRUD, deactivate); "missing fields" list.
  Follow existing form patterns (`runAction`, `useActionRedirect`, primitives, field errors).
- **P1.4 Component editor additions:** duration, recovery time, deliverable, price unit; link
  practitioners (only the vendor's own). Show them on the component detail page.
- **P1.5 Draft a vendor profile from its website (AI).** On the vendor page: "Draft from website" —
  the admin pastes page text or a public URL (fetched server-side on that click only; tests use
  fixture HTML, never the network). `generateStructured` (task `VENDOR_PROFILE_EXTRACTION`) maps it to
  vendor fields, **branches** (vendors list them on their sites), practitioners and candidate
  components. Results land as **suggestions** the admin accepts / edits / rejects per field; never
  overwrite a human-entered value silently. Fake-provider fixture + eval fixtures (2–3 fictional
  vendors). Depends on P0.2–P0.4.
- **P1.6 Client-facing provider info** — "About this provider" and "Who you'll see" on each block in
  the portal: vendor description, accreditations, languages, years, the block's branch address, and
  the component's practitioners (name, role, qualifications, years of experience). Extend the
  projection-leak integration test: vendor contact person, email, phone and notes never appear.
  Reused by the Phase 3 builder.
- **P1.7 Seed data** (all fictional, suffixed `(demo)`): the three test components with their vendors;
  a diagnostics vendor with several branches and a physician; a restaurant component priced
  `FOR_TWO`; one deliberately incomplete vendor to demo the missing-fields list.
- **[!] P1.8 First real vendors** — humans enter Nivedith's curated list (one per module to start)
  through the production admin. **[PENDING INPUT]** the list. The agent never puts real vendors in
  seeds or fixtures.
- **P1.9 Vendor list upgrades:** filter by module (through components); columns for branch count,
  practitioner count and missing fields.

**Acceptance:** an admin follows module → catalogue → vendor → component and fully describes the three
test components without unused or missing fields; a vendor with several branches and a physician
linked to the blood test shows correctly in the portal; contact fields never leak (integration test);
AI drafting works end-to-end with the fake provider and creates suggestions only; e2e covers profile →
portal display.

---

### Phase 2 — Clients & trips

**Goal:** the client's side of the model in the database and the admin — **Client 1→\* Trip, Trip
1→1 Itinerary** — with a trip's requirements and conversations, and the team placing the **health core**.

#### Data model

```prisma
enum StaffRole { ADMIN RELATIONSHIP_MANAGER }
// User (= Staff in the diagram; not renamed) — replace `role UserRole` with
//   roles StaffRole[] @default([ADMIN])

// Client — ADD dateOfBirth DateTime? @db.Date, addressLine/city/postcode String? (country exists),
//   termsAcceptedAt DateTime?, relationshipManagerId String? → User (onDelete SetNull).
//   MOVE tripStartDate/tripEndDate/tripDuration → Trip; healthInterests/wellnessInterests/
//   culturalInterests/intakeNotes → that trip's TripRequirements.summary. generalPreferences stays until
//   Phase 8 turns it into ClientPreference rows. Drop moved columns in a follow-up migration.
//   `status` stays for admin filtering; trip progress lives on Trip.status.

enum TripStatus { PLANNING AWAITING_PAYMENT BOOKING READY IN_PROGRESS COMPLETED CANCELLED }

model Trip {                            // cascades from Client
  id, clientId, name
  startDate DateTime @db.Date, endDate DateTime @db.Date
  travellers Int @default(1)
  status TripStatus @default(PLANNING)
  createdAt, updatedAt
}

enum Pace { RELAXED BALANCED PACKED }

model TripRequirements {                // 0..1 per trip — what the client wants for THIS trip
  id, tripId @unique
  summary String
  budgetAmount Decimal?, budgetCurrency String?
  pace Pace?, mustHaves String[], avoid String[]
  moduleMix TripModuleShare[]
  updatedAt
}

model TripModuleShare { requirementsId, moduleId, percent Int  @@id([requirementsId, moduleId]) }
// invariant (domain-validated): percents over active modules sum to exactly 100

enum Channel { AI_CHAT STAFF_CHAT CALL EMAIL WHATSAPP IN_PERSON }

model Conversation {                    // cascades from Client
  id, clientId, tripId String?          // "about" a trip — optional
  channel Channel, occurredAt DateTime
  transcript String                     // SENSITIVE — never logged, never in AiRun.output
  summary String?                       // the brief for the human; staff-only
  createdById String?, createdAt
}

// Itinerary — exactly one per Trip, created with it (cascades from Trip):
//   tripId String @unique (replaces clientId); confirmedAt DateTime? (locks it — Phase 5).
//   title/startDate/endDate move to Trip; status/publishedAt/approvedAt are retired
//   (Trip.status + confirmedAt). totalPrice is derived, never stored.

enum AddedBy { TEAM CLIENT AI }         // TEAM = health core

// ItineraryItem (a "block") — ADD:
//   startsAt DateTime                     // replaces scheduledDate/dayNumber/sequence
//   addedBy AddedBy
//   price Decimal + currency              // replaces priceOverride; recomputed while PLANNING, frozen at confirm
//   branchId String? → Branch (onDelete Restrict)
//   endsAt is derived: startsAt + component.durationMinutes.
//   `status` is retired — booking state lives on Booking (Phase 6).
```

Report (What-to-Expect) stays as it is: a document generated from the itinerary, not a domain class.
`ChangeRequest` is superseded (after confirm, changes go through the relationship manager): stop
writing it; drop the table only after a human confirms production holds nothing worth keeping.

#### Tasks

- **P2.1 Staff roles + relationship manager.** `roles StaffRole[]`; `requireRole(...roles)`. ADMIN can
  do everything; RELATIONSHIP_MANAGER = clients, trips, itineraries, conversations (and bookings in
  Phase 6), not inventory. Existing users get `[ADMIN]`. Staff accounts are still created manually.
  Assign a relationship manager on the client page. Tests.
- **P2.2 Schema + migration + backfill.** Each existing `Itinerary` becomes a `Trip` for its client
  (name = title; dates from the itinerary, else the client; `APPROVED` → `AWAITING_PAYMENT` with
  `confirmedAt = approvedAt`, `ARCHIVED` → `CANCELLED`, others → `PLANNING`). Items: `startsAt` from
  `scheduledDate` (or trip start + `dayNumber`) at a default time, keeping `sequence` order;
  `addedBy = TEAM`; `price = priceOverride ?? computed`; `REMOVED` items are deleted. Client intake text
  → the client's latest trip's `TripRequirements.summary`. Idempotent; tested against seed data.
- **P2.3 Domain `src/domain/trips/`:** `TripStatus` transition table with unit tests (mirror
  `src/domain/itineraries/status.ts`); module-mix validation and largest-remainder normalisation;
  block rules — inside the trip's dates, branch belongs to the component's vendor, `endsAt`, overlap
  warnings; `blockPrice(component, travellers)` (`PER_PERSON` × travellers, `FOR_TWO` ×
  ⌈travellers / 2⌉, `PER_GROUP` × 1) and the itinerary total, reusing the single-currency rule in
  `src/domain/itineraries/pricing.ts`.
- **P2.4 Admin UI.** Client page → **Trips** list (new trip creates its itinerary). Trip page:
  *Requirements* (summary, module-mix inputs constrained to 100%, budget, pace, must-haves, avoid),
  *Conversations* (paste a transcript, pick channel and date, view), *Itinerary* — the existing admin
  builder adapted to blocks with start time and branch; blocks the team adds are `TEAM` (health core).
- **P2.5 Retire the proposal flow.** Remove publish / approve / change-request screens and actions
  from admin and portal; the portal shows the trip's itinerary read-only until Phase 3. Point the
  What-to-Expect report at the trip.
- **P2.6 Privacy:** transcripts and summaries redacted from the logger, staff-only, added to the
  projection-leak test.
- **P2.7 Seed:** one demo client with a relationship manager, one trip, requirements (e.g. 40 / 30 /
  30), a conversation and a health core of two blocks.

**Acceptance:** admin creates a client → a trip (with its itinerary) → requirements whose mix sums to
100 → pastes a conversation → places the health core with times and branches; every pre-existing
itinerary survives the migration as a trip; status machine and block rules are unit-tested; unit +
integration + one e2e test.

---

### Phase 3 — Client portal: Feed + itinerary builder (the MVP demo)

**Goal:** what Nivedith will show: a client opens their link, sees the **Feed**, then builds their trip
around the health core in a **drag-and-drop itinerary builder that shows the cost** as they go.

Portal sections (notebook §4): **1 Feed** (landing) · **2 Itinerary** (builder) · 3 Calendar/status
(Phase 6) · 4 Chat (Phase 4). A client with several trips picks the trip first.

#### Data model

```prisma
enum FeedSource { VENDOR_INSTAGRAM KERALA_TOURISM NEWS }

model FeedPost {                        // package A in the diagram — what we offer, shown as a feed
  id, source FeedSource
  vendorId String? → Vendor             // "posted by" — optional (tourism/news posts have none)
  caption String, mediaUrl String?, link String
  publishedAt DateTime
  externalId String? @unique            // refinement: de-duplicates re-imports
  hiddenAt DateTime?                    // refinement: staff hide a post (only "positive" news)
}
```

#### Tasks

- **P3.1 FeedPost schema + admin feed manager** `/admin/feed`: add a post (link, caption, media URL,
  source, vendor), hide/unhide, import a JSON file of posts. Enough to fill the feed for the demo.
- **[!] P3.2 Automated feed ingestion** behind a `FeedIngestor` seam with a fake implementation:
  vendors' Instagram (from `Vendor.socialLinks`), Kerala Tourism, positive local news. **[PENDING
  INPUT]** how we may source Instagram posts (scraping vs official API/embeds and their terms) and which
  news sources count. Build the seam and admin import now; the real ingestor waits.
- **P3.3 Portal shell + Feed page:** navigation for the four sections (Calendar and Chat show "coming
  soon" until their phases); trip picker; Feed as cards (image, caption, source, link out; vendor posts
  link to "About this provider").
- **P3.4 Itinerary builder.** A day-by-day **timeline** across the trip's dates. `TEAM` blocks (health
  core) are shown fixed. A **"+" between blocks** opens: module → catalogue → component → branch (if the
  vendor has several) → start time; the block is added as `CLIENT`. The client can **drag** their own
  blocks to another time or day and remove them. A **running total** (and per-block price with its unit)
  is always visible. Warnings for overlaps and blocks outside the trip. Server actions re-check
  ownership and rules: a client edits only their own trip, only `CLIENT`/`AI` blocks, only while the
  trip is `PLANNING`.
- **P3.5 Block detail:** description, duration, deliverable, recovery time, price + unit, branch
  address, "About this provider" / "Who you'll see" (P1.6).
- **P3.6 Prices on:** set `SHOW_PRICES_TO_CLIENT` to true (or remove it) and update the projection
  tests; the builder total equals the domain total.
- **P3.7 50+ accessibility pass** on the whole portal: large type and targets, keyboard-operable drag
  (move up/down buttons as an alternative), clear contrast, nothing hidden behind hover. Desktop first;
  check a narrow viewport too.
- **P3.8 Tests:** domain (placement, total); integration (client A can't touch client B's trip; can't
  move or remove `TEAM` blocks; can't edit outside `PLANNING`); projection-leak; e2e: open link → Feed →
  trip → add a Culture → Food block at a branch → total updates → remove it.

**Acceptance:** from the demo client's link the full Feed → builder flow works on desktop and at a
narrow width; the health core can't be changed by the client; totals match the domain; tests at all
levels.

---

### Phase 4 — AI: conversation → requirements → itinerary

**Goal:** the moat. The client (or staff) has a conversation; AI turns it into the trip's
requirements and a draft itinerary, and suggests what to do in each free slot.

**Human in the loop (MVP decision, 15 Oct):** Nivedith wants the chatbot to show an itinerary
immediately for the demo. AI output stays an explicit draft: AI places only `AI` blocks, labelled
"Suggested", which the client keeps or removes; it never adds, moves or removes `TEAM` blocks; the
relationship manager is notified of every AI draft and can edit it; nothing is paid or booked until the
client confirms (Phase 5). Before real clients, revisit whether staff must approve a draft before the
client sees it (Phase X).

#### Tasks

- **P4.1 Requirements extraction** (task `TRIP_REQUIREMENTS_EXTRACTION`) over a trip's conversations →
  a draft `TripRequirements` (summary, module mix, budget, pace, must-haves, avoid) plus
  `Conversation.summary` (the brief for the human: "which direction to push the client"). Instruct the
  model to say "unknown" rather than guess budget or pace. Staff edit; PII minimised before sending
  (strip emails/phones, client name → "the client").
- **P4.2 Draft itinerary** (task `ITINERARY_DRAFT`), deterministic around the LLM:
  1. *Slot budget* — free time per day from pace (RELAXED / BALANCED / PACKED) minus existing blocks,
     allocated to modules by the mix (largest remainder).
  2. *Candidates* — active components of active vendors per module, excluding `avoid`, fitting the free
     time (duration + recovery), scored by overlap with must-haves and catalogue.
  3. *LLM selection* — picks component IDs, days and times from the candidates only; validated (IDs,
     inside trip dates, no overlap with existing blocks); one repair retry.
  4. *Persist* — `AI` blocks with computed prices; an `AiRun`; ActivityLog; notify the relationship
     manager. Never touches `TEAM` blocks.
- **P4.3 Slot suggestions.** Implement `ItineraryRecommendationService`: for a gap between two blocks,
  rank components deterministically (module-mix gap, fits the gap, matches requirements); optional LLM
  re-rank with a one-line reason. The builder's "+" shows these first, then the module → catalogue
  browse ("did you know there's an IV-therapy clinic near your hotel…").
- **P4.4 Client AI chat** (portal section 4): a chat stored as a `Conversation` with channel `AI_CHAT`
  (task `CLIENT_CHAT`). It gathers needs, never gives medical advice, and offers **"Talk to a person"**
  at any time (notifies the relationship manager; human chat itself is `STAFF_CHAT`, later). "Build my
  itinerary" runs P4.1 + P4.2 and opens the builder.
- **P4.5 Evals:** 4–6 fictional conversations (executive health check-up; Ayurveda-focused;
  culture-heavy couple with light wellness; family with mobility limits) → requirements (mix within
  ±10pp, must-haves) → itinerary (mix within tolerance, must-haves covered or explained, no
  hallucinated IDs, no overlaps, **no medical claims** in any text).
- **P4.6 Privacy:** the client sees their own `AI_CHAT` / `STAFF_CHAT` messages only; transcripts of
  other channels, summaries and AI reasons are staff-only; add them to the projection-leak test.
- **P4.7 (optional, after the P4.5 baseline)** pgvector embeddings for components to improve
  retrieval; only if evals show retrieval misses.

**Acceptance:** with seed data and the fake provider, the demo client chats → "Build my itinerary" →
the trip gets requirements and `AI` blocks around the untouched health core, visible at once in the
builder; the relationship manager sees the draft; real-model evals meet the targets recorded in
PROGRESS.md; e2e covers chat → builder.

---

### Phase 5 — Confirm, lock & pay

**Goal:** "confirm → lock → pay → book". Once the client confirms, the itinerary is frozen and the
client pays the total they watched while building; **payment comes before any booking**. After
confirming, changes go through the relationship manager, not the app.

#### Data model

```prisma
enum PaymentStatus { PENDING PAID FAILED REFUNDED }

model Payment {                         // Itinerary 1 — 0..* Payment (retries, refunds)
  id, itineraryId
  amount Decimal, currency String
  status PaymentStatus @default(PENDING)
  method String?, paidAt DateTime?
  providerReference String?             // refinement: payment-provider id, staff-only
  createdAt, updatedAt
}
```

#### Tasks

- **P5.1** Schema; `PaymentStatus` transition table with unit tests.
- **P5.2 Confirm.** Client action "Confirm my itinerary": validates (blocks inside the trip, no
  overlaps, branch chosen where the vendor has several), shows the total and the terms (records
  `Client.termsAcceptedAt`; **[PENDING INPUT]** terms text incl. Kerala clinics holding client data) →
  sets `confirmedAt`, freezes block prices, Trip → `AWAITING_PAYMENT`. The builder becomes read-only
  with "Contact your relationship manager".
- **P5.3 Payment seam** `src/lib/payments/` with a fake provider (default) and **manual recording** by
  staff (e.g. bank transfer). When PAID payments cover the total → Trip → `BOOKING`. **[PENDING
  INPUT]** real payment provider (no paid service is provisioned by the agent) and whether a service fee
  is added to the total.
- **P5.4 Admin:** payments on the trip page; record a payment; mark a refund (money moved outside the
  app). Staff may still edit a confirmed itinerary through the admin (each edit logged), with price
  differences settled manually until the refund policy is known.
- **P5.5** What-to-Expect report generated from the confirmed itinerary.
- **P5.6 Tests:** confirm locks (integration: no client edits after confirm); payment status machine;
  booking can't start before payment; e2e: build → confirm → fake pay → trip `BOOKING`.

**Acceptance:** a confirmed itinerary can't be changed by the client, its prices are frozen, and the
trip only reaches `BOOKING` once paid.

---

### Phase 6 — Booking

**Goal:** after payment, book every block with its vendor, automating the routine parts. **One booking
is always for one block** (one component, one vendor, at the chosen branch). The agent's actions are
logged internally; the client sees only the outcome — the **green tick**.

#### Data model

```prisma
enum BookingStatus { PENDING REQUESTED CONFIRMED DECLINED CANCELLED }

model Booking {                         // ItineraryItem 1 — 0..1 Booking; cascades from the item
  id, itineraryItemId @unique
  status BookingStatus @default(PENDING)
  confirmedTime DateTime?, vendorReference String?
  createdAt, updatedAt
  // vendor is derived: itineraryItem → component → vendor (branch from the item)
}

enum Actor { AI_AGENT STAFF VENDOR }

model BookingEvent {                    // INTERNAL ONLY — never in a client projection
  id, bookingId
  occurredAt DateTime, actor Actor, action String, detail String?
  actorUserId String?                   // refinement: when actor = STAFF
}
```

#### Tasks

- **P6.1** Schema; **booking status machine** in `src/domain/bookings/status.ts` (PENDING → REQUESTED
  → CONFIRMED | DECLINED; DECLINED → REQUESTED for a new time or branch; any → CANCELLED) with unit
  tests.
- **P6.2** When a trip enters `BOOKING`, create one `PENDING` booking per block.
- **P6.3 AI booking agent:** drafts the scheduling email per vendor (task `BOOKING_REQUEST_DRAFT`;
  one email may list several of that vendor's bookings, each still its own `Booking`); staff review and
  send — log transport until X.1. Every step writes a `BookingEvent` (`AI_AGENT` / `STAFF`).
  `BOOKING_AUTO_SEND` flag exists, default `false`; document it, do not enable.
- **P6.4 Vendor replies:** vendors answer by email or phone (no vendor view). Staff record the outcome
  (status, confirmed time, vendor reference); optionally paste the reply for the AI to suggest the
  status (task `VENDOR_REPLY_PARSE`), staff confirm. Recorded as `BookingEvent` with actor `VENDOR`.
- **P6.5 Booking board** `/admin/bookings` and per trip: status, internal event timeline, actions;
  overdue `REQUESTED` bookings highlighted (Vercel Cron `/api/cron/bookings`, secret-protected,
  idempotent, flags only — sends nothing).
- **P6.6 Client calendar/status** (portal section 3): green tick on `CONFIRMED` blocks, "awaiting
  confirmation" on the rest. Booking events and vendor reply text never reach the client.
- **P6.7 Declines and changes:** the relationship manager finds an alternative (time, branch or
  component), edits the block in the admin (logged) and re-requests; price differences settled
  manually until the refund policy is known.
- **P6.8** All bookings `CONFIRMED` (or `CANCELLED` and acknowledged by staff) → Trip `READY`; client
  notified.
- **P6.9 Tests:** status machine unit; integration (booking events never in client projection; one
  booking per block); cron idempotency; e2e: paid trip → requests sent → staff record confirmations →
  green ticks → trip `READY`.

Dropped from the Sept plan: the vendor action link (`/vendor/booking/[token]`) and vendor accounts —
no vendor view until scale. Out of scope: vendor API integrations, WhatsApp Business API.

---

### Phase 7 — In-trip

**Goal:** during the trip the client always knows what's next and who to call; staff see what's
happening.

- **P7.1** Trip transitions `READY → IN_PROGRESS` on the start date (cron) or manually, `→ COMPLETED`
  after the end date with staff confirmation.
- **P7.2 Client "Today" view:** today's confirmed blocks with time, branch address / map link,
  practitioner, what to bring or expect, the relationship manager's contact. Big and simple; works on a
  phone browser.
- **P7.3 Changes during the trip** go through the relationship manager: staff cancel or rebook blocks
  (Phase 6 flow); the client sees the updated status.
- **P7.4 Staff live board:** trips in progress, today's blocks, declined/cancelled bookings
  highlighted.
- **P7.5 Tests:** transitions unit; e2e: trip starts → client sees today's blocks.

Dropped from the Sept plan: `JourneyEntry` (check-ins, photos, notes, ratings, incidents) — not in the
class diagram v1. Add it only when Nivedith asks for in-trip capture.

---

### Phase 8 — Post-trip & continuity

**Goal:** continuity — pre-discovery → the trip → a **health dossier** of what came out of it, and
lasting **preferences** so the next trip starts from what we already know.

#### Data model

```prisma
model HealthDossier {                   // Trip 1 — 0..1 HealthDossier; SENSITIVE
  id, tripId @unique
  summary String
  documents String[]                    // private storage keys (P8.1), never public URLs
  sharedAt DateTime?                    // set only by an explicit staff action
  createdAt, updatedAt
}

enum PreferenceCategory { DIET ALLERGY MOBILITY LANGUAGE LIKES DISLIKES OTHER }

model ClientPreference {                // Client 1 — 0..* ClientPreference; lasting, across trips
  id, clientId
  category PreferenceCategory, detail String
  source String                         // "discovery call", "AI chat", "staff note", …
  recordedAt DateTime
}
```

#### Tasks

- **P8.1 File storage seam** `src/lib/storage/` (`put`, `getSignedUrl`, `delete`) with a local-disk
  dev implementation and **Vercel Blob (private)**; content-type allowlist (PDF, images), size limits,
  short-lived signed URLs, ownership re-checked on every access.
- **[!] P8.2 Health dossier:** staff compile the summary and upload the trip's documents (e.g. the
  blood-test report — the component's deliverable); "Share with client" sets `sharedAt`; the client
  downloads via signed URLs. AI may draft the summary from the trip's data only (task
  `DOSSIER_SUMMARY`; no medical interpretation; "discuss your results with your doctor" style only).
  **[PENDING INPUT]** what goes in, who compiles it, consent for EU clients' data held by Kerala
  clinics.
- **P8.3 Client preferences:** staff add/edit on the client page; AI proposes preferences from
  conversations (task `PREFERENCE_EXTRACTION`, suggestions only); migrate `Client.generalPreferences`
  into rows (category `OTHER`, source "legacy intake"). Preferences feed P4.1 and P4.2 for later trips.
- **P8.4 Client history + next trip:** trips timeline on the client page; "Plan next trip" creates a
  trip with requirements pre-filled from preferences and the last trip.
- **P8.5 Business reports** `/admin/reports`: trips per month, module mix, vendor confirmation rates and
  response times (from BookingEvents), **AI block keep rate** (AI blocks still there at confirm ÷ AI
  blocks created) — the key metric for the moat.
- **P8.6 Tests:** client A can't fetch client B's documents (integration); dossier invisible until
  shared; e2e: complete trip → dossier shared → client downloads → plan next trip pre-fills.

---

### Phase X — Cross-cutting hardening (before real clients)

- **X.1 Real email** via a provider installed through the Vercel Marketplace (e.g.
  Resend) behind the existing `EmailTransport`; store a `NotificationLog` of what was
  sent to whom and when. Replace `opsInbox()` placeholder.
- **X.2 Consent & data protection.** Clients are international (EU) and data is
  health-adjacent: terms acceptance (`Client.termsAcceptedAt`) covering Kerala clinics holding client
  data; recording consent for call transcripts; privacy notice in portal; retention policy (e.g.
  transcripts deleted N months after the trip); client data export and erasure action (the app
  currently has no delete — design erasure that anonymises while keeping vendor/booking statistics).
  **Flag for a legal review (GDPR, India DPDP Act) — the agent must not claim compliance.**
- **X.3 Shared rate limiter** (Upstash Redis via Marketplace) once multiple instances
  or cron endpoints exist.
- **X.4 Observability:** structured logs already exist; add error reporting and AI cost
  dashboard from `AiRun`.
- **X.5 Pagination** on list views as volumes grow.
- **X.6 AI draft review gate:** decide (with Nivedith) whether staff must approve an AI itinerary
  before the client sees it once real clients use the chat (Phase 4 note).

---

## 5. Backlog (not planned yet)

- **Vendor view / portal** — only at ~100 clients a month per vendor.
- **Commission / referral tracking** per vendor (clients sent, commission owed per month) — once
  volume exists.
- **Phone app** — after the desktop MVP.
- **Public landing page** and website translations — Nivedith is still shaping the pitch.
- **Human chat** in the portal (`STAFF_CHAT` both ways) beyond the "talk to a person" hand-off.
- **In-trip capture** (check-ins, photos, ratings) and a vendor quality score from client feedback.
- **Data-driven vendor question bank** — only if fixed fields stop keeping up with real vendors.

## 6. Open questions (for Vishnu / Nivedith)

Record answers in `docs/platform/PROGRESS.md → Decisions`. Live list with owners: `PROGRESS.md →
Blockers`.

Answered by the 14–15 Oct meetings:

1. ~~Vendor profiling document~~ → the question list (notebook §6.1) and the fields in the class
   diagram; no question bank.
2. ~~Who talks to the client~~ → a relationship manager (Nivedith for the first ~10 clients).
3. ~~Vendor communication~~ → relationship-based; AI-drafted emails sent by staff, phone; no vendor
   view.
4. ~~Prices / payments~~ → prices shown in the builder; payment after confirm, before booking.
5. ~~Tourism vs culture~~ → three modules only: Health, Wellness, Culture (dining under Culture).
6. ~~Result documents~~ → they belong in the post-trip health dossier; its policy is still open (below).

Still open:

7. **AI provider & budget** — Vercel AI Gateway with Claude assumed. Monthly cost ceiling?
8. **Conversation source** — are discovery calls recorded and transcribed by a tool? Is audio upload
   wanted, or is pasted text enough?
9. The 15 Oct questions (notebook §12.3) and the assumptions made in this plan — see Blockers.
