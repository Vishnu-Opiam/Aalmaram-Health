# Platform Build — Progress Tracker

> Maintained by the implementing agent. Update this file in the same commit as the work.
> Status keys: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked (see Blockers)
> Full task descriptions and acceptance criteria: `docs/platform/PLAN.md`.
> Domain model: `docs/platform/class-diagram.md` (v1, 15 Oct 2026).

## Current focus

- Phase: MVP (Phases 1–4) built; next are human reviews of the four stacked PRs, then Phase 5 (payment)
- Branch: `feat/phase-1-vendor-profile` → `feat/phase-2-trips` → `feat/phase-3-portal` → `feat/phase-4-ai`
- Last updated: 2026-10-22

## Phase 0 — Foundations
- [x] P0.1 Baseline health check (typecheck / test / build / e2e results recorded below)
- [x] P0.2 AI gateway module `src/lib/ai/` with fake provider default
- [x] P0.3 `AiRun` model + `/admin/ai-runs`
- [!] P0.4 Evals harness `npm run eval` — not built: no gateway key yet (Blockers)

## Phase 1 — What we offer: vendor profile (BUILD FIRST · MVP)
- [x] P1.1 Schema + migration (Vendor profile fields, `accreditations[]`, Branch, Practitioner, Component duration / recovery time / price unit)
- [x] P1.2 Domain: validation, missing-fields list, client + planner projections (client projection = `src/domain/trips/builder-view.ts`)
- [x] P1.3 Admin vendor profile editor (+ branches, practitioners)
- [x] P1.4 Component editor additions + practitioner links
- [ ] P1.5 Draft vendor profile from website (AI, suggestions only) — needs P0.2–P0.4
- [x] P1.6 Client-facing provider info in portal + leak tests
- [x] P1.7 Seed data (blood test · Swedish massage · Fort Kochi walking tour · multi-branch vendor · restaurant)
- [!] P1.8 First real vendors entered by humans — needs Nivedith's curated list
- [x] P1.9 Vendor list filters + branch / practitioner / missing-field counts

## Phase 2 — Clients & trips (MVP)
- [~] P2.1 Staff roles ADMIN / RELATIONSHIP_MANAGER + client's relationship manager
- [x] P2.2 Schema + migration + backfill (Trip, TripRequirements, Conversation, Itinerary 1:1 Trip, blocks)
- [x] P2.3 Domain: trip status machine, module mix, block rules, block pricing
- [x] P2.4 Admin UI: trips, requirements, conversations, health core
- [x] P2.5 Retire proposal / approval / change-request flow
- [x] P2.6 Privacy (transcripts, summaries, leak tests)
- [x] P2.7 Seed

## Phase 3 — Client portal: Feed + itinerary builder (MVP)
- [x] P3.1 FeedPost + admin feed manager (add / hide / import)
- [!] P3.2 Automated feed ingestion — build the seam now; real sources blocked on a sourcing decision
- [x] P3.3 Portal shell + Feed page
- [x] P3.4 Drag-and-drop itinerary builder with running cost
- [x] P3.5 Block detail (component + provider)
- [x] P3.6 Prices shown to the client
- [~] P3.7 50+ accessibility pass (large type and targets, click alternative to drag, nothing on hover; no formal audit yet)
- [x] P3.8 Tests

## Phase 4 — AI: conversation → requirements → itinerary (MVP)
- [x] P4.1 Requirements extraction + conversation summary
- [x] P4.2 Draft itinerary (`AI` blocks around the health core)
- [x] P4.3 Slot suggestions (`ItineraryRecommendationService`)
- [x] P4.4 Client AI chat + "talk to a person"
- [!] P4.5 Evals fixtures — waits for P0.4 and a key; unit tests cover the deterministic planner and safety checks
- [x] P4.6 Privacy (chat visibility, leak tests)
- [ ] P4.7 (optional) pgvector retrieval

## Phase 5 — Confirm, lock & pay
- [ ] P5.1 Schema + payment status machine
- [~] P5.2 Confirm & lock — confirm/lock/reopen built in Phase 3; terms acceptance pending
- [!] P5.3 Payment seam (fake + manual recording) — build now; real provider and service fee pending
- [ ] P5.4 Admin payments + staff edits after confirm
- [ ] P5.5 What-to-Expect from the confirmed itinerary
- [ ] P5.6 Tests

## Phase 6 — Booking
- [ ] P6.1 Schema + booking status machine
- [ ] P6.2 One booking per block when the trip enters BOOKING
- [ ] P6.3 AI-drafted vendor emails, staff send, BookingEvents (`BOOKING_AUTO_SEND` off)
- [ ] P6.4 Vendor replies recorded by staff (optional AI parse)
- [ ] P6.5 Booking board + overdue cron (flags only)
- [ ] P6.6 Client calendar / green tick
- [ ] P6.7 Declines and changes via the relationship manager
- [ ] P6.8 Trip READY + client notified
- [ ] P6.9 Tests

## Phase 7 — In-trip
- [ ] P7.1 Trip transitions READY → IN_PROGRESS → COMPLETED
- [ ] P7.2 Client "Today" view
- [ ] P7.3 Changes during the trip via the relationship manager
- [ ] P7.4 Staff live board
- [ ] P7.5 Tests

## Phase 8 — Post-trip & continuity
- [ ] P8.1 File storage seam (local + Vercel Blob private)
- [!] P8.2 Health dossier — build the shell now; contents, owner and consent pending
- [ ] P8.3 Client preferences (staff + AI suggestions; migrate `generalPreferences`)
- [ ] P8.4 Client history + plan next trip
- [ ] P8.5 Business reports (incl. AI block keep rate)
- [ ] P8.6 Tests

## Phase X — Hardening (before real clients)
- [ ] X.1 Real email + NotificationLog
- [ ] X.2 Consent, retention, export/erasure (needs legal review — do not claim compliance)
- [ ] X.3 Shared rate limiter
- [ ] X.4 Observability + AI cost view
- [ ] X.5 Pagination
- [ ] X.6 Decide on a staff review gate for AI itineraries

---

## Baseline results (P0.1)

2026-10-22, `d8e4885` (docs-only commit on top of `main` 022921b), fresh local embedded Postgres:
`prisma migrate deploy` ok · `npm run typecheck` clean · `npm test` 7 files / 103 tests passed ·
`npm run build` ok. E2E not run at baseline (first run at the end of Phase 1).

## Eval results

| Date | Task | Model | Prompt version | Score / notes |
| --- | --- | --- | --- | --- |

## Decisions

Record every non-obvious choice: date, decision, why, alternatives rejected.

| Date | Decision | Why |
| --- | --- | --- |
| 2026-09-17 | The four platform lifecycle parts are called **Stages**, not Modules. | `Module` already means Health / Wellness / Heritage content category. |
| 2026-09-17 | Vendor profile questions are data (`ProfileQuestion`), not hard-coded fields. **Superseded 2026-10-15** (simple fields, below). | Nivedith's question document is pending and will evolve. |
| 2026-09-17 | AI via Vercel AI Gateway + AI SDK, fake provider default. | App is on Vercel; tests/dev must run offline and deterministically. |
| 2026-10-15 | PLAN.md and this file rewritten to the class diagram v1 (`class-diagram.md`), which is now the domain source of truth. Existing columns the diagram doesn't mention (`tags`, `costStatus`, notes…) stay. | Agreed with Nivedith on 15 Oct (notebook §12). The diagram lists the domain minimum; dropping working columns would be churn. |
| 2026-10-15 | **Journey and JourneyEntry dropped; Trip replaces Journey.** Client 1→\* Trip, Trip 1→1 Itinerary. Lifecycle on `TripStatus` (PLANNING → AWAITING_PAYMENT → BOOKING → READY → IN_PROGRESS → COMPLETED; CANCELLED); the itinerary locks with `confirmedAt`. | Notebook §12.1 #2–4: a confirmed itinerary already is the journey; one itinerary per trip, built in place. |
| 2026-10-15 | Phases restructured: 0 Foundations · 1 Vendor profile · 2 Clients & trips · 3 Client portal (Feed + builder) · 4 AI · 5 Confirm & pay · 6 Booking · 7 In-trip · 8 Post-trip. MVP = Phases 1–4 plus P0.1–P0.4. Task IDs renumbered. | Nivedith's MVP and build order (§12.1 #16–17). Renumbering is free while no task has started. |
| 2026-10-15 | Sept Phase 4 (proposal versions/diff, change-request threads, client alternatives, templates) dropped. Publish/approve flow and `ChangeRequest` retired; its table is dropped only after a human confirms production holds nothing worth keeping. | One itinerary edited in place; after confirm, changes go through the relationship manager (§12.1 #4, #14). Rejected keeping versions: nothing to diff when the client edits directly. |
| 2026-10-15 | Stages 3–4 renamed In-Journey / Post-Journey → **In-Trip / Post-Trip**. | Trip is the concept now; Journey is gone. |
| 2026-10-15 | **Simple vendor/component fields, no question bank.** `ProfileQuestion`, `VendorProfileAnswer`, the starter bank, question admin and import CLI (Sept P1.3, P1.7, P1.8) dropped; moved to the backlog. | Nivedith gave the questions (§6.1) and the fields (§12.1 #11) and asked to start simple; the bank existed only because his document was pending. |
| 2026-10-15 | `VendorCredential` folded into `Vendor.accreditations String[]`; verification status and evidence uploads dropped. | §12.1 #7. |
| 2026-10-15 | **Branch** added: the vendor keeps an HQ address, branches carry their own address, the client picks a branch per block. | §12.1 #8 — a diagnostics chain with ~100 branches. |
| 2026-10-15 | **Practitioner** added, linked to components by a plain many-to-many (no per-link role); a component's practitioners must belong to its vendor. | §12.1 #9. Per-link roles (performs / reviews results…) are more than "simple fields first" needs. |
| 2026-10-15 | Component gains `durationMinutes` (required), `recoveryTimeMinutes?` and `priceUnit` (PER_PERSON / FOR_TWO / PER_GROUP, replaces free-text `unit`). Existing `clientFacingDescription` and `clientDeliverable` serve as description and deliverable (no rename). Durations are stored in minutes. | §12.1 #11. One unit avoids conversions; renames would be churn. |
| 2026-10-15 | Sept planner attributes dropped: VendorType, ServiceTier, amenities, coordinates, booking channel/lead time, component intensity / time of day / group size, `ComponentDependency`. | Not in the agreed fields. Add back when data or AI evals show the need. |
| 2026-10-15 | Vendor contact person, email, phone and notes are internal; the rest of the vendor profile is client-visible. | We coordinate every booking; the client's contact is their relationship manager. |
| 2026-10-15 | Staff = the existing `User` model (not renamed). Roles become `roles StaffRole[]` with ADMIN / RELATIONSHIP_MANAGER (replaces ADMIN / CURATOR / OPS); moved from P0.5 to P2.1 with `Client.relationshipManager`. | Class diagram `Staff.roles`. Renaming the table is churn for no behaviour. |
| 2026-10-15 | File storage seam moved from P0.6 to P8.1. | Its Sept users (credential evidence, in-journey uploads) are gone; health-dossier documents are the first need. |
| 2026-10-15 | **TripRequirements** (0..1 per trip, edited in place, no versions or evidence quotes) replaces RequirementProfile / RequirementModuleWeight / RequirementInterest. Module mix = `TripModuleShare` rows summing to 100. **ClientPreference** (lasting, across trips) arrives in Phase 8. | §12.1 #12: preferences ≠ requirements. The diagram has one requirements record per trip. |
| 2026-10-15 | `Conversation` replaces `ClientConversation`: channels AI_CHAT / STAFF_CHAT / CALL / EMAIL / WHATSAPP / IN_PERSON, optional link to a trip, `summary` = the brief for the human. | Class diagram; notebook §3 (AI-led first conversation). |
| 2026-10-15 | Health core = blocks with `addedBy = TEAM`; the client can't move or remove them in the builder. **Assumption** — see Blockers. | Notebook §10 question still open; locked is the safe default for health items. |
| 2026-10-15 | Builder = a day-by-day timeline with "+" between blocks and drag to move, not a free-form node canvas. | Keeps Nivedith's "plus between two events" (the n8n idea) in a form 50+ users can manage (notebook §10). |
| 2026-10-15 | Prices are shown to clients (`SHOW_PRICES_TO_CLIENT` on in P3.6). Block price = component price × price unit × travellers, recomputed while PLANNING, frozen at confirm. | "They see the cost of their trip" (§12.1 #16); diagram note on Itinerary. |
| 2026-10-15 | **Payment in scope** (Phase 5): after confirm, before any booking. Fake provider + manual staff recording until a real provider is chosen. | §12.1 #14. The agent provisions no paid services (CLAUDE.md §4). |
| 2026-10-15 | **One Booking per block**, vendor derived through the component; `BookingEvent` internal, the client sees only the status (green tick). Vendor action link and vendor accounts (Sept P5.4) dropped; staff record vendor replies. `BOOKING_AUTO_SEND` stays off. | §12.1 #6; no vendor view until ~100 clients a month per vendor (notebook §2). |
| 2026-10-15 | MVP chatbot itinerary is created instantly as a **draft**: `AI` blocks labelled "Suggested", health core untouched, relationship manager notified, nothing paid or booked before the client confirms. A staff review gate before real clients is X.6. | Resolves the §12.2 conflict between Nivedith's demo ("auto-create acceptable") and the human-in-the-loop guardrail: the client's Confirm is the explicit human action. |
| 2026-10-15 | MVP Feed is filled by staff (add / import `FeedPost`); automated Instagram / news ingestion is a seam, blocked on a sourcing decision. | Scraping Instagram raises terms-of-use questions a human must decide. |
| 2026-10-15 | In-trip capture (`JourneyEntry`: check-ins, photos, ratings, incidents) and the vendor-deliverable upload flow dropped. Documents go into the **HealthDossier**, shared with the client only by an explicit staff action. | Not in the class diagram v1 (§12.1 #3); the dossier is the post-trip continuity (§12.1 #2). |
| 2026-10-15 | Vendor website drafting (P1.5): admin-triggered fetch of a public URL or pasted text; suggestions only; tests use fixtures, never the network. | Notebook §6.3 (scrape → structured output); tests must run offline. |
| 2026-10-15 | Refinements beyond the diagram: Address stored as columns; `FeedPost.externalId` / `hiddenAt`; `Payment.providerReference`; `BookingEvent.actorUserId`; `Conversation.createdById`; `HealthDossier.documents` hold private storage keys, not public URLs. | Needed for de-duplication, moderation, reconciliation, audit and privacy; none changes the diagram's meaning. |
| 2026-10-15 | Backlog, not planned: vendor view, commission tracking, phone app, landing page and translations, two-way human chat, in-trip capture, question bank. | Nivedith, 14–15 Oct: not now. |
| 2026-10-22 | Phase 1 migration drops `Vendor.location`, `Vendor.accreditation` and `Component.unit` in the same migration that data-migrates them (not a follow-up). Unrecognised units → `PER_PERSON`; existing components get a 60-minute duration. | Every reader moved in the same commit, so nothing reads the old columns; a second migration would be ceremony. Old values are all demo seed rows. |
| 2026-10-22 | Branches and practitioners are edited inline on the vendor page (expandable rows), not on separate pages; deactivate via the status field. | Fewer screens for the admin flow module → catalogue → vendor → component; matches "simple fields first". |
| 2026-10-22 | Vendor phone is required by the form (diagram `phone 1..1`), column stays nullable. | Old rows may lack it; the form enforces it on the next save. |
| 2026-10-22 | Work happens in the git worktree `.claude/worktrees/mvp`, not the main checkout. | The main checkout holds untracked older copies of CLAUDE.md / docs and a `.env.local` with a remote `DATABASE_URL`; a separate worktree keeps the local DB the only one in reach. |
| 2026-10-22 | Block times are Kerala wall-clock times stored as "floating" UTC timestamps (09:30 → `09:30Z`, always formatted in UTC). | No server or browser zone can shift a block; Kerala has no DST. A real zone column is only needed if trips ever span zones. |
| 2026-10-22 | Block prices are stored at add time (`blockPrice` = unit price × per person / per two (rounded up) / per group) and recomputed when travellers change while unconfirmed. Staff price overrides (`priceOverride`) dropped. | Diagram: price on the block, frozen at confirm. Overrides can return as a field if the team needs them. |
| 2026-10-22 | One builder component (`src/components/builder/`) serves both the admin trip page (staff add `TEAM` blocks) and the portal (client adds `CLIENT` blocks); permissions are decided server-side in `src/lib/services/itinerary-blocks.ts` and arrive as `block.canEdit`. | One timeline to maintain; the client-safe view model (`builder-view.ts`) is the only shape either screen renders. |
| 2026-10-22 | Staff roles stored (`roles StaffRole[]`) and the relationship manager is assignable, but every staff member can still do everything (no permission split yet). P2.1 stays `[~]`. | MVP has one or two staff; the split needs a decision on what an RM may not do. |
| 2026-10-22 | The What-to-Expect report is shared with the client by "Save and share" on the report page (no longer tied to publishing a proposal). | The publish flow is retired. |
| 2026-10-22 | The migration gives clients that had intake text or trip dates but no itinerary a placeholder trip "First trip (dates to confirm)" so their intake survives as requirements. | Data preservation over neatness; staff can rename or cancel it. |
| 2026-10-22 | Confirm & lock (P5.2) pulled into the MVP: the client's "Confirm my itinerary" reprices once, freezes prices, sets `confirmedAt` and moves the trip to AWAITING_PAYMENT; staff can "Reopen for changes". Payment itself stays Phase 5. | The demo ends at "the final itinerary with its cost" (§12.1 #16); confirm is the explicit human action the AI-draft guardrail relies on. |
| 2026-10-22 | Portal sections live in the route group `src/app/trip/(portal)/`: Feed (`/trip`), Itinerary, Calendar (activities with "Not booked yet" until Booking exists), Chat (Phase 4). The trip is chosen by `?trip=`, defaulting to the next unfinished trip. | Keeps sign-in/access routes outside the portal chrome. |
| 2026-10-22 | Feed posts without an image show a source-coloured placeholder; external images use a plain `<img>`. | `next/image` would need every social CDN host allow-listed; images are optional in the import. |
| 2026-10-22 | `AI_PROVIDER` defaults to `fake` even when a key is present; real models run only with `AI_PROVIDER=gateway` set explicitly (e.g. on the Vercel deployment). Models via AI Gateway: `anthropic/claude-sonnet-5.5` (reasoning), `anthropic/claude-haiku-5.5` (fast), from env. | CLAUDE.md §4: dev and tests never call a real model; the demo deployment can opt in. |
| 2026-10-22 | The fake provider is not a canned fixture but a deterministic implementation: keyword extraction for requirements, the rule-based planner for drafts, a short discovery script for chat. | The demo works offline with sensible results; the same code is the model's fallback and its validation baseline. |
| 2026-10-22 | Itinerary drafting: the planner proposes, the model may re-pick from the same candidates and gaps, `validatePicks` drops anything invalid, and an empty result falls back to the planner. Slot suggestions are deterministic (no model call). | Bounded, testable AI; the "+" stays instant and free. |
| 2026-10-22 | An AI block's one-line reason is stored as its client-facing note ("You asked for Kathakali."), shown to the client; it passes the medical-claims check first. | Explains a suggestion where the client decides on it. PLAN P4.6 said reasons are staff-only; reasons contain no client data, so showing them is safe. |
| 2026-10-22 | "Build my itinerary" from the chat writes requirements only if none exist (never overwrites the team's), then replaces earlier AI blocks only. Staff's "Draft with AI" on the trip page does overwrite requirements (explicit staff action, editable after). | Staff-written requirements are the source of truth. |
| 2026-10-22 | `AiRun.output` holds ids, counts and flags only (no summaries, reasons or transcript text); the logger now also redacts `transcript`, `summary`, `prompt`, `reply`. | CLAUDE.md §4 privacy rules. |
| 2026-10-22 | AI drafts choose a provider's first active branch (by city); the client can change it with "Change time". | The client picks the branch near where they stay; the AI doesn't know that yet. |
| 2026-10-22 | `src/lib/services/itinerary-recommendation.ts` (null stub) removed; suggestions live in `ai-planning.ts` + `domain/ai/planner.ts`. | Dead code once P4.3 landed. |
| 2026-10-15 | `CLAUDE.md` still describes the Sept plan (journeys, In-/Post-Journey, Vendor Profile 2.0 question bank, CURATOR / OPS roles). PLAN.md wins for *what* until CLAUDE.md is updated. **Resolved 2026-10-15**: CLAUDE.md and KICKOFF_PROMPT.md updated to match PLAN.md. | CLAUDE.md §8; updating it was outside this docs change. |

## Blockers / questions for humans

| Raised | Task | Question | Answer |
| --- | --- | --- | --- |
| 2026-09-17 | P1.8 (Sept) | Nivedith's vendor profiling Q&A document — please drop it at `docs/platform/inputs/` | 2026-10-15: superseded. The question list came in the 14 Oct call (notebook §6.1) and the fields on 15 Oct (class diagram); no question bank. |
| 2026-09-17 | P0.2 | AI Gateway key / budget ceiling for evals | 2026-10-22: still needed. The gateway path is built and typechecks but has never been run against a real model; to enable it on the deployment set `AI_PROVIDER=gateway` (+ key or OIDC). P0.4/P4.5 evals wait for this. |
| 2026-09-17 | — | See PLAN.md §6 open questions 7–8 | |
| 2026-10-15 | P1.8 | Nivedith's curated list of trusted vendors (one per module to start) — he'll share access. | |
| 2026-10-15 | P3.4 | Health core: may the client move or remove the team's (`TEAM`) blocks? The plan assumes they are locked. (notebook §10) | |
| 2026-10-15 | P3.2 | Feed: how may we source vendors' Instagram posts (scraping vs official API / embeds, and their terms)? Which Kerala Tourism and news sources, and who decides what counts as "positive"? | |
| 2026-10-15 | P3.4, P3.5 | When a component has several practitioners, can the client choose one? (notebook §12.3) | |
| 2026-10-15 | P5.2, P5.3 | "They pay … a fee also" [?] — is there an Aalmaram service fee on top of vendor prices, alongside the vendor commission and transparent pricing (notebook §7)? (§12.3) | |
| 2026-10-15 | P5.4, P6.7 | Cancellation / refund policy once the client has paid. (§12.3) | |
| 2026-10-15 | P5.2 | Terms & conditions text, including clients agreeing that Kerala clinics will hold their information. | |
| 2026-10-15 | P5.3 | Which payment provider for real payments? (The agent provisions no paid service.) | |
| 2026-10-15 | P6.1 | Booking ↔ vendor was briefly called "many-to-many"; the diagram resolves it as booking → one block → one component → one vendor (at the chosen branch). Please confirm. (§12.3) | |
| 2026-10-15 | P8.2, X.2 | Health dossier: what goes in (vendor reports, doctor notes?), who compiles it, and EU clients' consent for Kerala clinics holding their data (T&C). (§12.3) | |
| 2026-10-15 | X.6 | The MVP chatbot shows its itinerary at once. Before real clients, must staff approve an AI itinerary before the client sees it? | |
| 2026-10-15 | — | Croatian / German / Slovenian website translations — which website? Outside this plan. (§12.3) | |

## Session log

Append one short entry per working session: date, branch, tasks touched, test status, next step.

- **2026-10-15** · `claude/optimistic-haslett-e831b1` · Docs only: PLAN.md and PROGRESS.md revised to the class diagram v1 and the 14–15 Oct decisions (no code or schema changes). Tests not run (nothing executable changed). Next: P0.1 baseline, then Phase 1 in the build order of PLAN.md §4.
- **2026-10-22 · MVP build plan** (goal: a demo Vishnu can show — admin vendor tool + client Feed + builder with cost + AI chat → itinerary).
  Stacked branches, one per phase, each from the previous: `feat/phase-1-vendor-profile` → `feat/phase-2-trips` →
  `feat/phase-3-portal` → `feat/phase-4-ai`.
  1. **Phase 1** — migration (Vendor profile fields + `accreditations[]`, HQ address, Branch, Practitioner,
     ComponentPractitioner, Component `durationMinutes` / `recoveryTimeMinutes` / `priceUnit`, data-migrating
     `location`, `accreditation`, `unit`); `src/domain/vendors/` (missing fields, client projection, block-price
     unit maths); vendor editor with branches + practitioners; component editor additions; vendor list counts;
     seed (blood test, Swedish massage, Fort Kochi walk, multi-branch lab, restaurant `FOR_TWO`, one incomplete vendor).
  2. **Phase 2** — migration + backfill (`User.roles`, Client profile fields + relationship manager, Trip,
     TripRequirements + TripModuleShare, Conversation, Itinerary 1:1 Trip with `confirmedAt`, blocks with
     `startsAt` / `addedBy` / `price` / `branchId`); `src/domain/trips/` (status table, module mix, block rules,
     pricing); admin trip page (requirements, conversations, health-core builder); publish / approve / change
     request flow retired.
  3. **Phase 3** — FeedPost + `/admin/feed`; portal shell (Feed · Itinerary · Calendar "soon" · Chat); timeline
     builder: "+" between blocks → suggestions or module → catalogue → component → branch → time; drag a block
     to another day; running total; health core locked; Confirm & lock (sets `confirmedAt`, freezes prices,
     trip → AWAITING_PAYMENT — the payment itself stays Phase 5).
  4. **Phase 4** — `src/lib/ai/` (`generateStructured`, fake provider default, AI Gateway provider behind a key),
     `AiRun` + `/admin/ai-runs`; requirements extraction; deterministic draft planner (slot budget → candidates →
     selection) placing `AI` blocks; slot suggestions; client chat with "Build my itinerary" and "Talk to a person".
  Deferred past the demo (noted, not built): P0.4 eval harness and P4.5 eval fixtures (no model key yet),
  P1.5 vendor drafting from a website, P3.2 automated feed ingestion (blocked), role-based permission split
  (roles stored, every staff member can still do everything).
- **2026-10-22 · MVP build** · branches `feat/phase-1-vendor-profile` (8da2400) → `feat/phase-2-trips` (f04e186) →
  `feat/phase-3-portal` (00149be) → `feat/phase-4-ai`. Built Phases 1–4 of the plan above, plus Confirm & lock from
  Phase 5. Verification at the end of Phase 4: `npm run typecheck` clean; `npm test` 134 passed (10 files);
  `npm run test:e2e` 2 passed (golden path: admin health core → client Feed → add + drag → AI chat build → confirm;
  inventory incl. branches/practitioners); `next build` ok (inside the e2e run). Lint not run: `next lint` is not
  configured in this repo (interactive setup). Browser check of admin vendor, trip and builder pages done in the dev
  server; the browser pane was hidden for part of the session, so drag-and-drop was verified by Playwright instead.
  Not done: evals (no key), real Instagram/news ingestion (P3.2), staff permission split (P2.1), formal accessibility
  audit (P3.7). Next: human review of the four PRs (merge in order), then Phase 5 (payment).
