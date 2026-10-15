# Aalmaram Health Care Platform — Implementation Plan

> Source: product call with Nivedith (Sept 2026). This document turns that call into
> a phased, buildable plan on top of the existing Pre-Journey MVP. Anything marked
> **[PENDING INPUT]** depends on material Nivedith has said he will share.

---

## 1. The product in one picture

```
   ┌────────────────────┐          ┌──────────────────────┐
   │  VENDOR PROFILES   │          │ CLIENT REQUIREMENTS  │
   │ (what we can offer │          │ (what the client     │
   │  and how trustworthy│         │  wants, from the     │
   │  / premium it is)  │          │  conversation)       │
   └─────────┬──────────┘          └──────────┬───────────┘
             │         two inputs             │
             └───────────────┬────────────────┘
                             ▼
  ┌──────────────────────────────────────────────────────────────────┐
  │ STAGE 1  INTAKE & CURATION                                       │
  │  conversation → module mix (e.g. 40% health / 30% wellness /     │
  │  30% culture) → pick components per module by interests →        │
  │  AI draft itinerary → human finalises with client → client edits │
  │  → client confirms                                               │
  ├──────────────────────────────────────────────────────────────────┤
  │ STAGE 2  BOOKING       automated appointment/booking requests    │
  │                        to vendors, tracked to confirmation       │
  ├──────────────────────────────────────────────────────────────────┤
  │ STAGE 3  IN-JOURNEY    data, photos, documents, check-ins        │
  │                        captured and saved during the trip        │
  ├──────────────────────────────────────────────────────────────────┤
  │ STAGE 4  POST-JOURNEY  "what you did on this trip" reports,      │
  │                        feedback, history for the next visit      │
  └──────────────────────────────────────────────────────────────────┘
```

**The moat, in Nivedith's words:** how well an AI can understand a client conversation
and plan an itinerary from the components it has access to. That quality is capped by
how good the **vendor profiles** are — so vendor profiling is the first priority.

### Terminology (important — avoid a naming collision)

The call uses "module" for two different things. In code and docs we keep them apart:

| Term in call | Term in this codebase | Meaning |
| --- | --- | --- |
| "modules" (health / wellness / tourism-culture) | **Module** (existing Prisma model) | Content category. `Module → Catalogue → Component`. |
| "components" | **Component** (existing) | The sellable unit a vendor provides. |
| "the 4 modules of the system" | **Stage** (new term) | Platform lifecycle: Curation, Booking, In-Journey, Post-Journey. Never call these "modules" in code. |
| "vendor profile" | **Vendor profile** | Vendor + practitioners + credentials + question-bank answers (Phase 1). |
| "client requirements" | **Requirement profile** | Structured, versioned output of intake conversations (Phase 2). |
| "draft itinerary" | **Itinerary** in `DRAFT` with `origin = AI_DRAFT` | Existing lifecycle is reused. |

---

## 2. Where we are today (baseline)

Already built and tested (see `README.md`):

- Admin: vendors, modules, catalogues, components CRUD; clients with free-text intake
  fields (`healthInterests`, `wellnessInterests`, `culturalInterests`, …).
- Manual itinerary builder, pricing (Decimal), validation, What-to-Expect report.
- Proposal lifecycle `DRAFT → READY_FOR_REVIEW → PUBLISHED → CHANGES_REQUESTED/APPROVED`.
- Client portal via hashed magic-link token; approve / request change.
- Activity log, email abstraction (log transport only), rate limiting.
- `ItineraryRecommendationService` interface with a null implementation — the intended
  seam for AI curation.
- Deployed on Vercel + Neon Postgres. **Pushing to `main` deploys production.**

Gaps against the vision:

| Area | Gap |
| --- | --- |
| Vendor profile | Only name/contact/location/one accreditation string. Nothing about practitioners, trust, tier/premium-ness, amenities, booking method. |
| Client requirements | Free-text boxes. No conversation capture, no module weights, no structured interests, no tier/budget/pace. |
| AI curation | None. |
| Finalisation | One-message change requests; no proposal versions/diff. |
| Booking | None (item status `CONFIRMED` exists but is manual and unused). |
| In-journey | None. |
| Post-journey | None. |
| Platform | Single ADMIN role, no real email, no file storage, no consent/retention handling for health-adjacent data. |

---

## 3. Guiding principles (apply to every phase)

1. **Human in the loop for anything client- or vendor-facing.** AI drafts; a person
   approves. Nothing AI-generated is published, sent, or booked without an explicit
   human action (until a phase explicitly introduces a configurable auto-send flag).
2. **Deterministic where possible, LLM where necessary.** Slot allocation, module-mix
   math, validation, status machines and pricing are plain TypeScript in `src/domain/`,
   unit-tested. The LLM handles language understanding and judgement-based selection,
   always via schema-validated structured output, always constrained to IDs we supplied.
3. **Every AI call is auditable.** Model, prompt version, token counts, cost, latency,
   outcome and the entity it touched are recorded (`AiRun`).
4. **No medical claims, no diagnosis.** We curate experiences and coordinate providers.
   Extend the existing "report makes no medical claim" test pattern to all AI output.
5. **The client portal renders projections, never models.** Every new admin-only field
   (AI rationale, vendor internal scores, verification evidence, transcripts) must be
   added to the "never appears in client projection" integration test.
6. **Question-driven vendor profiles.** Profiles exist to answer (a) the questions a
   client asks and (b) the questions the curation AI asks. The question bank is data,
   not hard-coded form fields, so Nivedith's document can be loaded without a rewrite.
7. **Ship vertical slices.** Each phase ends with schema + domain + admin UI + tests +
   seed data + README section, and the app still builds and deploys.

---

## 4. Phases

Order is deliberate: AI quality depends on profile quality, curation depends on
requirements, booking depends on confirmed itineraries, and so on.

| Phase | Name | Depends on | Priority |
| --- | --- | --- | --- |
| 0 | Foundations (AI gateway, AiRun, fake provider, evals harness, roles) | — | Must |
| 1 | **Vendor Profile 2.0** | 0 | **Top — boss priority** |
| 2 | Client Requirement capture | 0 | Must |
| 3 | AI Curation engine (draft itinerary) | 1, 2 | Must — the moat |
| 4 | Finalisation with client (versions, diff, threads, confirm) | 3 | Should |
| 5 | Booking stage | 4 | Must |
| 6 | In-Journey stage | 5 | Must |
| 7 | Post-Journey stage | 6 | Must |
| X | Cross-cutting hardening (email, consent, retention, RBAC, observability) | runs alongside | Must before real clients |

Task IDs (e.g. `P1.3`) are tracked in `docs/platform/PROGRESS.md`.

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

**P0.5 Roles.** Extend `UserRole` to `ADMIN | CURATOR | OPS`. Keep guards simple:
`requireRole(...roles)`. ADMIN can do everything; CURATOR = inventory + clients +
itineraries; OPS = bookings + journeys. Existing users stay ADMIN. Add tests.

**P0.6 File storage seam.** `src/lib/storage/` interface (`put`, `getSignedUrl`,
`delete`) with a local-disk dev implementation and a **Vercel Blob (private)**
implementation. Needed by P1 (credential evidence), P6 (photos/documents). Enforce
content-type allowlist and size limits at the seam.

**Acceptance:** all existing tests still green; a unit test exercises `generateStructured`
with the fake provider including the repair-retry path; `AiRun` rows appear; `/admin/ai-runs`
renders; no behaviour change for existing screens.

---

### Phase 1 — Vendor Profile 2.0 (TOP PRIORITY)

**Goal:** a vendor profile that can answer every question a *client* has about a provider
and every question the *curation AI* needs to choose between providers.

Examples straight from the call:
- Client: *"If I do Medivision's diagnostic test, who is the physician who will read my
  report and explain it to me?"* → practitioners linked to components with a role.
- Client: *"How trustworthy is this place?"* → accreditations, registrations, years
  operating, verification status, (later) aggregated feedback.
- AI: *"My client is premium; is this a premium facility with premium amenities?"* →
  service tier, amenities, facility type.

**[PENDING INPUT]** Nivedith is preparing a document of questions & answers for vendor
profiling. Build the infrastructure now with a starter question bank (below); when the
document arrives, load it as data (P1.8). Do not block on it.

#### Data model (Prisma sketch — refine during implementation)

```prisma
enum VendorType { HOSPITAL DIAGNOSTIC_CENTRE SPECIALITY_CLINIC AYURVEDA_CENTRE
                  WELLNESS_RETREAT RESORT_SPA YOGA_STUDIO EXPERIENCE_OPERATOR
                  TRANSPORT ACCOMMODATION OTHER }
enum ServiceTier { ESSENTIAL STANDARD PREMIUM LUXURY }
enum VerificationStatus { UNVERIFIED SELF_REPORTED DOCUMENT_VERIFIED SITE_VISITED }
enum AnswerSource { ADMIN_ENTERED VENDOR_SUBMITTED AI_EXTRACTED }

// Vendor: ADD fields (keep existing ones; migrate `accreditation` text into VendorCredential)
//   type VendorType, tier ServiceTier?, clientSummary String? (client-safe blurb),
//   yearEstablished Int?, website String?, city String?, district String?,
//   latitude Decimal?, longitude Decimal?, languages String[],
//   amenities String[]   (controlled vocabulary, see domain/vendors/amenities.ts),
//   bookingChannel (EMAIL | PHONE | WHATSAPP | VENDOR_LINK | API)?, bookingLeadTimeHours Int?,
//   cancellationPolicy String?, profileReviewedAt DateTime?, profileReviewedById String?,
//   clientProfileVisible Boolean @default(false)

model Practitioner {
  id, vendorId, name, title            // "Dr." etc.
  role                                 // e.g. "Consultant Radiologist", "Ayurveda Physician (BAMS)"
  qualifications String[]              // MBBS, MD (Radiology), BAMS, ...
  registrationBody String?             // e.g. Travancore-Cochin Medical Council / State council
  registrationNumber String?           // ADMIN-ONLY
  verification VerificationStatus
  yearsExperience Int?, languages String[], specialties String[]
  clientBio String?, photoKey String?, clientVisible Boolean @default(false)
  status RecordStatus
}

model ComponentPractitioner {          // answers "who performs / who reads my report"
  componentId, practitionerId
  role  (PERFORMS | REVIEWS_RESULTS | CONSULTS | SUPERVISES)
  @@id([componentId, practitionerId, role])
}

model VendorCredential {               // accreditations, licences, classifications
  id, vendorId
  kind (ACCREDITATION | LICENCE | CLASSIFICATION | AWARD | INSURANCE)
  name        // e.g. NABH, NABL, JCI, AYUSH licence, Kerala Tourism Green Leaf/Olive Leaf
  issuer String?, identifier String? (admin-only), validFrom DateTime?, validUntil DateTime?
  evidenceKey String? (storage key, admin-only), verification VerificationStatus
  clientVisible Boolean @default(true)
}

model ProfileQuestion {                // the question bank — DATA, not code
  id, key String @unique               // "diagnostics.report_reviewer", "facility.private_rooms"
  section String                       // "Trust & credentials", "Facility & amenities", ...
  prompt String                        // human wording
  helpText String?
  audience  ProfileAudience[]          // CLIENT | CURATION_AI | OPERATIONS
  answerType (TEXT | LONG_TEXT | BOOLEAN | NUMBER | SINGLE_SELECT | MULTI_SELECT | DATE | FILE)
  options Json?                        // for selects
  appliesToVendorTypes VendorType[]    // empty = all
  requirement (REQUIRED | RECOMMENDED | OPTIONAL)
  clientVisible Boolean                // may the answer appear in the client portal?
  sortOrder Int, status RecordStatus, createdAt, updatedAt
}

model VendorProfileAnswer {
  id, vendorId, questionId
  value Json                           // validated against answerType in domain layer
  source AnswerSource, verification VerificationStatus
  evidenceNote String?, aiRunId String?
  answeredById String?, updatedAt
  @@unique([vendorId, questionId])
}
```

Component-level attributes the planner needs (ADD to `Component`):
`durationMinutes Int?`, `spansDays Int @default(1)` (multi-day programmes),
`physicalIntensity (LOW|MODERATE|HIGH)?`, `preferredTimeOfDay (MORNING|AFTERNOON|EVENING|ANY)?`,
`minAdvanceBookingHours Int?`, `preparationNotes String?` (client-facing, e.g. fasting
before a blood panel), `languages String[]`, `maxGroupSize Int?`, `accessibilityNotes String?`,
`followsComponentIds` / prerequisite rules (optional; can be a small join table
`ComponentDependency(componentId, requiresComponentId, kind: MUST_PRECEDE | SAME_VENDOR_FOLLOWUP)`
— e.g. "Results review consultation" must follow "Full-body MRI").

#### Tasks

- **P1.1 Schema + migration** for the above. Migrate existing `Vendor.accreditation`
  text into a `VendorCredential` row (data migration inside the SQL migration or a
  one-off script run by the migration step — must be idempotent). Keep old column until
  P1 is complete, then remove in a follow-up migration.
- **P1.2 Domain layer `src/domain/vendors/`:** answer value validation per `answerType`;
  `computeProfileCompleteness(vendor, questions, answers)` → `{ score 0-100,
  missingRequired[], missingRecommended[], expiredCredentials[], unverifiedClaims[] }`;
  controlled vocabularies (`amenities.ts`, `vendorTypes.ts`); `vendorClientProjection()`
  (client-safe fields only); `vendorPlannerProjection()` (compact, token-efficient
  representation for the LLM). Unit tests for all.
- **P1.3 Starter question bank** in `prisma/data/profile-questions.ts` (seeded, upserted
  by `key`). Must include at minimum:
  - *Trust & credentials:* accreditations held; registrations; years operating;
    who is the medical director/lead practitioner; insurance/liability cover;
    international patients served per year; complaint/escalation process.
  - *Practitioners:* who performs each service; **who reviews/interprets results and
    explains them to the client**; practitioner languages; whether the client can speak
    to the practitioner before booking.
  - *Diagnostics-specific:* turnaround time for results; report format and language;
    in-person vs remote results discussion; whether reports can be shared with the
    client's home doctor; imaging equipment (e.g. MRI field strength).
  - *Ayurveda/wellness-specific:* physician-led vs therapist-led; consultation before
    treatment; residential vs day programmes; diet provided; certifications
    (e.g. Kerala Tourism Green Leaf / Olive Leaf).
  - *Facility & premium signals:* facility type; private rooms/suites; separate
    international patient lounge; dedicated coordinator; airport/hotel transfers;
    wait times; cleanliness/hygiene standards; accessibility (wheelchair, lifts);
    amenities list; typical clientele (domestic/international, premium).
  - *Operations:* booking channel and contact; lead time; cancellation/reschedule
    policy; operating hours & days; payment terms; languages of front desk.
  Tag each with `audience` and `clientVisible` sensibly (registration numbers,
  payment terms, internal contacts are never client-visible).
- **P1.4 Admin UI — vendor profile editor** at `/admin/vendors/[id]/profile`:
  sectioned form rendered from the question bank (filtered by vendor type); practitioners
  sub-list (CRUD); credentials sub-list (CRUD + evidence upload via P0.6 + expiry);
  completeness meter with "what's missing" list; verification badge per answer;
  "mark profile reviewed" action. Follow existing form patterns (`runAction`,
  `useActionRedirect`, primitives, field errors).
- **P1.5 Component editor additions:** new attributes; link practitioners with roles;
  dependencies. Show on component detail page.
- **P1.6 AI-assisted profile drafting.** On the profile page: "Draft from source text" —
  admin pastes brochure/website text (no web scraping in v1). `generateStructured`
  (task `VENDOR_PROFILE_EXTRACTION`) maps it to question keys + practitioners +
  credentials. Results land as **suggestions** (`source = AI_EXTRACTED`,
  `verification = UNVERIFIED`) that the admin accepts/edits/rejects per field. Never
  overwrite an existing human-entered answer silently. Fake-provider fixture + eval
  fixtures (2–3 fictional vendors).
- **P1.7 Question bank admin** at `/admin/profile-questions`: list/create/edit/reorder/
  deactivate questions. Deactivating keeps historical answers.
- **P1.8 Question import.** `npm run profile-questions:import -- <file.csv|json>`:
  upsert by `key`, dry-run by default, prints a diff. This is how Nivedith's document
  gets loaded. Document the expected CSV columns in the README.
- **P1.9 Client-facing "Who you'll see" / "About this provider"** in the portal
  itinerary view: vendor client summary, client-visible credentials (verified only),
  client-visible practitioners on each item with role (e.g. "Your results will be
  reviewed by Dr. X, Consultant Radiologist"). Only when `clientProfileVisible` and
  verification ≥ `DOCUMENT_VERIFIED` for credentials. Extend the projection
  integration test to assert registration numbers, evidence keys, payment terms and
  internal answers never appear.
- **P1.10 Seed data.** Enrich the six demo vendors with full profiles, practitioners,
  credentials and component attributes (all fictional, suffixed `(demo)`), including a
  deliberately incomplete vendor to demo the completeness meter.
- **P1.11 Vendor list upgrades:** filter by type, tier, completeness band, "has expired
  credentials"; column for completeness.

**Acceptance:** an admin can fully profile a diagnostic centre, link a radiologist as
`REVIEWS_RESULTS` on an MRI component, and the client portal shows that radiologist on
the MRI item; completeness and expiry are computed and unit-tested; AI drafting works
with the fake provider end-to-end and creates suggestions only; importing a CSV of
questions is idempotent; e2e test covers profile → portal display.

---

### Phase 2 — Client Requirement capture

**Goal:** turn discovery conversations into a structured, human-confirmed
**requirement profile**, including the module mix (e.g. 40/30/30).

#### Data model

```prisma
model ClientConversation {
  id, clientId
  channel (DISCOVERY_CALL | FOLLOW_UP_CALL | EMAIL | WHATSAPP | IN_PERSON | OTHER)
  occurredAt DateTime
  transcript String            // SENSITIVE — never logged, never client-visible
  sourceFormat (PASTED_TEXT | UPLOADED_FILE)     // audio transcription is a later add-on
  consentConfirmed Boolean     // admin attests client agreed to recording/notes use
  createdById, createdAt
}

model RequirementProfile {
  id, clientId, version Int, status (DRAFT | CONFIRMED | SUPERSEDED)
  serviceTier ServiceTier?          // premium expectations
  budgetMin Decimal?, budgetMax Decimal?, budgetCurrency String?
  pace (RELAXED | BALANCED | PACKED)?
  travelParty Json?                 // adults, children, companions' interests
  languages String[]
  mobilityNotes String?, dietaryNotes String?
  wellbeingGoals String?            // non-diagnostic wording only
  mustHaves String[], avoid String[]
  dateConstraints Json?             // arrival/departure, blocked dates, preferred rest days
  summary String?                   // curator-readable summary
  origin (AI_EXTRACTED | MANUAL), aiRunId String?
  confirmedById String?, confirmedAt DateTime?, createdAt, updatedAt
  moduleWeights RequirementModuleWeight[]
  interests     RequirementInterest[]
  @@unique([clientId, version])
}

model RequirementModuleWeight { profileId, moduleId, percent Int  @@id([profileId, moduleId]) }
// invariant (domain-validated): percents over ACTIVE modules sum to exactly 100

model RequirementInterest {
  id, profileId, label String, moduleId String?, tags String[]
  strength (MUST | STRONG | NICE_TO_HAVE | AVOID)
  evidenceQuote String?, conversationId String?   // traceability back to the transcript
}
```

#### Tasks

- **P2.1 Schema + migration.** Keep the existing `Client` intake fields; treat them as
  legacy input that pre-fills a manual RequirementProfile.
- **P2.2 Domain `src/domain/requirements/`:** weight normalisation (largest-remainder
  rounding to integers summing to 100), validation (sum = 100, only active modules,
  0–100), versioning rules (confirming v2 supersedes v1), transcript parsing helper that
  accepts the `Speaker\nText\n\n` format used by our call-recording exports and plain text.
- **P2.3 Admin UI on client page:** "Conversations" tab (add/paste/upload .md/.txt,
  consent checkbox required, view); "Requirements" tab showing current profile with
  editable module-mix sliders/inputs constrained to 100%, interests table with strength
  and evidence quote (click → highlights in transcript), tier/budget/pace/etc.,
  version history.
- **P2.4 AI extraction.** "Extract requirements from conversations" → task
  `REQUIREMENT_EXTRACTION` over all conversations for the client → new DRAFT
  RequirementProfile with weights, interests (each with evidence quote that must be a
  verbatim substring of a transcript — validate deterministically; drop or flag
  otherwise), and `openQuestions[]` (things the curator should ask next).
  Instruct the model to infer module weights from emphasis and time spent, and to say
  "unknown" rather than guess tier/budget. Curator edits then **confirms**.
- **P2.5 Privacy:** transcripts redacted from logger; excluded from `AiRun.output`;
  never in client projections; add to the projection-leak test. Minimise PII sent to
  the model (strip emails/phones from transcripts before sending; client name replaced
  with "the client").
- **P2.6 Evals:** 4–6 fictional transcripts (e.g. premium executive health focus; Ayurveda
  retreat seeker; culture-heavy couple with light wellness; family with mobility limits)
  with expected weight bands (±10pp), must-have interests, tier.
- **P2.7 Seed:** one demo client with a conversation and a confirmed profile.

**Acceptance:** paste a transcript → draft profile with weights summing to 100 and
evidence-linked interests → curator edits and confirms → v1 CONFIRMED; editing later
creates v2. Works offline with fake provider; unit + integration + one e2e test.

---

### Phase 3 — AI Curation engine (draft itinerary)

**Goal:** from a confirmed requirement profile + vendor/component inventory, produce a
dated DRAFT itinerary that respects the module mix and interests, with admin-only
rationale per item, which the curator then refines in the existing builder.

#### Pipeline (implement as `src/domain/curation/` + `src/lib/services/curation.ts`)

1. **Slot budget (deterministic).** Trip days × slots/day by pace
   (RELAXED 2, BALANCED 3, PACKED 4; arrival and departure days count as half). Reserve
   rest slots if requested. Allocate slots to modules from weights using largest
   remainder. Multi-day components (`spansDays > 1`) consume slots across days.
2. **Candidate retrieval (deterministic).** Per module: active components with active
   vendors; exclude AVOID interests; tier compatibility (premium client → vendor tier ≥
   PREMIUM unless no alternative, flagged); language fit; intensity vs mobility notes;
   lead-time vs trip start. Score = interest/tag overlap (+ optional embedding similarity
   later, P3.9). Keep top `3 × slots` per module, minimum 5.
3. **LLM planning (task `ITINERARY_DRAFT`).** Input: requirement profile (no PII),
   slot budget, candidates via `vendorPlannerProjection` + component attributes +
   dependencies. Output schema:
   ```ts
   { days: [{ date: "YYYY-MM-DD", items: [{ componentId, timeOfDay, rationale,
               interestLabels: string[] }] }],
     unmetInterests: [{ label, reason }], curatorNotes: string }
   ```
   Every `componentId` must be from the candidate set — validated; one repair retry.
4. **Fitness check (deterministic)** → `CurationFitReport`: actual vs target module mix
   (flag > ±10pp), per-day intensity, dependency order (e.g. results review after MRI),
   duplicate components, same-day locations too far apart (haversine on vendor coords;
   threshold configurable), lead-time violations, tier mismatches, budget estimate vs
   budget range using existing pricing.
5. **Persist.** New `Itinerary` (`status = DRAFT`, `origin = AI_DRAFT`,
   `requirementProfileId`, `aiRunId`) with items scheduled; `ItineraryItem.aiRationale`
   (admin-only) and `interestLabels`. Store the fit report as JSON on the itinerary
   (`curationReport Json?`). Never auto-publish.

#### Tasks

- **P3.1** Schema additions (`Itinerary.origin`, `requirementProfileId`, `aiRunId`,
  `curationReport`; `ItineraryItem.aiRationale`, `interestLabels`, `timeOfDay`).
- **P3.2** Slot budget + allocation domain functions with exhaustive unit tests
  (rounding, 1-day trips, 0% modules, multi-day programmes).
- **P3.3** Candidate retrieval + scoring, unit + integration tests.
- **P3.4** Planner prompt + structured output + fake fixtures + ID-constraint validation.
- **P3.5** Fitness check domain + tests.
- **P3.6** Implement `ItineraryRecommendationService` properly (replace the null
  service in production wiring) and a `generateDraftItinerary(clientId, profileId)`
  service; activity log entries.
- **P3.7** Admin UI: "Generate draft itinerary" on the client page (requires a
  CONFIRMED requirement profile); builder shows a **module mix panel** (target vs
  actual bars), fit warnings, per-item rationale, and **"Swap"** (ranked alternatives
  from the same module/slot) and **"Regenerate this day"** actions.
- **P3.8** Evals: for each Phase 2 fixture, run extraction→planning and score: mix within
  tolerance, all MUST interests covered or listed as unmet with reason, no dependency
  violations, no hallucinated IDs, no medical claims in rationale/curatorNotes.
- **P3.9 (optional, after P3.8 baseline)** pgvector embeddings for components/vendors
  (Neon supports pgvector) to improve retrieval; only if evals show retrieval misses.
- **P3.10** Extend projection-leak test: `aiRationale`, `curationReport`, `origin`,
  interest evidence never reach the client.

**Acceptance:** with seed data and fake provider, one click creates a valid draft that
passes publication validation after curator review; real-model evals meet the targets
recorded in PROGRESS.md; e2e: confirm requirements → generate → swap an item → publish.

---

### Phase 4 — Finalisation with the client

**Goal:** support "a human talks to the customer, the customer makes changes, and they
confirm" cleanly, before money and vendors get involved.

- **P4.1 Proposal versions.** On each publish, snapshot the client projection
  (`ItineraryVersion { itineraryId, version, snapshot Json, publishedAt }`). Client
  portal shows "What changed since last version" (added/removed/moved items); admin sees
  the same diff.
- **P4.2 Change-request threads.** `ChangeRequestMessage` (author CLIENT | STAFF) so a
  request becomes a conversation; email notifications keep message bodies out of email
  (existing privacy rule).
- **P4.3 Client-side lightweight edits (optional, flag-gated):** client may mark items
  as "prefer to skip" or pick between curator-offered alternatives
  (`ItineraryItemAlternative`), which creates a structured change request rather than
  editing the itinerary directly.
- **P4.4 "Confirm & proceed to booking."** Approval gains explicit acknowledgement of
  cancellation policies aggregated from vendor profiles. Approval creates a `Journey`
  (Phase 5) in `BOOKING` state.
- **P4.5 Duplicate itinerary / templates** (README Phase 2 recommendation #3).

**Acceptance:** republish shows accurate diff; threaded requests work both sides;
approval hands off to booking; tests at all levels.

---

### Phase 5 — Booking stage

**Goal:** after approval, request, track and confirm every appointment/booking with
vendors, automating the routine parts and surfacing exceptions to OPS.

#### Data model

```prisma
model Journey {                     // created on approval; owns stages 2–4
  id, clientId, itineraryId @unique
  status (BOOKING | READY | IN_PROGRESS | COMPLETED | CANCELLED)
  startsOn, endsOn, createdAt, updatedAt
}

model Booking {
  id, journeyId, itineraryItemId @unique, vendorId
  status (DRAFT | REQUESTED | CONFIRMED | DECLINED | ALTERNATIVE_PROPOSED
          | CANCELLED | NO_RESPONSE)
  requestedStart DateTime, requestedEnd DateTime?
  confirmedStart DateTime?, confirmedEnd DateTime?
  channel BookingChannel, vendorReference String?
  vendorTokenHash String? @unique, vendorTokenExpiresAt DateTime?
  lastContactAt DateTime?, reminderCount Int @default(0)
  notes String?  // OPS-only
}

model BookingEvent {
  id, bookingId
  type (CREATED | REQUEST_SENT | REMINDER_SENT | VENDOR_CONFIRMED | VENDOR_DECLINED
        | VENDOR_PROPOSED_ALTERNATIVE | ALTERNATIVE_ACCEPTED | MANUALLY_CONFIRMED
        | CANCELLED | ESCALATED)
  actorType (STAFF | VENDOR | SYSTEM), actorUserId?, payload Json?, createdAt
}
```

#### Tasks

- **P5.1** Schema; **booking status machine** in `src/domain/bookings/status.ts` with
  allowed transitions and unit tests (mirrors the itinerary status machine style).
- **P5.2** On approval: create `Journey` + one `DRAFT` booking per non-removed item,
  requested time from `scheduledDate` + `timeOfDay` (+ component duration).
- **P5.3 OPS booking board** `/admin/journeys/[id]/bookings`: grouped by vendor; bulk
  "Send requests" (human gate); per-booking manual confirm (for phone/WhatsApp vendors),
  record vendor reference, cancel, reschedule.
- **P5.4 Vendor action link** `/vendor/booking/[token]`: reuse the hashed-token pattern
  from `src/lib/auth/access-token.ts`. Vendor sees only what they need (date/time,
  service, party size, client first name + initial, special requirements marked
  relevant by OPS) and can Confirm / Decline / Propose alternative time. Rate limited.
  No vendor accounts in v1.
- **P5.5 Outbound messages.** Booking request/reminder/cancellation emails to vendors
  via the notification layer; per-vendor message grouping (one email listing all that
  vendor's bookings). AI-drafted personalised notes are optional (`MESSAGE_DRAFT` task),
  always shown to OPS before sending.
- **P5.6 Reminders & escalation.** Vercel Cron → `/api/cron/bookings` (secret-protected,
  idempotent): remind after N hours without response (from vendor lead time), escalate to
  OPS after M reminders (`NO_RESPONSE`). Config via env.
- **P5.7 Alternatives.** If a vendor proposes a new time that breaks the day plan or
  dependency order, run the Phase 3 fitness check and show OPS the impact; if accepted,
  update the item and notify the client (client sees a "schedule updated" notice).
- **P5.8** When all bookings are CONFIRMED (or CANCELLED with OPS acknowledgement) →
  `Journey.READY`; client notified; portal shows the **confirmed schedule** with
  preparation notes (e.g. fasting) and addresses.
- **P5.9** Flag `BOOKING_AUTO_SEND` (default `false`) to later allow sending requests
  without the human gate. Document it; do not enable.
- **P5.10** Tests: status machine unit; integration for token isolation (vendor A
  cannot see vendor B's booking; expired/reused tokens), cron idempotency; e2e: approve →
  send requests → vendor confirms via link → journey READY → client sees schedule.

Out of scope for v1: payments, vendor API integrations, WhatsApp Business API (design
the `channel` enum so they can be added).

---

### Phase 6 — In-Journey stage

**Goal:** capture what actually happens during the trip — check-ins, photos, documents,
notes, feedback — securely and simply, mostly from the client's phone.

#### Data model

```prisma
model JourneyEntry {
  id, journeyId, itineraryItemId String?
  kind (CHECK_IN | COMPLETED | SKIPPED | NOTE | PHOTO | DOCUMENT | FEEDBACK | INCIDENT)
  authorType (CLIENT | STAFF | VENDOR), authorUserId String?
  text String?, rating Int?            // 1–5 for FEEDBACK
  fileKey String?, fileName String?, contentType String?, sizeBytes Int?
  visibility (CLIENT_AND_STAFF | STAFF_ONLY)
  occurredAt DateTime, createdAt DateTime
}
```
Extend `ItineraryItemStatus` with `COMPLETED | SKIPPED | RESCHEDULED` (the schema
comment already anticipates this).

#### Tasks

- **P6.1** Schema; `Journey` transitions READY → IN_PROGRESS on start date (cron) or
  manually; → COMPLETED after end date + OPS confirmation.
- **P6.2 Client portal "Today" view** (mobile-first): today's confirmed items with time,
  address/map link, preparation notes, practitioner, coordinator contact; tap to mark
  done / add note / upload photo / rate.
- **P6.3 Uploads** via P0.6 storage (Vercel Blob **private**): images and PDFs only,
  size limits, strip EXIF GPS from images server-side, signed short-lived download URLs,
  ownership re-checked server-side on every access.
- **P6.4 Vendor deliverables.** Vendor uploads a result document (e.g. diagnostic report)
  through a booking-scoped token link; visible to the client **only after OPS releases
  it** (`visibility` flip) — avoids clients receiving results with no context.
- **P6.5 OPS live board** `/admin/journeys` — journeys in progress, today's items per
  client, skipped/incident entries highlighted.
- **P6.6** Privacy & tests: client A cannot fetch client B's files (integration);
  STAFF_ONLY entries never in client projection; e2e: client marks item done, uploads a
  photo, OPS sees it.

---

### Phase 7 — Post-Journey stage

**Goal:** a meaningful record of the trip for the client, learning for the business,
and a faster, better next journey.

- **P7.1 Journey summary report.** Same pattern as What-to-Expect: deterministic skeleton
  from data (days, completed items, practitioners seen, deliverables list, photo
  highlights, client's own notes) + optional LLM prose (`JOURNEY_SUMMARY` task,
  no medical interpretation; suggests "discuss your results with your doctor" style
  follow-ups only). Admin edits and publishes; client downloads (print-styled page →
  PDF via browser print is fine for v1).
- **P7.2 Feedback loop into vendor profiles.** Aggregate item ratings and feedback per
  vendor/component into an internal quality score shown on the vendor profile and used
  as a ranking signal in Phase 3 retrieval. Client-visible only if explicitly approved.
- **P7.3 Client history.** Client page timeline of journeys; "Plan next journey" creates
  a new RequirementProfile pre-filled from the last confirmed one plus feedback
  (e.g. loved/disliked components).
- **P7.4 Business reports** `/admin/reports`: journeys per month, module mix trends,
  vendor response times and confirmation rates (from BookingEvents), AI draft acceptance
  rate (items kept vs swapped — the key metric for the curation moat).
- **P7.5** Tests at all levels; e2e: complete journey → summary published → client views
  → plan next journey pre-fills.

---

### Phase X — Cross-cutting hardening (before real clients)

- **X.1 Real email** via a provider installed through the Vercel Marketplace (e.g.
  Resend) behind the existing `EmailTransport`; store a `NotificationLog` of what was
  sent to whom and when. Replace `opsInbox()` placeholder.
- **X.2 Consent & data protection.** Clients are international (EU) and data is
  health-adjacent: record consent at intake; privacy notice in portal; retention policy
  (e.g. transcripts deleted N months after journey); client data export and erasure
  action (the app currently has no delete — design erasure that anonymises while keeping
  vendor/booking statistics). **Flag for a legal review (GDPR, India DPDP Act) — the
  agent must not claim compliance.**
- **X.3 Shared rate limiter** (Upstash Redis via Marketplace) once multiple instances
  or cron endpoints exist.
- **X.4 Observability:** structured logs already exist; add error reporting and AI cost
  dashboard from `AiRun`.
- **X.5 Pagination** on list views as volumes grow.

---

## 5. Open questions (for Vishnu / Nivedith)

Record answers in `docs/platform/PROGRESS.md → Decisions`.

1. **Vendor profiling document** — expected soon; format? (P1.8 import expects CSV/JSON.)
2. **AI provider & budget** — Vercel AI Gateway with Claude assumed. Monthly cost ceiling?
3. **Conversation source** — are discovery calls recorded and transcribed by a tool
   (the call transcript format suggests an app export)? Is audio upload + transcription
   wanted, or is pasted text enough?
4. **Who talks to the client** during finalisation — same person as curator? Affects roles.
5. **Vendor communication reality** — do Kerala vendors respond to email links, or is
   WhatsApp/phone dominant? Affects Phase 5 priority of channels.
6. **Prices to clients** — `SHOW_PRICES_TO_CLIENT` still false; payments in scope ever?
7. **Tourism/culture vs "tourism"** — call mentioned "tourism or culture"; should there
   be a separate Tourism/Leisure module (accommodation, transfers) or does Heritage &
   Culture cover it?
8. **Result documents** — should diagnostic reports flow through the platform at all
   (P6.4), given sensitivity? Needs a policy decision.
