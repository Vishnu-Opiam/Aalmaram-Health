# Platform Build — Progress Tracker

> Maintained by the implementing agent. Update this file in the same commit as the work.
> Status keys: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked (see Blockers)
> Full task descriptions and acceptance criteria: `docs/platform/PLAN.md`.

## Current focus

- Phase: 0
- Branch: —
- Last updated: 2026-09-17 (plan created)

## Phase 0 — Foundations
- [ ] P0.1 Baseline health check (typecheck / test / build / e2e results recorded below)
- [ ] P0.2 AI gateway module `src/lib/ai/` with fake provider default
- [ ] P0.3 `AiRun` model + `/admin/ai-runs`
- [ ] P0.4 Evals harness `npm run eval`
- [ ] P0.5 Roles ADMIN / CURATOR / OPS
- [ ] P0.6 File storage seam (local + Vercel Blob private)

## Phase 1 — Vendor Profile 2.0 (TOP PRIORITY)
- [ ] P1.1 Schema + migration (incl. accreditation → VendorCredential)
- [ ] P1.2 Domain: answer validation, completeness, projections
- [ ] P1.3 Starter question bank
- [ ] P1.4 Admin vendor profile editor
- [ ] P1.5 Component attributes, practitioner links, dependencies
- [ ] P1.6 AI-assisted profile drafting (suggestions only)
- [ ] P1.7 Question bank admin
- [!] P1.8 Question import CLI — build now; loading real questions blocked on Nivedith's document
- [ ] P1.9 Client-facing provider info in portal
- [ ] P1.10 Seed data
- [ ] P1.11 Vendor list filters + completeness column

## Phase 2 — Client Requirement capture
- [ ] P2.1 Schema + migration
- [ ] P2.2 Domain: weights, validation, versioning, transcript parsing
- [ ] P2.3 Admin UI: conversations + requirements tabs
- [ ] P2.4 AI extraction with verbatim evidence check
- [ ] P2.5 Privacy (redaction, PII minimisation, leak tests)
- [ ] P2.6 Evals fixtures
- [ ] P2.7 Seed

## Phase 3 — AI Curation engine
- [ ] P3.1 Schema additions
- [ ] P3.2 Slot budget + allocation
- [ ] P3.3 Candidate retrieval + scoring
- [ ] P3.4 Planner prompt + structured output
- [ ] P3.5 Fitness check
- [ ] P3.6 Recommendation service + generateDraftItinerary
- [ ] P3.7 Admin UI: generate, mix panel, swap, regenerate day
- [ ] P3.8 End-to-end evals
- [ ] P3.9 (optional) pgvector retrieval
- [ ] P3.10 Projection-leak test extension

## Phase 4 — Finalisation
- [ ] P4.1 Proposal versions + diff
- [ ] P4.2 Change-request threads
- [ ] P4.3 (optional) Client alternatives
- [ ] P4.4 Confirm & proceed to booking
- [ ] P4.5 Duplicate itinerary / templates

## Phase 5 — Booking
- [ ] P5.1 Schema + booking status machine
- [ ] P5.2 Create journey + bookings on approval
- [ ] P5.3 OPS booking board
- [ ] P5.4 Vendor action link
- [ ] P5.5 Outbound vendor messages
- [ ] P5.6 Cron reminders + escalation
- [ ] P5.7 Alternative-time handling
- [ ] P5.8 Journey READY + client schedule
- [ ] P5.9 BOOKING_AUTO_SEND flag (off)
- [ ] P5.10 Tests

## Phase 6 — In-Journey
- [ ] P6.1 Schema + journey transitions
- [ ] P6.2 Client "Today" view
- [ ] P6.3 Uploads (private, EXIF stripped)
- [ ] P6.4 Vendor deliverables with OPS release
- [ ] P6.5 OPS live board
- [ ] P6.6 Privacy tests + e2e

## Phase 7 — Post-Journey
- [ ] P7.1 Journey summary report
- [ ] P7.2 Feedback → vendor quality score
- [ ] P7.3 Client history + plan next journey
- [ ] P7.4 Business reports
- [ ] P7.5 Tests

## Phase X — Hardening (before real clients)
- [ ] X.1 Real email + NotificationLog
- [ ] X.2 Consent, retention, export/erasure (needs legal review — do not claim compliance)
- [ ] X.3 Shared rate limiter
- [ ] X.4 Observability + AI cost view
- [ ] X.5 Pagination

---

## Baseline results (P0.1)

_Not yet run._

## Eval results

| Date | Task | Model | Prompt version | Score / notes |
| --- | --- | --- | --- | --- |

## Decisions

Record every non-obvious choice: date, decision, why, alternatives rejected.

| Date | Decision | Why |
| --- | --- | --- |
| 2026-09-17 | The four platform lifecycle parts are called **Stages**, not Modules. | `Module` already means Health / Wellness / Heritage content category. |
| 2026-09-17 | Vendor profile questions are data (`ProfileQuestion`), not hard-coded fields. | Nivedith's question document is pending and will evolve. |
| 2026-09-17 | AI via Vercel AI Gateway + AI SDK, fake provider default. | App is on Vercel; tests/dev must run offline and deterministically. |

## Blockers / questions for humans

| Raised | Task | Question | Answer |
| --- | --- | --- | --- |
| 2026-09-17 | P1.8 | Nivedith's vendor profiling Q&A document — please drop it at `docs/platform/inputs/` | |
| 2026-09-17 | P0.2 | AI Gateway key / budget ceiling for evals | |
| 2026-09-17 | — | See PLAN.md §5 open questions 2–8 | |

## Session log

Append one short entry per working session: date, branch, tasks touched, test status, next step.
